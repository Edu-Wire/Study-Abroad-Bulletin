/**
 * Australia adapters - Blueprint 5.3 [R6][R7][R8][R9].
 *
 * Australia is the geography that needs all four ingestion modes at once:
 * listing, RSS, change watch and a scheduled data file.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { DataFileAdapter } from "../dataFile/DataFileAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * Study Australia News [R6].
 * Day 2 notes: editorially high-signal (visa fees, CRICOS, scholarships), so the
 * prefilter forwards everything and the AI stage does the sorting.
 */
export class AustraliaStudyAustraliaAdapter extends WebListingAdapter {}

/**
 * Department of Education Newsroom RSS [R7].
 * Day 2 notes: domestic childcare and school stories are filtered out unless
 * international education is implicated.
 */
export class AustraliaEducationNewsroomAdapter extends RssAtomAdapter {}

/**
 * Home Affairs Subclass 500 watch [R9].
 * Day 2 notes: diff requirements, fee and processing language, work rights,
 * English tests, financial evidence and application conditions.
 */
export class AustraliaSubclass500WatchAdapter extends ChangeWatchAdapter {}

/**
 * International student monthly summary and data tables [R8].
 * Day 2 notes: a data import run - persist dataset metadata, checksum and
 * normalized aggregates. Never one article per row.
 */
export class AustraliaMonthlyDataAdapter extends DataFileAdapter {}

export function createAustraliaAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "au-study-australia-news":
      return new AustraliaStudyAustraliaAdapter(config);
    case "au-education-newsroom-rss":
      return new AustraliaEducationNewsroomAdapter(config);
    case "au-homeaffairs-subclass500-watch":
      return new AustraliaSubclass500WatchAdapter(config);
    case "au-education-monthly-data":
      return new AustraliaMonthlyDataAdapter(config);
    default:
      throw new Error(`No Australia adapter for source ${config.code}`);
  }
}
