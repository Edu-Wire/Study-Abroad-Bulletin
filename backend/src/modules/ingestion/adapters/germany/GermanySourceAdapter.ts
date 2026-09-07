/**
 * SOURCE:        Germany - Federal Foreign Office / Make it in Germany / DAAD
 * APPENDIX A:    [R13] FFO RSS newsfeed
 * FAMILY:        RSS_ATOM · CHANGE_WATCH · WEB_LISTING
 * BLUEPRINT:     5.5 Germany
 *
 * The FFO feeds are authoritative but broad diplomatic content, so they run LOW
 * priority behind a strict prefilter with `aiBudgetGuard`. The student signal
 * comes from the Make it in Germany rule watch and from DAAD.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import { DiscoveryPageError } from "../base/SourceAdapter";
import {
  extractContentRegion,
  extractMeta,
  extractElement,
  looksLikeJsShell,
  decodeEntities,
} from "../base/htmlExtract";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";
import type {
  AdapterContext,
  DiscoveredItem,
  DiscoveryPage,
  SourceDetail,
} from "../base/types";

/**
 * SOURCE:        FFO current articles
 * APPENDIX A:    [R13] · FAMILY RSS_ATOM · SCHEDULE hourly · BACKFILL 12m
 * NOTE:          Strict prefilter. Do not spend AI tokens on obviously unrelated
 *                geopolitical stories (5.5).
 */
export class GermanyFfoNewsAdapter extends RssAtomAdapter {}

/**
 * SOURCE:        FFO press releases and speeches
 * APPENDIX A:    [R13] · FAMILY RSS_ATOM · SCHEDULE hourly · BACKFILL 12m
 * NOTE:          Lowest-priority German source; filter aggressively.
 */
export class GermanyFfoPressReleasesAdapter extends RssAtomAdapter {}

/**
 * SOURCE:        Make it in Germany - Visa for studying
 * APPENDIX A:    [R13] · FAMILY CHANGE_WATCH · SCHEDULE every 6h
 * FACTS:         financial proof, work limits, post-study residence (5.5)
 */
export class GermanyMakeItInGermanyWatchAdapter extends ChangeWatchAdapter {}

/**
 * SOURCE:        DAAD press, news and scholarship items
 * APPENDIX A:    named in 4.2/5.5 without a dedicated reference
 * FAMILY:        WEB_LISTING · SCHEDULE hourly · BACKFILL 2y
 * NOTE:          Classification must distinguish a scholarship opportunity from
 *                general mobility news; the badge still needs its threshold (10.4).
 *
 * daad.de's press listing page (`/en/the-daad/communication-publications/press/`)
 * is a client-rendered shell with no server-rendered article links, so the
 * inherited listing-page walk can never find anything there. Individual
 * press-release pages ARE plain server-rendered HTML, and every one of them
 * is listed in the site's sitemap.xml — so discovery reads the sitemap
 * instead of the (unusable) listing page. `fetchDetail` is overridden too,
 * only to recover a real headline (`<meta property="og:title">` or `<title>`)
 * from the fetched page: the sitemap gives URLs only, no titles, and the
 * candidate's headline is taken verbatim from `DiscoveredItem.title` further
 * down the pipeline (see `classification.service.ts`), so a placeholder here
 * would surface as the actual published headline if left unset.
 */
export class GermanyDaadAdapter extends WebListingAdapter {
  // Real press-release URLs are /en/press-releases/<slug>/ and
  // /de/pressemitteilungen/<slug>/ — a hyphenated/compound segment, not a bare
  // "press/" segment (confirmed 2026-09-05 against daad.de/sitemap.xml, which
  // has 278 matching English URLs).
  protected readonly itemUrlPattern = /daad\.de\/(en\/press-releases|de\/pressemitteilungen)\/.+/i;
  protected readonly listingSelector = "main";

  private static readonly SITEMAP_URL = "https://www.daad.de/sitemap.xml";
  /** The sitemap covers the whole site in every locale; ~12MB, well past this
   * adapter's normal per-article payload cap, so it gets its own explicit limit. */
  private static readonly SITEMAP_MAX_BYTES = 20_000_000;

  async discover(ctx: AdapterContext): Promise<DiscoveryPage> {
    const url = GermanyDaadAdapter.SITEMAP_URL;
    let response;
    try {
      response = await ctx.http.get<string>(url, {
        timeoutMs: this.config.http.timeoutMs,
        maxBytes: GermanyDaadAdapter.SITEMAP_MAX_BYTES,
        responseType: "text",
      });
    } catch (cause) {
      throw new DiscoveryPageError(this.code, { url }, cause);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new DiscoveryPageError(
        this.code,
        { url },
        new Error(`Sitemap returned HTTP ${response.status}`)
      );
    }

    const items: DiscoveredItem[] = [];
    const seen = new Set<string>();
    const locPattern = /<loc>([^<]+)<\/loc>/g;
    let match: RegExpExecArray | null;
    while ((match = locPattern.exec(response.body)) !== null) {
      const itemUrl = decodeEntities(match[1].trim());
      if (!this.itemUrlPattern.test(itemUrl) || seen.has(itemUrl)) continue;
      seen.add(itemUrl);
      items.push({
        sourceId: this.code,
        externalId: itemUrl,
        canonicalUrl: itemUrl,
        // Placeholder only: fetchDetail() below replaces this with the real
        // headline once the article page itself has been fetched.
        title: itemUrl,
      });
      if (ctx.maxItems !== undefined && items.length >= ctx.maxItems) break;
    }

    return this.buildDiscoveryPage(items);
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

    const rawTitle =
      extractMeta(response.body, "og:title") ??
      (extractElement(response.body, "title") ? decodeEntities(extractElement(response.body, "title")!) : undefined);
    if (rawTitle) {
      // DAAD suffixes every <title> with " - DAAD"; og:title usually doesn't.
      item.title = rawTitle.replace(/\s*-\s*DAAD\s*$/i, "").trim();
    }

    return {
      item,
      finalUrl: response.finalUrl,
      contentType: response.headers["content-type"] ?? "text/html",
      detailStatus: "ENRICHED",
      body: text,
      fetchedAt,
      etag: response.headers.etag,
      lastModified: response.headers["last-modified"],
    };
  }
}

export function createGermanyAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "de-ffo-news-rss":
      return new GermanyFfoNewsAdapter(config);
    case "de-ffo-press-releases-rss":
      return new GermanyFfoPressReleasesAdapter(config);
    case "de-make-it-in-germany-watch":
      return new GermanyMakeItInGermanyWatchAdapter(config);
    case "de-daad-news":
      return new GermanyDaadAdapter(config);
    default:
      throw new Error(`No Germany adapter for source ${config.code}`);
  }
}
