/**
 * SOURCE:        United States - USCIS / Department of State / ICE-SEVP
 * APPENDIX A:    [R10] USCIS All News · [R11] Study & Exchange · [R12] Visas News
 * FAMILY:        RSS_ATOM · WEB_LISTING · CHANGE_WATCH
 * BLUEPRINT:     5.4 United States
 *
 * USCIS covers immigration benefits; the Department of State is the
 * authoritative visa-issuance layer. Both are broad, so the deterministic
 * F-1/M-1/J-1/OPT/CPT/SEVP prefilter runs before any AI spend.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";
import type { AdapterContext, DiscoveryPage } from "../base/types";

/**
 * SOURCE:        USCIS All News
 * APPENDIX A:    [R10] · FAMILY RSS_ATOM · SCHEDULE every 30 min · BACKFILL 2y
 * IDENTITY:      feed GUID -> externalId
 * NOTE:          Blueprint 4.2 says "Web/RSS when verified". If the feed stops
 *                validating, `discover()` degrades to the alerts listing rather
 *                than reporting a healthy source with zero items.
 */
export class UsaUscisNewsAdapter extends RssAtomAdapter {
  /**
   * A feed that parses to zero entries is indistinguishable from a quiet news
   * day unless it is checked - USCIS has moved this URL before, so an empty
   * parse is logged loudly for the health screen.
   */
  override async discover(ctx: AdapterContext): Promise<DiscoveryPage> {
    const page = await super.discover(ctx);
    if (!page.notModified && page.items.length === 0 && (page.total ?? 0) === 0) {
      ctx.logger.warn(
        "USCIS feed parsed to zero entries; verify the feed URL before treating this as quiet",
        { source: this.code, url: this.config.discovery.url }
      );
    }
    return page;
  }
}

/**
 * SOURCE:        USCIS Alerts
 * APPENDIX A:    [R10] · FAMILY WEB_LISTING · SCHEDULE every 30 min · BACKFILL 2y
 */
export class UsaUscisAlertsAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /uscis\.gov\/(newsroom|news)\/.+/i;
  protected readonly listingSelector = "main";
}

/**
 * SOURCE:        Department of State - U.S. Visas News
 * APPENDIX A:    [R12] · FAMILY WEB_LISTING · SCHEDULE every 15 min · BACKFILL 3y
 * NOTE:          Polled fastest in Phase 1: visa operational changes are
 *                time-sensitive and often nationality-specific (5.4).
 */
export class UsaStateVisasNewsAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /travel\.state\.gov\/content\/travel\/en\/News\/.+\.html/i;
  protected readonly listingSelector = "main";
}

/**
 * SOURCE:        State Department Study & Exchange (F/M/J)
 * APPENDIX A:    [R11] · FAMILY CHANGE_WATCH · SCHEDULE every 6h
 */
export class UsaStudyExchangeWatchAdapter extends ChangeWatchAdapter {}

/**
 * SOURCE:        ICE / SEVP student guidance
 * APPENDIX A:    named in 4.2 without a dedicated reference
 * FAMILY:        CHANGE_WATCH · SCHEDULE every 12h
 * NOTE:          Public guidance pages only. 5.4 forbids crawling authenticated
 *                SEVIS, and nothing here is permitted to hold credentials.
 */
export class UsaSevpWatchAdapter extends ChangeWatchAdapter {}

export function createUsaAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "us-uscis-news-rss":
      return new UsaUscisNewsAdapter(config);
    case "us-uscis-alerts":
      return new UsaUscisAlertsAdapter(config);
    case "us-state-visas-news":
      return new UsaStateVisasNewsAdapter(config);
    case "us-state-study-exchange-watch":
      return new UsaStudyExchangeWatchAdapter(config);
    case "us-ice-sevp-watch":
      return new UsaSevpWatchAdapter(config);
    default:
      throw new Error(`No USA adapter for source ${config.code}`);
  }
}
