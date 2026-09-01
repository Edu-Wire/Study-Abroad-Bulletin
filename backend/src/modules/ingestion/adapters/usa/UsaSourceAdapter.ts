/**
 * United States adapters - Blueprint 5.4 [R10][R11][R12].
 *
 * USCIS covers immigration benefits; the Department of State is the authoritative
 * visa-issuance layer. Both are needed, and both are broad enough to require the
 * deterministic student prefilter before any AI spend.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * USCIS All News [R10].
 * Day 2 notes: F-1/M-1/J-1/OPT/CPT/SEVP filters run before the AI stage.
 */
export class UsaUscisNewsAdapter extends RssAtomAdapter {}

/** USCIS Alerts [R10] - operational immigration alerts, listing/detail. */
export class UsaUscisAlertsAdapter extends WebListingAdapter {}

/**
 * Department of State U.S. Visas News [R12].
 * Day 2 notes: polled every 15 minutes; changes here are time-sensitive and
 * often nationality-specific, which the assessment must capture.
 */
export class UsaStateVisasNewsAdapter extends WebListingAdapter {}

/**
 * State Department Study & Exchange (F/M/J) watch [R11].
 * Day 2 notes: authoritative visa-category guidance; snapshot every change.
 */
export class UsaStudyExchangeWatchAdapter extends ChangeWatchAdapter {}

/**
 * ICE / SEVP student guidance watch.
 * Day 2 notes: public guidance pages only - 5.4 forbids crawling authenticated
 * SEVIS.
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
