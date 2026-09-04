/**
 * Internal AI taxonomy -> existing CMS `ArticleCategory`.
 *
 * Alignment Plan 10: the rich internal taxonomy is NOT migrated into the CMS
 * enum. The CMS keeps the categories editors already use; ingestion keeps the
 * detail it needs for routing and audit. This file is the only place the two
 * meet.
 *
 * The mapping is deliberately partial. A category with no honest CMS equivalent
 * returns `null`, which means "no automatic draft - an editor chooses". That is
 * the correct outcome far more often than a forced guess.
 */

import {
  isScholarshipEligible,
  type AiAssessmentOutput,
  type EditorialCategory,
} from "../schemas/aiAssessment.schema";

/**
 * CMS categories this pipeline is allowed to write.
 *
 * These are exactly the members of the Prisma `ArticleCategory` enum that
 * ingestion may set. Naming a category the CMS does not have would fail at the
 * database rather than at the mapping, which is the wrong place to find out.
 */
export type CmsCategory = "VISA" | "SCHOLARSHIPS" | "ADMISSIONS";

const DIRECT_MAPPING: Partial<Record<EditorialCategory, CmsCategory>> = {
  STUDENT_VISA: "VISA",
  IMMIGRATION_POLICY: "VISA",
  POST_STUDY_WORK: "VISA",
  SCHOLARSHIP: "SCHOLARSHIPS",
  ADMISSIONS: "ADMISSIONS",
  // Deliberately absent, all mapping to null:
  //   INTERNATIONAL_EDUCATION - sector news with no CMS bucket that fits; the
  //                             CMS UNIVERSITIES category is about institutions,
  //                             not about mobility policy, so an editor files it
  //   DATA_INTELLIGENCE       - a dataset release is not an article
  //   EU_POLICY               - institutional policy an editor must frame
  //   OTHER                   - by definition unplaceable
  //   UNCLASSIFIED            - the whole point is that a human decides
};

export interface CategoryDecision {
  category: CmsCategory | null;
  /** False means: create the candidate, but never auto-draft it. */
  autoDraftable: boolean;
  reason: string;
}

/**
 * Resolve the CMS category for an assessment.
 *
 * The scholarship gate is applied here as well as in the schema. Duplication is
 * intentional: this is the last point before a category reaches the public CMS,
 * and Blueprint 10.4 exists because that label was previously applied by
 * default. Defence in depth on exactly one label is worth the repetition.
 */
export function mapToCmsCategory(assessment: AiAssessmentOutput): CategoryDecision {
  const internal = assessment.primaryCategory;

  if (internal === "SCHOLARSHIP" && !isScholarshipEligible(assessment)) {
    return {
      category: null,
      autoDraftable: false,
      reason: `Scholarship label refused: relevance ${assessment.scholarshipRelevance}, confidence ${assessment.confidence}`,
    };
  }

  const mapped = DIRECT_MAPPING[internal];
  if (!mapped) {
    return {
      category: null,
      autoDraftable: false,
      reason: `${internal} has no automatic CMS category; editor selects one`,
    };
  }

  return {
    category: mapped,
    autoDraftable: true,
    reason: `${internal} -> ${mapped}`,
  };
}

/** Categories that never produce a draft on their own, for the Admin UI. */
export const MANUAL_ONLY_CATEGORIES: EditorialCategory[] = [
  "DATA_INTELLIGENCE",
  "EU_POLICY",
  "OTHER",
  "UNCLASSIFIED",
];
