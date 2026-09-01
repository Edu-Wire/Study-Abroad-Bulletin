/**
 * CHANGE_WATCH generic adapter (Blueprint 6.1, algorithm in 11.2).
 *
 * Discovery: a fixed list of watched URLs from `config.watchTargets`.
 * Detail: a snapshot of the same page, diffed against the stored version.
 * Serves: IRCC study permit, UK student/graduate guidance, AU Subclass 500,
 * US F/M/J and SEVP, Make it in Germany, NZ pathway/post-study, Ireland Stamp 2.
 *
 * These sources publish rule changes that never get a news item, which is why
 * they are configured CRITICAL even though they emit few documents.
 */

import { BaseSourceAdapter } from "../base/SourceAdapter";
import type {
  DiscoverContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  SourceDetail,
  WatchSnapshot,
  WatchTargetRef,
} from "../base/types";

export abstract class ChangeWatchAdapter extends BaseSourceAdapter {
  /**
   * Day 2: a watch does not discover new URLs - it emits one item per configured
   * watch target whose content hash moved. Unchanged targets record
   * `last_checked_at` and produce nothing (11.2 steps 1-4).
   */
  async discover(ctx: DiscoverContext): Promise<DiscoveryPage> {
    ctx.logger.debug("Change-watch discovery not implemented", { sourceId: this.sourceId });
    return this.notImplemented("discover");
  }

  /**
   * Day 2: fetch the watched page with conditional headers and keep the raw
   * response as the immutable version body.
   */
  async fetchDetail(item: DiscoveredItem, ctx: DiscoverContext): Promise<SourceDetail> {
    ctx.logger.debug("Change-watch detail fetch not implemented", { externalId: item.externalId });
    return this.notImplemented("fetchDetail");
  }

  /**
   * Day 2: normalize the changed version into a document whose `fullText` is the
   * new content region, carrying the diff as change evidence.
   */
  async normalize(detail: SourceDetail): Promise<NormalizedSourceDocument> {
    void detail;
    return this.notImplemented("normalize");
  }

  /**
   * Day 2 (11.2): extract the meaningful content region - dropping navigation,
   * cookie banners and non-content timestamps - hash it, compare with
   * `target.previousHash`, and on a change store an immutable version plus a
   * field/text diff classified against the target's `materialFacts` (11.3).
   */
  async snapshot(target: WatchTargetRef, ctx: DiscoverContext): Promise<WatchSnapshot> {
    ctx.logger.debug("Change-watch snapshot not implemented", { target: target.key });
    return this.notImplemented("snapshot");
  }
}
