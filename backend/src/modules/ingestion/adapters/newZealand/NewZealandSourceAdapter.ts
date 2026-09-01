/**
 * New Zealand adapters - Blueprint 5.6 [R14].
 *
 * Immigration New Zealand is one of the highest-signal web sources in Phase 1,
 * which is why the listing is backfilled three years deep.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * INZ News Centre [R14].
 * Day 2 notes: poll filtered by Study / Study to work / Immigration rules topics
 * where the listing supports it, and keep INZ's native topic labels separate
 * from AbroadBulletin editorial categories.
 */
export class NewZealandImmigrationNewsAdapter extends WebListingAdapter {}

/**
 * Pathway Student Visa and Post Study Work watch [R14].
 * Day 2 notes: catches operational changes that never get a news item.
 */
export class NewZealandPathwayStudentWatchAdapter extends ChangeWatchAdapter {}

export function createNewZealandAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "nz-immigration-news":
      return new NewZealandImmigrationNewsAdapter(config);
    case "nz-pathway-student-watch":
      return new NewZealandPathwayStudentWatchAdapter(config);
    default:
      throw new Error(`No New Zealand adapter for source ${config.code}`);
  }
}
