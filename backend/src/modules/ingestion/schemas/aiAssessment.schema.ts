/**
 * AI editorial assessment - structured output contract.
 *
 * Blueprint 10.2 defines the required AI output schema and 10.3 the routing
 * thresholds. 10.4 is the reason this file is strict: today every unclassified
 * EU Press Corner item lands in SCHOLARSHIPS, so the invariant below is enforced
 * in the schema itself rather than left to a prompt.
 *
 *   UNKNOWN / LOW CONFIDENCE  !=  SCHOLARSHIP
 *
 * The model proposes; this schema disposes. Anything that cannot be justified
 * by the scores is rewritten to UNCLASSIFIED and routed to a human.
 */

import { z } from "zod";

// ============================================================
// Taxonomy
// ============================================================

/**
 * AbroadBulletin internal editorial taxonomy. Deliberately separate from a
 * source's own topics: EU policy areas such as Energy or Competition are source
 * metadata, never our categories (10.4).
 */
export const EDITORIAL_CATEGORIES = [
  "STUDENT_VISA",
  "IMMIGRATION_POLICY",
  "POST_STUDY_WORK",
  "INTERNATIONAL_EDUCATION",
  "SCHOLARSHIP",
  "ADMISSIONS",
  "DATA_INTELLIGENCE",
  "EU_POLICY",
  "OTHER",
  /**
   * Terminal fallback. Never a silent default to a *content* category - an item
   * the model could not place stays here and waits for an editor.
   */
  "UNCLASSIFIED",
] as const;
export type EditorialCategory = (typeof EDITORIAL_CATEGORIES)[number];

/** Categories a low-confidence assessment may never be assigned. */
export const CONFIDENCE_GATED_CATEGORIES = [
  "SCHOLARSHIP",
  "STUDENT_VISA",
  "POST_STUDY_WORK",
] as const;

/**
 * Minimum scholarshipRelevance before the SCHOLARSHIP category or badge may be
 * applied at all (10.4: "Require scholarshipRelevance >= a defined threshold
 * before applying the scholarship badge").
 */
export const SCHOLARSHIP_CATEGORY_MIN_RELEVANCE = 60;

/** Below this confidence nothing may claim a gated category (10.4). */
export const MIN_CONFIDENCE_FOR_GATED_CATEGORY = 70;

export const RECOMMENDED_ACTIONS = ["IGNORE", "REVIEW", "CREATE_DRAFT"] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

/**
 * Editorial routing lane derived from the 10.3 threshold table. `recommendedAction`
 * is what the model asks for; the lane is what the pipeline actually does.
 */
export const EDITORIAL_ROUTES = [
  "IGNORE",
  "HOLD",
  "REVIEW",
  "AUTO_DRAFT",
  "CRITICAL_DRAFT_ALERT",
] as const;
export type EditorialRoute = (typeof EDITORIAL_ROUTES)[number];

/**
 * Machine-readable justifications. Free-text reasoning is kept in
 * `reasoningSummary`; these codes are what dashboards and audits group by.
 */
export const REASON_CODES = [
  "STUDENT_VISA_RULE_CHANGE",
  "FEE_CHANGE",
  "ELIGIBILITY_CHANGE",
  "WORK_RIGHTS_CHANGE",
  "PROCESSING_TIME_CHANGE",
  "SCHOLARSHIP_OPPORTUNITY",
  "ADMISSIONS_CYCLE",
  "DATA_RELEASE",
  "POLICY_ANNOUNCEMENT",
  "AFFECTS_SPECIFIC_NATIONALITIES",
  "EFFECTIVE_DATE_PRESENT",
  "NO_STUDENT_IMPACT",
  "GENERAL_DIPLOMATIC_CONTENT",
  "INSUFFICIENT_CONTENT",
  "LOW_CONFIDENCE",
  "OFF_TOPIC_FOR_SOURCE",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

// ============================================================
// Sub-schemas
// ============================================================

const score = z.number().int().min(0).max(100);

/** The five relevance axes from 10.2, all on the same 0-100 scale. */
export const relevanceBreakdownSchema = z.object({
  studyAbroadRelevance: score,
  visaRelevance: score,
  internationalStudentRelevance: score,
  scholarshipRelevance: score,
  postStudyWorkRelevance: score,
});
export type RelevanceBreakdown = z.infer<typeof relevanceBreakdownSchema>;

/**
 * An effective date the document states. `raw` is preserved verbatim so an
 * editor can check the model's parse against the source wording.
 */
export const effectiveDateSchema = z.object({
  raw: z.string().min(1),
  /** ISO date when the model could resolve one; absent when it could not. */
  date: z.string().optional(),
  kind: z
    .enum(["EFFECTIVE_FROM", "APPLICATION_DEADLINE", "ANNOUNCED_ON", "TRANSITION_END", "UNKNOWN"])
    .default("UNKNOWN"),
  description: z.string().optional(),
});
export type EffectiveDate = z.infer<typeof effectiveDateSchema>;

/** Provenance of the assessment itself, so a misclassification is reproducible. */
export const assessmentProvenanceSchema = z.object({
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  assessedAt: z.iso.datetime(),
  /** Present when the assessment came from a re-run after a source change. */
  supersedesAssessmentId: z.string().optional(),
});
export type AssessmentProvenance = z.infer<typeof assessmentProvenanceSchema>;

// ============================================================
// Raw model output (10.2)
// ============================================================

/**
 * Exactly what the model is asked to return. Nothing here is trusted yet -
 * `aiAssessmentSchema` applies the invariants.
 */
export const aiAssessmentOutputSchema = z
  .object({
    ...relevanceBreakdownSchema.shape,
    policyImpact: score,
    urgency: score,
    primaryCategory: z.enum(EDITORIAL_CATEGORIES),
    secondaryCategories: z.array(z.enum(EDITORIAL_CATEGORIES)).max(4).default([]),
    /** Destination countries affected, ISO-3166 alpha-2 or the EU region code. */
    affectedDestinations: z.array(z.string().length(2)).default([]),
    /** Nationalities affected; empty means "not nationality-specific". */
    affectedNationalities: z.array(z.string().min(2)).default([]),
    effectiveDates: z.array(effectiveDateSchema).default([]),
    shortSummary: z.string().min(1).max(600),
    recommendedAction: z.enum(RECOMMENDED_ACTIONS),
    confidence: score,
    reasonCodes: z.array(z.enum(REASON_CODES)).default([]),
    /** One paragraph of plain-language justification for the editor card (13.2). */
    reasoningSummary: z.string().max(2000).optional(),
  })
  .strict();
export type AiAssessmentOutput = z.infer<typeof aiAssessmentOutputSchema>;

// ============================================================
// Invariants (10.4)
// ============================================================

/**
 * The single guard that fixes the "everything is SCHOLARSHIPS" bug. Applied to
 * raw model output before anything is persisted or shown.
 *
 * Rules, in order:
 *  1. SCHOLARSHIP requires scholarshipRelevance >= the defined threshold.
 *  2. Any confidence-gated category requires confidence >= the gate.
 *  3. A category that fails either rule becomes UNCLASSIFIED - never a
 *     different content category, and never a silent scholarship default.
 *  4. Secondary categories are filtered by the same rules.
 */
export function enforceCategoryInvariants(
  output: AiAssessmentOutput
): AiAssessmentOutput {
  const reasonCodes = new Set<ReasonCode>(output.reasonCodes);

  const isCategoryAllowed = (category: EditorialCategory): boolean => {
    if (
      category === "SCHOLARSHIP" &&
      output.scholarshipRelevance < SCHOLARSHIP_CATEGORY_MIN_RELEVANCE
    ) {
      return false;
    }
    const gated = (CONFIDENCE_GATED_CATEGORIES as readonly string[]).includes(category);
    return !gated || output.confidence >= MIN_CONFIDENCE_FOR_GATED_CATEGORY;
  };

  let primaryCategory = output.primaryCategory;
  if (!isCategoryAllowed(primaryCategory)) {
    primaryCategory = "UNCLASSIFIED";
    reasonCodes.add("LOW_CONFIDENCE");
  }

  const secondaryCategories = output.secondaryCategories.filter(
    (category) => category !== primaryCategory && isCategoryAllowed(category)
  );

  return {
    ...output,
    primaryCategory,
    secondaryCategories,
    // An unclassified item is never auto-drafted; a human decides.
    recommendedAction:
      primaryCategory === "UNCLASSIFIED" && output.recommendedAction === "CREATE_DRAFT"
        ? "REVIEW"
        : output.recommendedAction,
    reasonCodes: [...reasonCodes],
  };
}

/**
 * Whether the scholarship badge may be shown for an assessment. UI and draft
 * generation both call this instead of testing the category by hand.
 */
export function isScholarshipEligible(assessment: AiAssessmentOutput): boolean {
  return (
    assessment.scholarshipRelevance >= SCHOLARSHIP_CATEGORY_MIN_RELEVANCE &&
    assessment.confidence >= MIN_CONFIDENCE_FOR_GATED_CATEGORY
  );
}

/**
 * Validated assessment: the 10.2 shape with the 10.4 invariants already applied,
 * plus the provenance needed to reproduce a misclassification.
 */
export const aiAssessmentSchema = aiAssessmentOutputSchema
  .extend({ provenance: assessmentProvenanceSchema })
  .transform((assessment) => ({
    ...enforceCategoryInvariants(assessment),
    provenance: assessment.provenance,
  }))
  .refine(
    (assessment) =>
      assessment.primaryCategory !== "SCHOLARSHIP" ||
      assessment.scholarshipRelevance >= SCHOLARSHIP_CATEGORY_MIN_RELEVANCE,
    {
      message:
        "SCHOLARSHIP requires scholarshipRelevance >= SCHOLARSHIP_CATEGORY_MIN_RELEVANCE",
      path: ["primaryCategory"],
    }
  );
export type AiAssessment = z.infer<typeof aiAssessmentSchema>;

// ============================================================
// Routing (10.3)
// ============================================================

/**
 * Headline relevance for routing. The study-abroad axis leads; visa and
 * post-study-work matter almost as much for our desk, so the strongest of the
 * three decides rather than an average that dilutes a single sharp signal.
 */
export function headlineRelevance(scores: RelevanceBreakdown): number {
  return Math.max(
    scores.studyAbroadRelevance,
    scores.visaRelevance,
    scores.postStudyWorkRelevance
  );
}

export interface RouteThresholds {
  autoDraftMinRelevance: number;
  autoDraftMinConfidence: number;
}

/**
 * Blueprint 10.3 threshold table. Per-source overrides come from the registry's
 * `editorial` block; the criticals stay global.
 *
 *   0-29  IGNORE | 30-54 HOLD | 55-74 REVIEW
 *   75-89 + confidence >= 85  AUTO_DRAFT
 *   90+   + confidence >= 90  CRITICAL_DRAFT_ALERT
 */
export function routeAssessment(
  assessment: AiAssessmentOutput,
  thresholds: RouteThresholds = { autoDraftMinRelevance: 75, autoDraftMinConfidence: 85 }
): EditorialRoute {
  const relevance = headlineRelevance(assessment);

  // An item we could not classify never auto-drafts, however high it scored.
  if (assessment.primaryCategory === "UNCLASSIFIED") {
    return relevance >= 55 ? "REVIEW" : "HOLD";
  }

  if (relevance >= 90 && assessment.confidence >= 90) return "CRITICAL_DRAFT_ALERT";
  if (
    relevance >= thresholds.autoDraftMinRelevance &&
    assessment.confidence >= thresholds.autoDraftMinConfidence
  ) {
    return "AUTO_DRAFT";
  }
  if (relevance >= 55) return "REVIEW";
  if (relevance >= 30) return "HOLD";
  return "IGNORE";
}

/** 10.3 launch safety: Phase 1 creates drafts, humans publish. Always. */
export const PHASE1_AUTO_PUBLISH_ENABLED = false as const;
