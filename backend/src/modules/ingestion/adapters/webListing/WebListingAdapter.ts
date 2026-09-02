/**
 * WEB_LISTING family (Blueprint 6.1).
 *
 * Discovery is an HTML listing with pagination; detail is the article page.
 * Detail extraction follows the 9.2 fallback order via `extractContentRegion`:
 * JSON-LD -> semantic elements -> configured selector -> readable text.
 *
 * A JS-shell page returns `detailStatus: FAILED, reason: JS_ONLY` rather than an
 * empty body. Blueprint 6.2 wants the underlying JSON endpoint found first; no
 * headless browser is introduced in Phase 1.
 */

import { BaseSourceAdapter, DiscoveryPageError } from "../base/SourceAdapter";
import {
  extractCanonicalLink,
  extractContentRegion,
  extractDate,
  extractLinks,
  htmlToText,
  looksLikeJsShell,
  matchSimpleSelector,
} from "../base/htmlExtract";
import type {
  AdapterContext,
  BackfillWindow,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
  SourceHealth,
} from "../base/types";

export abstract class WebListingAdapter extends BaseSourceAdapter {
  /** Container holding the listing rows; narrows link extraction. */
  protected readonly listingSelector: string | null = null;
  /** Anchors whose href matches are treated as article links. */
  protected abstract readonly itemUrlPattern: RegExp;
  protected readonly maxPagesPerRun: number = 5;
  /** Shortest anchor text that can plausibly be a headline. */
  protected readonly minTitleLength: number = 12;

  async discover(ctx: AdapterContext): Promise<DiscoveryPage> {
    return this.walkListing(ctx, undefined);
  }

  /**
   * Listings rarely expose date filters, so the window is applied to parsed item
   * dates and paging simply goes deeper.
   */
  async backfill(window: BackfillWindow, ctx: AdapterContext): Promise<DiscoveryPage> {
    return this.walkListing(ctx, window);
  }

  private async walkListing(
    ctx: AdapterContext,
    window: BackfillWindow | undefined
  ): Promise<DiscoveryPage> {
    const collected: DiscoveredItem[] = [];
    const seen = new Set<string>();
    const maxPages = Math.min(
      this.config.discovery.pagination.maxPages ?? this.maxPagesPerRun,
      window ? 40 : this.maxPagesPerRun
    );

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const url = this.buildListingUrl(pageNumber);

      let response;
      try {
        response = await ctx.http.get<string>(url, {
          timeoutMs: this.config.http.timeoutMs,
          maxBytes: this.config.http.maxPayloadBytes,
          responseType: "text",
          conditional:
            pageNumber === 1 && this.config.http.conditionalRequests
              ? { etag: ctx.syncState?.etag, lastModified: ctx.syncState?.lastModified }
              : undefined,
        });
      } catch (cause) {
        throw new DiscoveryPageError(this.code, { pageNumber, url }, cause);
      }

      if (response.notModified) {
        return this.buildDiscoveryPage([], {
          notModified: true,
          sourceWatermark: ctx.syncState?.watermarkAt,
        });
      }

      const items = this.parseListing(response.body, response.finalUrl);
      if (items.length === 0) {
        // An empty first page on a listing that normally has rows means the
        // selectors broke; deeper pages legitimately run out.
        if (pageNumber === 1) {
          ctx.logger.warn("Listing produced no items; extraction may have drifted", {
            source: this.code,
            url,
          });
        }
        break;
      }

      let exhaustedWindow = false;
      for (const item of items) {
        if (seen.has(item.externalId)) continue;
        seen.add(item.externalId);

        if (window && item.publishedAt) {
          if (item.publishedAt < window.start.toISOString()) {
            exhaustedWindow = true;
            continue;
          }
          if (item.publishedAt > window.end.toISOString()) continue;
        }
        if (!window && this.isBeforeWatermark(item, ctx)) continue;
        collected.push(item);
      }

      const reachedCap = ctx.maxItems !== undefined && collected.length >= ctx.maxItems;
      if (exhaustedWindow || reachedCap) break;
    }

    return this.buildDiscoveryPage(
      ctx.maxItems ? collected.slice(0, ctx.maxItems) : collected
    );
  }

  async fetchDetail(item: DiscoveredItem, ctx: AdapterContext): Promise<SourceDetail> {
    const fetchedAt = ctx.now().toISOString();

    let response;
    try {
      response = await ctx.http.get<string>(item.canonicalUrl, {
        timeoutMs: this.config.http.timeoutMs,
        maxBytes: this.config.http.maxPayloadBytes,
        responseType: "text",
      });
    } catch (cause) {
      ctx.logger.warn("Detail fetch failed", { source: this.code, url: item.canonicalUrl, cause });
      return {
        item,
        finalUrl: item.canonicalUrl,
        contentType: "text/html",
        detailStatus: "FAILED",
        reason: "HTTP_ERROR",
        fetchedAt,
      };
    }

    const region = extractContentRegion(response.body, this.config.detail.contentSelectors);
    const text = region?.text ?? "";

    if (!text || text.length < 120) {
      const reason = looksLikeJsShell(response.body, text.length) ? "JS_ONLY" : "EMPTY_CONTENT";
      ctx.logger.warn("Detail extraction produced no usable body", {
        source: this.code,
        url: item.canonicalUrl,
        reason,
      });
      return {
        item,
        finalUrl: response.finalUrl,
        contentType: response.headers["content-type"] ?? "text/html",
        detailStatus: "FAILED",
        reason,
        fetchedAt,
      };
    }

    return {
      item,
      finalUrl:
        this.resolveUrl(extractCanonicalLink(response.body), response.finalUrl) ??
        response.finalUrl,
      contentType: response.headers["content-type"] ?? "text/html",
      detailStatus: "ENRICHED",
      body: text,
      fetchedAt,
      etag: response.headers.etag,
      lastModified: response.headers["last-modified"],
    };
  }

  async normalize(
    detail: SourceDetail,
    item: DiscoveredItem,
    _ctx: AdapterContext
  ): Promise<NormalizedSourceDocument> {
    return this.buildDocument(item, detail, detail.body ?? "", {
      rawMetadata: { transport: "WEB_LISTING" },
    });
  }

  async healthcheck(ctx: AdapterContext): Promise<SourceHealth> {
    const startedAt = Date.now();
    try {
      const response = await ctx.http.get<string>(this.buildListingUrl(1), {
        timeoutMs: this.config.http.timeoutMs,
        responseType: "text",
      });
      const items = this.parseListing(response.body, response.finalUrl);
      return {
        state: items.length > 0 ? "HEALTHY" : "BROKEN",
        checkedAt: ctx.now().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: items.length > 0 ? undefined : "Listing extraction returned no rows",
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
  // Overridable hooks
  // ----------------------------------------------------------

  protected buildListingUrl(pageNumber: number): string {
    const url = new URL(this.config.discovery.url);
    for (const [key, value] of Object.entries(this.config.discovery.params ?? {})) {
      url.searchParams.set(key, value);
    }
    const { mode, pageParam } = this.config.discovery.pagination;
    if (pageNumber > 1 && mode === "PAGE_NUMBER" && pageParam) {
      url.searchParams.set(pageParam, String(pageNumber));
    }
    return url.toString();
  }

  /**
   * Listing HTML -> discovery items. Anchors are matched against
   * `itemUrlPattern`, then deduped by resolved URL; the surrounding markup
   * supplies the date when the anchor itself does not.
   */
  protected parseListing(html: string, baseUrl: string): DiscoveredItem[] {
    const region = this.listingSelector
      ? matchSimpleSelector(html, this.listingSelector) ?? html
      : html;

    const items: DiscoveredItem[] = [];
    const seenUrls = new Set<string>();

    for (const link of extractLinks(region)) {
      const absolute = this.resolveUrl(link.href, baseUrl);
      if (!absolute || !this.itemUrlPattern.test(absolute)) continue;

      const canonical = this.canonicalize(absolute);
      if (seenUrls.has(canonical)) continue;

      const title = link.text.trim();
      if (title.length < this.minTitleLength) continue;
      seenUrls.add(canonical);

      items.push({
        sourceId: this.code,
        externalId: canonical,
        canonicalUrl: canonical,
        title,
        publishedAt: this.parseDate(extractDate(this.rowContextFor(region, link.html))),
        sourceTopics: [],
        discoveryRaw: { listingUrl: baseUrl },
      });
    }
    return items;
  }

  /**
   * Markup around a listing anchor - where the date and topic label usually
   * live. A fixed window rather than tree walking, since there is no DOM here.
   */
  protected rowContextFor(regionHtml: string, anchorHtml: string): string {
    const index = regionHtml.indexOf(anchorHtml);
    if (index === -1) return anchorHtml;
    return regionHtml.slice(Math.max(0, index - 600), index + anchorHtml.length + 600);
  }

  /** Available to subclasses that need plain text out of a listing row. */
  protected rowText(html: string): string {
    return htmlToText(html);
  }
}
