/**
 * RSS_ATOM generic adapter (Blueprint 6.1).
 *
 * Discovery: XML feed. Detail: web detail page, or the feed's full-content field
 * only when it is genuinely complete (7.1).
 * Serves: IRCC Atom, USCIS news, German FFO, AU Education Newsroom, EC dept news.
 */

import { BaseSourceAdapter } from "../base/SourceAdapter";
import type {
  DiscoverContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
} from "../base/types";

export abstract class RssAtomAdapter extends BaseSourceAdapter {
  /**
   * Day 2: fetch `config.discovery.url` with conditional headers, parse the feed
   * with entity expansion and external DTD loading disabled (9.1 / OWASP XXE
   * [R26]), and map entries to DiscoveredItem using the feed GUID/id as
   * `externalId`. A 304 yields an empty page with the previous watermark.
   */
  async discover(ctx: DiscoverContext): Promise<DiscoveryPage> {
    ctx.logger.debug("RSS/Atom discovery not implemented", { sourceId: this.sourceId });
    return this.notImplemented("discover");
  }

  /**
   * Day 2: honour `config.detail.strategy`. FEED_FULL_CONTENT uses the entry
   * body; SERVER_RENDERED_HTML fetches the article URL and extracts the content
   * region from `config.detail.contentSelectors`.
   */
  async fetchDetail(item: DiscoveredItem, ctx: DiscoverContext): Promise<SourceDetail> {
    ctx.logger.debug("RSS/Atom detail fetch not implemented", { externalId: item.externalId });
    return this.notImplemented("fetchDetail");
  }

  /**
   * Day 2: emit the 7.2 normalized document. `sourceSummary` keeps the feed
   * description; `fullText` must come from the detail body, never the summary.
   */
  async normalize(detail: SourceDetail): Promise<NormalizedSourceDocument> {
    void detail;
    return this.notImplemented("normalize");
  }
}
