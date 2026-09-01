/**
 * WEB_LISTING generic adapter (Blueprint 6.1).
 *
 * Discovery: HTML listing with pagination. Detail: HTML article page.
 * Serves: Study Australia, Immigration NZ, ISD Ireland, DG HOME, Education Area,
 * Erasmus+, DAAD, IRCC notices, USCIS alerts, State Department visa news.
 */

import { BaseSourceAdapter } from "../base/SourceAdapter";
import type {
  BackfillWindow,
  DiscoverContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
} from "../base/types";

export abstract class WebListingAdapter extends BaseSourceAdapter {
  /**
   * Day 2: page the listing per `config.discovery.pagination`, extracting link,
   * title, date and any native topic label. Stop at `maxPages`, at an already
   * seen `externalId`, or once items predate `sinceWatermark`.
   *
   * 6.2: if plain HTTP returns only a JS shell, find the underlying JSON
   * endpoint before reaching for a headless browser.
   */
  async discover(ctx: DiscoverContext): Promise<DiscoveryPage> {
    ctx.logger.debug("Web listing discovery not implemented", { sourceId: this.sourceId });
    return this.notImplemented("discover");
  }

  /**
   * Day 2: fetch the article URL and extract the content region using
   * `config.detail.contentSelectors`, falling back through the 9.2 order
   * (semantic HTML, then JSON-LD, then a discovered JSON endpoint).
   */
  async fetchDetail(item: DiscoveredItem, ctx: DiscoverContext): Promise<SourceDetail> {
    ctx.logger.debug("Web listing detail fetch not implemented", { externalId: item.externalId });
    return this.notImplemented("fetchDetail");
  }

  /**
   * Day 2: sanitize the extracted HTML, resolve the canonical URL and hash the
   * normalized text. Native listing topics stay in `sourceTopics` (10.4).
   */
  async normalize(detail: SourceDetail): Promise<NormalizedSourceDocument> {
    void detail;
    return this.notImplemented("normalize");
  }

  /**
   * Day 2: walk the listing's deeper pages until `window.from`. Listings rarely
   * expose date filters, so the window is applied to parsed item dates.
   */
  async backfill(window: BackfillWindow, ctx: DiscoverContext): Promise<DiscoveryPage> {
    ctx.logger.debug("Web listing backfill not implemented", { window });
    return this.notImplemented("backfill");
  }
}
