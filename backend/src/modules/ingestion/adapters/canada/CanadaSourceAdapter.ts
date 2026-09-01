/**
 * Canada adapters - Blueprint 5.1 [R4][R5].
 *
 * Three sources: the IRCC Newsroom Atom API, the IRCC notices listing, and a
 * 6-hour change watch over the study-permit pages.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * IRCC Newsroom Atom API [R4].
 * Day 2 notes: `externalId` is the Atom id/GUID; the canonical URL is the
 * Canada.ca article link. The feed carries a summary only, so detail is always
 * fetched before classification (5.1).
 */
export class CanadaIrccAtomAdapter extends RssAtomAdapter {}

/**
 * IRCC Notices listing [R4].
 * Day 2 notes: operational notices frequently carry student changes before any
 * press release, so this listing is paged deeper than the feed.
 */
export class CanadaIrccNoticesAdapter extends WebListingAdapter {}

/**
 * Study permit change watch [R5].
 * Day 2 notes: diff fees, PAL/TAL requirements, eligibility and work conditions
 * across the hub and its selected subpages; store content hash plus version.
 */
export class CanadaStudyPermitWatchAdapter extends ChangeWatchAdapter {}

export function createCanadaAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "ca-ircc-atom":
      return new CanadaIrccAtomAdapter(config);
    case "ca-ircc-notices":
      return new CanadaIrccNoticesAdapter(config);
    case "ca-study-permit-watch":
      return new CanadaStudyPermitWatchAdapter(config);
    default:
      throw new Error(`No Canada adapter for source ${config.code}`);
  }
}
