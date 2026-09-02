/**
 * CHANGE_WATCH family (Blueprint 6.1; algorithm 11.2).
 *
 * These sources publish rule changes that never get a news item, which is why
 * they run CRITICAL despite emitting almost nothing.
 *
 * Boundary: this adapter extracts the *content region* and the *material facts*
 * (11.3). Developer A hashes the region, stores `SourceDocumentVersion` and
 * computes `SourceDiff`. Nothing here hashes, versions or diffs.
 */

import { BaseSourceAdapter, DiscoveryPageError } from "../base/SourceAdapter";
import { extractContentRegion, htmlToText, looksLikeJsShell } from "../base/htmlExtract";
import { extractMaterialFacts } from "./materialFacts";
import type {
  AdapterContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
  SourceHealth,
  WatchSnapshot,
} from "../base/types";

export abstract class ChangeWatchAdapter extends BaseSourceAdapter {
  /**
   * A watch discovers nothing new - it emits one item per configured target.
   * Whether a target actually changed is A's comparison, so every target is
   * returned and the pipeline decides.
   */
  async discover(ctx: AdapterContext): Promise<DiscoveryPage> {
    const items: DiscoveredItem[] = this.config.watchTargets.map((target) => ({
      sourceId: this.code,
      externalId: this.canonicalize(target.url),
      canonicalUrl: this.canonicalize(target.url),
      title: target.label,
      documentType: "RULE_PAGE",
      discoveryRaw: {
        watchTargetKey: target.key,
        materialFacts: target.materialFacts,
      },
    }));

    ctx.logger.debug("Watch targets enumerated", { source: this.code, count: items.length });
    return this.buildDiscoveryPage(items, { total: items.length });
  }

  async fetchDetail(item: DiscoveredItem, ctx: AdapterContext): Promise<SourceDetail> {
    const fetchedAt = ctx.now().toISOString();

    let response;
    try {
      response = await ctx.http.get<string>(item.canonicalUrl, {
        timeoutMs: this.config.http.timeoutMs,
        maxBytes: this.config.http.maxPayloadBytes,
        responseType: "text",
        conditional: this.config.http.conditionalRequests
          ? { etag: ctx.syncState?.etag, lastModified: ctx.syncState?.lastModified }
          : undefined,
      });
    } catch (cause) {
      throw new DiscoveryPageError(this.code, { url: item.canonicalUrl }, cause);
    }

    if (response.notModified) {
      // 11.2 step 4: unchanged, record last_checked_at and stop.
      return {
        item,
        finalUrl: item.canonicalUrl,
        contentType: "text/html",
        detailStatus: "PARTIAL",
        fetchedAt,
        etag: ctx.syncState?.etag,
        lastModified: ctx.syncState?.lastModified,
      };
    }

    const region = extractContentRegion(response.body, this.config.detail.contentSelectors);
    if (!region || region.text.length < 120) {
      return {
        item,
        finalUrl: response.finalUrl,
        contentType: "text/html",
        detailStatus: "FAILED",
        reason: looksLikeJsShell(response.body, region?.text.length ?? 0)
          ? "JS_ONLY"
          : "EMPTY_CONTENT",
        fetchedAt,
      };
    }

    return {
      item,
      finalUrl: response.finalUrl,
      contentType: response.headers["content-type"] ?? "text/html",
      detailStatus: "ENRICHED",
      body: region.text,
      fetchedAt,
      etag: response.headers.etag,
      lastModified: response.headers["last-modified"],
    };
  }

  async normalize(
    detail: SourceDetail,
    item: DiscoveredItem,
    ctx: AdapterContext
  ): Promise<NormalizedSourceDocument> {
    const facts = extractMaterialFacts(detail.body ?? "");
    return this.buildDocument(item, detail, detail.body ?? "", {
      documentType: "RULE_PAGE",
      // A rule page has no publication date of its own; the capture time is the
      // only honest timestamp.
      publishedAt: detail.fetchedAt,
      rawMetadata: {
        transport: "CHANGE_WATCH",
        watchTargetKey: item.discoveryRaw?.watchTargetKey,
        extractedFacts: facts,
        watchedAt: ctx.now().toISOString(),
      },
    });
  }

  /**
   * One snapshot per configured target (11.2 steps 1-2): fetch conditionally,
   * extract the meaningful region, pull the material facts. The caller hashes
   * and diffs.
   */
  async snapshot(ctx: AdapterContext): Promise<WatchSnapshot[]> {
    const snapshots: WatchSnapshot[] = [];

    for (const target of this.config.watchTargets) {
      const capturedAt = ctx.now().toISOString();

      let response;
      try {
        response = await ctx.http.get<string>(target.url, {
          timeoutMs: this.config.http.timeoutMs,
          maxBytes: this.config.http.maxPayloadBytes,
          responseType: "text",
          conditional: this.config.http.conditionalRequests
            ? { etag: ctx.syncState?.etag, lastModified: ctx.syncState?.lastModified }
            : undefined,
        });
      } catch (cause) {
        // One broken target must not abort the others.
        ctx.logger.error("Watch target fetch failed", { source: this.code, target: target.key, cause });
        continue;
      }

      if (response.notModified) {
        snapshots.push({
          targetKey: target.key,
          url: target.url,
          finalUrl: target.url,
          contentRegionText: "",
          contentRegionHtml: "",
          extractedFacts: this.emptyFacts(),
          capturedAt,
          notModified: true,
          etag: ctx.syncState?.etag,
          lastModified: ctx.syncState?.lastModified,
        });
        continue;
      }

      const region = extractContentRegion(response.body, this.config.detail.contentSelectors);
      if (!region) {
        ctx.logger.warn("Watch target produced no content region", {
          source: this.code,
          target: target.key,
        });
        continue;
      }

      snapshots.push({
        targetKey: target.key,
        url: target.url,
        finalUrl: response.finalUrl,
        contentRegionText: region.text,
        contentRegionHtml: region.html,
        extractedFacts: extractMaterialFacts(region.text, target.materialFacts),
        capturedAt,
        notModified: false,
        etag: response.headers.etag,
        lastModified: response.headers["last-modified"],
      });
    }

    return snapshots;
  }

  async healthcheck(ctx: AdapterContext): Promise<SourceHealth> {
    const startedAt = Date.now();
    const target = this.config.watchTargets[0];
    try {
      const response = await ctx.http.get<string>(target.url, {
        timeoutMs: this.config.http.timeoutMs,
        responseType: "text",
      });
      const usable = htmlToText(response.body).length > 200;
      return {
        state: usable ? "HEALTHY" : "BROKEN",
        checkedAt: ctx.now().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: usable ? undefined : "Watched page returned no extractable content",
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
}
