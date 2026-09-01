/**
 * Ireland adapters - Blueprint 5.7 [R15][R16].
 *
 * Immigration Service Delivery is the core Ireland source. Student notices share
 * a collection with citizenship and protection updates, so the prefilter carries
 * the burden of keeping the desk on topic.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * ISD News and Updates [R15].
 * Day 2 notes: citizenship and temporary-protection updates are not study-abroad
 * content unless a student rule is explicitly affected.
 */
export class IrelandIsdNewsAdapter extends WebListingAdapter {}

/**
 * Student Permission / Coming to Study watch [R16].
 * Day 2 notes: version and diff student finance, eligible programme, permission
 * and work-condition changes.
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
