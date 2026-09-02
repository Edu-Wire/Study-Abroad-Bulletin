/**
 * RSS_ATOM family (Blueprint 6.1).
 *
 * Handles Atom 1.0 and RSS 2.0 through one parse via `ctx.xml.parse` (A's
 * XXE-safe parser, [R26]). Discovery is the feed; detail is the linked page
 * unless the feed genuinely carries the full body.
 *
 * Blueprint 7.1 is the rule this family exists to respect: an RSS `description`
 * is a synopsis, not the article. `feedProvidesFullContent` defaults to false
 * and a snippet never becomes `fullText`.
 */

import { BaseSourceAdapter, DiscoveryPageError } from "../base/SourceAdapter";
import { parseFeedEntries, type FeedEntry } from "./feedParse";
import {
  extractCanonicalLink,
  extractContentRegion,
  htmlToText,
  looksLikeJsShell,
} from "../base/htmlExtract";
import type {
  AdapterContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
  SourceHealth,
} from "../base/types";

export abstract class RssAtomAdapter extends BaseSourceAdapter {
  /**
   * Whether the feed's content field is the complete document. Default false:
   * assuming otherwise is what produces summary-only articles.
   */
  protected readonly feedProvidesFullContent: boolean = false;

  /**
   * Base for resolving relative entry links. Feeds served from an API host
   * (the Government of Canada news API, for one) carry links relative to the
   * *publishing* site, so resolving against the feed URL would produce
   * api.io.canada.ca/... instead of canada.ca/... A source whose feed and
   * articles share an origin can leave this unset.
   */
  protected readonly linkBaseUrl: string | null = null;

  async discover(ctx: AdapterContext): Promise<DiscoveryPage> {
    const url = this.buildFeedUrl(ctx);

    let response;
    try {
      response = await ctx.http.get<string>(url, {
        timeoutMs: this.config.http.timeoutMs,
        maxBytes: this.config.http.maxPayloadBytes,
        responseType: "text",
        conditional: this.config.http.conditionalRequests
          ? { etag: ctx.syncState?.etag, lastModified: ctx.syncState?.lastModified }
          : undefined,
      });
    } catch (cause) {
      throw new DiscoveryPageError(this.code, { url }, cause);
    }

    // 304 is "nothing new", not an error and not zero items.
    if (response.notModified) {
      ctx.logger.debug("Feed unchanged since last run", { source: this.code });
      return this.buildDiscoveryPage([], {
        notModified: true,
        sourceWatermark: ctx.syncState?.watermarkAt,
      });
    }

    const entries = this.parseFeed(response.body, ctx, url);
    const items = entries
      .map((entry) => this.toDiscoveredItem(entry, response.finalUrl))
      .filter((item): item is DiscoveredItem => item !== null)
      .filter((item) => !this.isBeforeWatermark(item, ctx));

    const capped = ctx.maxItems ? items.slice(0, ctx.maxItems) : items;
    ctx.logger.info("Feed discovery complete", {
      source: this.code,
      parsed: entries.length,
      newItems: capped.length,
    });
    return this.buildDiscoveryPage(capped, { total: entries.length });
  }

  async fetchDetail(item: DiscoveredItem, ctx: AdapterContext): Promise<SourceDetail> {
    const fetchedAt = ctx.now().toISOString();

    // Only trust feed content when the source is explicitly configured for it.
    const feedBody = item.discoveryRaw?.feedContent;
    if (this.feedProvidesFullContent && typeof feedBody === "string" && feedBody.trim()) {
      const text = htmlToText(feedBody);
      return {
        item,
        finalUrl: item.canonicalUrl,
        contentType: "text/html",
        detailStatus: "ENRICHED",
        body: text,
        fetchedAt,
      };
    }

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

    if (!text) {
      const reason = looksLikeJsShell(response.body, 0) ? "JS_ONLY" : "EMPTY_CONTENT";
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
      finalUrl: this.resolveUrl(extractCanonicalLink(response.body), response.finalUrl) ?? response.finalUrl,
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
      rawMetadata: { transport: "RSS_ATOM" },
    });
  }

  async healthcheck(ctx: AdapterContext): Promise<SourceHealth> {
    const startedAt = Date.now();
    try {
      const response = await ctx.http.get<string>(this.buildFeedUrl(ctx), {
        timeoutMs: this.config.http.timeoutMs,
        responseType: "text",
      });
      const entries = this.parseFeed(response.body, ctx, this.config.discovery.url);
      return {
        state: entries.length > 0 ? "HEALTHY" : "DEGRADED",
        checkedAt: ctx.now().toISOString(),
        latencyMs: Date.now() - startedAt,
        message: entries.length > 0 ? undefined : "Feed parsed but contained no entries",
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

  protected buildFeedUrl(_ctx: AdapterContext): string {
    const params = this.config.discovery.params;
    if (!params) return this.config.discovery.url;
    const url = new URL(this.config.discovery.url);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  protected parseFeed(xml: string, ctx: AdapterContext, url: string): FeedEntry[] {
    try {
      // Local import keeps the parse contract in one file while the entry
      // mapping stays overridable per source.
      return parseFeedEntries(ctx.xml.parse(xml));
    } catch (cause) {
      throw new DiscoveryPageError(this.code, { url }, cause);
    }
  }

  /** Atom `id` / RSS `guid` is the identity; the resolved link is the fallback. */
  protected toDiscoveredItem(entry: FeedEntry, baseUrl: string): DiscoveredItem | null {
    const link = this.resolveUrl(entry.link, this.linkBaseUrl ?? baseUrl);
    if (!link) return null;

    return {
      sourceId: this.code,
      externalId: this.pickExternalId([entry.id, entry.guid, this.canonicalize(link)]),
      canonicalUrl: this.canonicalize(link),
      title: entry.title ?? "(untitled)",
      publishedAt: this.parseDate(entry.published),
      updatedAtSource: this.parseDate(entry.updated),
      sourceSummary: entry.summary,
      sourceTopics: entry.categories,
      discoveryRaw: { feedContent: entry.content, feedId: entry.id ?? entry.guid },
    };
  }
}

export { parseFeedEntries };
export type { FeedEntry };
