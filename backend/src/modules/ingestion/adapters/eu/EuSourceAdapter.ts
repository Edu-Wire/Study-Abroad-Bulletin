/**
 * European Union adapters - Blueprint 5.8 [R17][R18][R19][R20][R21].
 *
 * Five distinct sources. Press Corner is API-first and is where the current
 * production defect lives: the RSS card carries a summary while the API carries
 * the full document. RSS is a live signal here, never the authoritative corpus.
 */

import { JsonApiAdapter } from "../jsonApi/JsonApiAdapter";
import { RssAtomAdapter } from "../rssAtom/RssAtomAdapter";
import { WebListingAdapter } from "../webListing/WebListingAdapter";
import type { SourceAdapter } from "../base/SourceAdapter";
import type { SourceConfig } from "../../config/sourceConfig.schema";

/**
 * Commission Press Corner Search + Document API [R17][R18].
 * Day 2 notes: `externalId` is the refCode (e.g. SPEECH/26/1765); the body is
 * `htmlContent` from /api/documents. Preserve native document type, policy areas,
 * commissioner/place and eventDate/publishDate as source metadata - they are not
 * editorial categories (10.4). A failed page is never end-of-results.
 */
export class EuPressCornerAdapter extends JsonApiAdapter {}

/**
 * Commission Department News [R17].
 * Day 2 notes: a separate source from Press Corner because it covers Commission
 * services outside the Spokesperson stream.
 */
export class EuCommissionDeptNewsAdapter extends RssAtomAdapter {}

/** DG Migration and Home Affairs [R19] - migration, legal mobility, visa policy. */
export class EuDgHomeNewsAdapter extends WebListingAdapter {}

/** European Education Area [R20] - higher education and learning mobility. */
export class EuEducationAreaNewsAdapter extends WebListingAdapter {}

/**
 * Erasmus+ / Erasmus Mundus [R21].
 * Day 2 notes: calls and funding items are mobility news until scholarship
 * relevance clears its threshold - the badge is earned, not assumed.
 */
export class EuErasmusPlusNewsAdapter extends WebListingAdapter {}

export function createEuAdapter(config: SourceConfig): SourceAdapter {
  switch (config.code) {
    case "eu-press-corner-api":
      return new EuPressCornerAdapter(config);
    case "eu-commission-dept-news":
      return new EuCommissionDeptNewsAdapter(config);
    case "eu-dg-home-news":
      return new EuDgHomeNewsAdapter(config);
    case "eu-education-area-news":
      return new EuEducationAreaNewsAdapter(config);
    case "eu-erasmus-plus-news":
      return new EuErasmusPlusNewsAdapter(config);
    default:
      throw new Error(`No EU adapter for source ${config.code}`);
  }
}
