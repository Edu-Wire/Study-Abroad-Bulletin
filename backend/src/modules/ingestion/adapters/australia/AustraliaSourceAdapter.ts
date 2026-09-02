/**
 * SOURCE:        Australia - Austrade / Dept of Education / Home Affairs
 * APPENDIX A:    [R6] Study Australia · [R7] Education Newsroom
 *                [R8] monthly student data · [R9] Subclass 500
 * FAMILY:        WEB_LISTING · RSS_ATOM · CHANGE_WATCH · DATA_FILE
 * BLUEPRINT:     5.3 Australia - the only geography needing all four modes.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { DataFileAdapter } from "../dataFile/DataFileAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * SOURCE:        Study Australia News
 * APPENDIX A:    [R6] · FAMILY WEB_LISTING · SCHEDULE every 30 min · BACKFILL 2y
 * IDENTITY:      canonical URL
 * NOTE:          Editorially high-signal (visa fees, CRICOS, scholarships), so
 *                the prefilter forwards everything and the AI stage sorts it.
 */
export class AustraliaStudyAustraliaAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /studyaustralia\.gov\.au\/.+\/news\/.+/i;
  protected readonly listingSelector = "main";
}

/**
 * SOURCE:        Department of Education Newsroom
 * APPENDIX A:    [R7] · FAMILY RSS_ATOM + HTML detail · SCHEDULE every 30 min
 * NOTE:          Domestic childcare/school stories are negative-filtered unless
 *                international education is implicated (5.3).
 */
export class AustraliaEducationNewsroomAdapter extends RssAtomAdapter {}

/**
 * SOURCE:        Home Affairs Subclass 500 Student visa
 * APPENDIX A:    [R9] · FAMILY CHANGE_WATCH · SCHEDULE every 6h
 * FACTS:         requirements, fee, processing time, work rights, English test,
 *                financial evidence, application conditions (5.3)
 */
export class AustraliaSubclass500WatchAdapter extends ChangeWatchAdapter {}

/**
 * SOURCE:        International student monthly summary and data tables
 * APPENDIX A:    [R8] · FAMILY DATA_FILE · SCHEDULE monthly · BACKFILL 5y
 * IDENTITY:      dataset release key (YYYY-MM)
 * NOTE:          Data import only - dataset metadata, checksum and aggregates.
 *                Never one source item per spreadsheet row (5.3).
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
