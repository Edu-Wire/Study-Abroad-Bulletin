/**
 * JSON_API generic adapter (Blueprint 6.1).
 *
 * Discovery: paged/filterable JSON API. Detail: JSON detail endpoint.
 * Serves: EU Press Corner (/api/search + /api/documents) and GOV.UK
 * (/api/search.json + /api/content/<path>).
 *
 * This is the highest-fidelity adapter type and the direct fix for the current
 * EU Press Corner defect: the API returns the full document, so the pipeline
 * never has to settle for an RSS summary (1, 7.1).
 */

import { BaseSourceAdapter } from "../base/SourceAdapter";
import type {
  BackfillWindow,
  DiscoverContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  ReconcileRange,
  ReconcileResult,
  SourceDetail,
} from "../base/types";

export abstract class JsonApiAdapter extends BaseSourceAdapter {
  /**
   * Day 2: walk `config.discovery.pagination` until a page returns fewer items
   * than the page size. A failed page is an error to retry - never end-of-results
   * (5.8). Returns the page cursor and the new watermark.
   */
  async discover(ctx: DiscoverContext): Promise<DiscoveryPage> {
    ctx.logger.debug("JSON API discovery not implemented", { sourceId: this.sourceId });
    return this.notImplemented("discover");
  }

  /**
   * Day 2: expand `config.detail.urlTemplate` with the item's native key
   * (EU refCode, GOV.UK base_path) and request the documented detail endpoint.
   */
  async fetchDetail(item: DiscoveredItem, ctx: DiscoverContext): Promise<SourceDetail> {
    ctx.logger.debug("JSON API detail fetch not implemented", { externalId: item.externalId });
    return this.notImplemented("fetchDetail");
  }

  /**
   * Day 2: take the body from the API's own content field and preserve native
   * metadata (document type, policy areas, dates) in `sourceTopics`/`rawMetadata`.
   * Native topics never become editorial categories (10.4).
   */
  async normalize(detail: SourceDetail): Promise<NormalizedSourceDocument> {
    void detail;
    return this.notImplemented("normalize");
  }

  /**
   * Day 2: date-windowed historical sweep with `config.backfill.overlapHours`
   * of overlap so no document falls between two windows (3.2 / 5.8).
   */
  async backfill(window: BackfillWindow, ctx: DiscoverContext): Promise<DiscoveryPage> {
    ctx.logger.debug("JSON API backfill not implemented", { window });
    return this.notImplemented("backfill");
  }

  /**
   * Day 2: re-query a closed date range and compare counts against what was
   * stored, so a silently dropped page is caught rather than assumed absent.
   */
  async reconcile(range: ReconcileRange, ctx: DiscoverContext): Promise<ReconcileResult> {
    ctx.logger.debug("JSON API reconcile not implemented", { range });
    return this.notImplemented("reconcile");
  }
}
