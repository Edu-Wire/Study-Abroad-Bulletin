/**
 * United Kingdom adapters - Blueprint 5.2 [R1][R2][R3].
 *
 * The UK is the most API-first geography in Phase 1: GOV.UK Search API for
 * discovery, Content API for detail. Rendered HTML is never scraped.
 */

import { ChangeWatchAdapter } from "../changeWatch/ChangeWatchAdapter";
import { JsonApiAdapter } from "../jsonApi/JsonApiAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * GOV.UK Search API discovery [R1] with Content API detail [R2].
 * Day 2 notes: identity is `content_id` plus `base_path`, so a slug change never
 * creates a false duplicate. Anything touching Appendix Student, Child Student,
 * Graduate or student sponsor rules is tagged high-priority for AI review.
 */
export class UkGovUkSearchAdapter extends JsonApiAdapter {}

/**
 * Immigration Rules: Statements of Changes collection [R2][R3].
 * Day 2 notes: parse accessible HTML when the statement has it and retain the
 * PDF URL as evidence rather than as the body.
 */
export class UkStatementsOfChangesAdapter extends JsonApiAdapter {}

/**
 * Student / Graduate / sponsor guidance watch [R3].
 * Day 2 notes: diff the Content API JSON rather than rendered HTML - rules pages
 * change without a press release, and the JSON gives a stable field structure.
 */
export class UkImmigrationRulesWatchAdapter extends ChangeWatchAdapter {}

export function createUkAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "uk-govuk-search-api":
      return new UkGovUkSearchAdapter(config);
    case "uk-govuk-content-api":
      return new UkStatementsOfChangesAdapter(config);
    case "uk-immigration-rules-watch":
      return new UkImmigrationRulesWatchAdapter(config);
    default:
      throw new Error(`No UK adapter for source ${config.code}`);
  }
}
