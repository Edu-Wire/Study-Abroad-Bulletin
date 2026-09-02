/**
 * SOURCE:        Ireland - Immigration Service Delivery (Dept of Justice)
 * APPENDIX A:    [R15] News & Updates · [R16] Student Permission
 * FAMILY:        WEB_LISTING · CHANGE_WATCH
 * BLUEPRINT:     5.7 Ireland
 *
 * Student notices share one collection with citizenship and protection updates,
 * so the deterministic prefilter carries the burden of keeping the desk on topic.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * SOURCE:        ISD News and Updates
 * APPENDIX A:    [R15] · FAMILY WEB_LISTING · SCHEDULE every 30 min · BACKFILL 3y
 * IDENTITY:      canonical URL
 * NOTE:          Citizenship and temporary-protection updates are not
 *                study-abroad content unless a student rule is affected (5.7).
 */
export class IrelandIsdNewsAdapter extends WebListingAdapter {
  protected readonly itemUrlPattern = /irishimmigration\.ie\/(news-and-updates|.+-notice)\/.+/i;
  protected readonly listingSelector = "main";
}

/**
 * SOURCE:        Student Permission / Coming to Study
 * APPENDIX A:    [R16] · FAMILY CHANGE_WATCH · SCHEDULE every 6h
 * FACTS:         student finance, eligible programme, permission conditions,
 *                work conditions (5.7)
 */
export class IrelandStudentPermissionWatchAdapter extends ChangeWatchAdapter {}

export function createIrelandAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "ie-isd-news-updates":
      return new IrelandIsdNewsAdapter(config);
    case "ie-student-permission-watch":
      return new IrelandStudentPermissionWatchAdapter(config);
    default:
      throw new Error(`No Ireland adapter for source ${config.code}`);
  }
}
