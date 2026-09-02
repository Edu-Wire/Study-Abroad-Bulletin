/**
 * JSON_API family (Blueprint 6.1).
 *
 * Discovery is a paged, filterable JSON API; detail is a documented JSON
 * endpoint. This is the highest-fidelity family and the direct fix for the EU
 * Press Corner defect: the API returns the whole document, so the pipeline never
 * settles for an RSS summary.
 *
 * Failure semantics (Blueprint 15.1) are the load-bearing part: a page that
 * fails throws `DiscoveryPageError` carrying the page/cursor. It is never
 * converted into "end of results", which would silently truncate a backfill.
 */

import { BaseSourceAdapter, DiscoveryPageError } from "../base/SourceAdapter";
import type {
  AdapterContext,
  BackfillWindow,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  ReconcileRange,
  ReconcileResult,
  SourceDetail,
  SourceHealth,
} from "../base/types";

export interface JsonRequest {
  url: string;
  headers?: Record<string, string>;
}

export abstract class JsonApiAdapter extends BaseSourceAdapter {
  /** Safety rail so one run cannot walk an entire archive. */
  protected readonly maxPagesPerRun: number = 10;

  // ----------------------------------------------------------
  // Hooks a concrete source overrides
  // ----------------------------------------------------------

  /** Build the request for one discovery page. */
  protected abstract buildDiscoveryRequest(
    ctx: AdapterContext,
    page: { pageNumber: number; cursor?: string; window?: BackfillWindow }
  ): JsonRequest;

  /** Map one API response to items plus the next cursor. */
  protected abstract mapDiscoveryResponse(
    json: unknown,
    ctx: AdapterContext
  ): { items: DiscoveredItem[]; total?: number; nextCursor?: string };

  protected abstract buildDetailRequest(item: DiscoveredItem): JsonRequest;

  /** Pull the authoritative body and native metadata out of the detail payload. */
  protected abstract mapDetailResponse(
    json: unknown,
    item: DiscoveredItem
  ): {
    body: string;
    documentType?: string;
    sourceTopics?: string[];
    publishedAt?: string;
    rawMetadata?: Record<string, unknown>;
  } | null;

  // ----------------------------------------------------------
  // Contract
  // ----------------------------------------------------------

  async discover(ctx: AdapterContext): Promise<DiscoveryPage> {
    return this.walkPages(ctx, undefined);
  }

  /**
   * Backfill reuses the same request builder with the window injected, so live
   * and historical runs cannot drift apart in their filtering.
   */
  async backfill(window: BackfillWindow, ctx: AdapterContext): Promise<DiscoveryPage> {
    return this.walkPages(ctx, window);
  }

  private async walkPages(
    ctx: AdapterContext,
    window: BackfillWindow | undefined
  ): Promise<DiscoveryPage> {
    const collected: DiscoveredItem[] = [];
    const seen = new Set<string>();
    const pageSize = this.config.discovery.pagination.pageSize ?? 100;
    const maxPages = Math.min(
      this.config.discovery.pagination.maxPages ?? this.maxPagesPerRun,
      this.maxPagesPerRun
    );

    let cursor = window?.cursor ?? ctx.syncState?.cursor;
    let total: number | undefined;

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const request = this.buildDiscoveryRequest(ctx, { pageNumber, cursor, window });

      let response;
      try {
        response = await ctx.http.get<unknown>(request.url, {
          headers: request.headers,
          timeoutMs: this.config.http.timeoutMs,
          maxBytes: this.config.http.maxPayloadBytes,
          responseType: "json",
        });
      } catch (cause) {
        // Never swallowed into end-of-results (15.1).
        throw new DiscoveryPageError(this.code, { pageNumber, cursor, url: request.url }, cause);
      }

      if (response.status >= 400) {
        throw new DiscoveryPageError(this.code, { pageNumber, cursor, url: request.url });
      }

      let mapped;
      try {
        mapped = this.mapDiscoveryResponse(response.body, ctx);
      } catch (cause) {
        throw new DiscoveryPageError(this.code, { pageNumber, cursor, url: request.url }, cause);
      }

      total = mapped.total ?? total;

      for (const item of mapped.items) {
        if (seen.has(item.externalId)) continue;
        seen.add(item.externalId);
        // On a live run, stop collecting anything already ingested. Backfill
        // ignores the watermark - it is walking a closed historical window.
        if (!window && this.isBeforeWatermark(item, ctx)) continue;
        collected.push(item);
      }

      const reachedCap = ctx.maxItems !== undefined && collected.length >= ctx.maxItems;
      const lastPage = mapped.items.length < pageSize && !mapped.nextCursor;
      cursor = mapped.nextCursor;

      if (lastPage || reachedCap) {
        return this.buildDiscoveryPage(
          ctx.maxItems ? collected.slice(0, ctx.maxItems) : collected,
          { total, nextCursor: reachedCap ? cursor : undefined }
        );
      }
    }

    ctx.logger.info("Page cap reached; run will resume from cursor", {
      source: this.code,
      maxPages,
      cursor,
    });
    return this.buildDiscoveryPage(collected, { total, nextCursor: cursor });
  }

  async fetchDetail(item: DiscoveredItem, ctx: AdapterContext): Promise<SourceDetail> {
    const fetchedAt = ctx.now().toISOString();
    const request = this.buildDetailRequest(item);

    let response;
    try {
      response = await ctx.http.get<unknown>(request.url, {
        headers: request.headers,
        timeoutMs: this.config.http.timeoutMs,
        maxBytes: this.config.http.maxPayloadBytes,
        responseType: "json",
      });
    } catch (cause) {
      ctx.logger.warn("Detail request failed", { source: this.code, url: request.url, cause });
      return {
        item,
        finalUrl: request.url,
        contentType: "application/json",
        detailStatus: "FAILED",
        reason: "HTTP_ERROR",
        fetchedAt,
      };
    }

    const mapped = this.mapDetailResponse(response.body, item);
    if (!mapped || !mapped.body.trim()) {
      return {
        item,
        finalUrl: response.finalUrl,
        contentType: "application/json",
        detailStatus: "FAILED",
        reason: "EMPTY_CONTENT",
        fetchedAt,
      };
    }

    return {
      item,
      finalUrl: response.finalUrl,
      contentType: "application/json",
      detailStatus: "ENRICHED",
      body: mapped.body,
      json: response.body,
      fetchedAt,
    };
  }

  async normalize(
    detail: SourceDetail,
    item: DiscoveredItem,
    _ctx: AdapterContext
  ): Promise<NormalizedSourceDocument> {
    const mapped = detail.json ? this.mapDetailResponse(detail.json, item) : null;

    return this.buildDocument(item, detail, mapped?.body ?? detail.body ?? "", {
      documentType: mapped?.documentType,
      sourceTopics: mapped?.sourceTopics,
      publishedAt: mapped?.publishedAt,
      rawMetadata: { transport: "JSON_API", ...(mapped?.rawMetadata ?? {}) },
    });
  }

  /**
   * Re-query a closed range and report what is missing locally. Catches a page
   * that failed silently upstream - the failure mode 15.1 is written against.
   */
  async reconcile(range: ReconcileRange, ctx: AdapterContext): Promise<ReconcileResult> {
    const window: BackfillWindow = {
      start: new Date(range.from),
      end: new Date(range.to),
    };
    const page = await this.walkPages(ctx, window);

    return {
      expected: page.total ?? page.items.length,
      found: page.items.length,
      // The worker owns local state, so it diffs these ids against storage.
      missingExternalIds: page.items.map((item) => item.externalId),
      repaired: 0,
    };
  }

  async healthcheck(ctx: AdapterContext): Promise<SourceHealth> {
    const startedAt = Date.now();
    const request = this.buildDiscoveryRequest(ctx, { pageNumber: 1 });
    try {
      const response = await ctx.http.get<unknown>(request.url, {
        timeoutMs: this.config.http.timeoutMs,
        responseType: "json",
      });
      const mapped = this.mapDiscoveryResponse(response.body, ctx);
      return {
        state: mapped.items.length > 0 ? "HEALTHY" : "DEGRADED",
        checkedAt: ctx.now().toISOString(),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        state: "BROKEN",
        checkedAt: ctx.now().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ----------------------------------------------------------
  // Shared helpers
  // ----------------------------------------------------------

  /** Registry params + per-page overrides, applied to the discovery URL. */
  protected buildUrl(overrides: Record<string, string | undefined> = {}): string {
    const url = new URL(this.config.discovery.url);
    for (const [key, value] of Object.entries(this.config.discovery.params ?? {})) {
      url.searchParams.set(key, value);
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /** `YYYY-MM-DD`, the form every Phase 1 API uses for date filters. */
  protected toApiDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
