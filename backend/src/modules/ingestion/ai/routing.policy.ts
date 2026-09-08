/**
 * Editorial routing policy - Blueprint 10.3, verbatim.
 *
 * | Score  | Confidence | Route                                          |
 * | 0-29   | any        | IGNORE   evidence retained, no candidate       |
 * | 30-54  | any        | LOW      low-priority filter only               |
 * | 55-74  | any        | REVIEW   candidate created, editor decides      |
 * | 75-89  | >= 85      | CREATE_DRAFT   auto-draft, human publishes      |
 * | 90-100 | >= 90      | CRITICAL_DRAFT auto-draft, pin, alert           |
 *
 * Two additional gates that the table alone does not express:
 *   - a draft requires `detailStatus === "ENRICHED"` (10.4: classify the full
 *     source, not a feed snippet), otherwise it degrades to REVIEW;
 *   - an UNCLASSIFIED item never drafts, whatever it scored.
 */

import {
  headlineRelevance,
  type AiAssessmentOutput,
  type EditorialRoute,
} from "../schemas/aiAssessment.schema";
import type { DetailStatus } from "../adapters/base/types";

export interface RoutingThresholds {
  autoDraftMinRelevance: number;
  autoDraftMinConfidence: number;
}

export const DEFAULT_THRESHOLDS: RoutingThresholds = {
  autoDraftMinRelevance: 75,
  autoDraftMinConfidence: 85,
};

export interface RoutingInput {
  assessment: AiAssessmentOutput;
  /** From the adapter. Anything but ENRICHED caps the route at REVIEW. */
  detailStatus: DetailStatus;
  /** Per-source overrides from the registry's `editorial` block. */
  thresholds?: RoutingThresholds;
}

export interface RoutingDecision {
  route: EditorialRoute;
  relevance: number;
  /** Why this lane, in one line, for the audit trail and the editor card. */
  explanation: string;
  /** True for CRITICAL_DRAFT_ALERT: pin high priority and notify editorial. */
  alert: boolean;
}

export function decideRoute(input: RoutingInput): RoutingDecision {
  const { assessment, detailStatus } = input;
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const relevance = headlineRelevance(assessment);

  const base = { relevance, alert: false };

  // An item we could not classify never drafts, however high it scored - this
  // is the guard that keeps unclassified policy text out of the CMS.
  if (assessment.primaryCategory === "UNCLASSIFIED") {
    return relevance >= 55
      ? { ...base, route: "REVIEW", explanation: "Unclassified: an editor must categorise it" }
      : { ...base, route: "HOLD", explanation: "Unclassified and low relevance" };
  }

  if (relevance < 30) {
    return { ...base, route: "IGNORE", explanation: `Relevance ${relevance} below the 30 floor` };
  }

  if (relevance < 55) {
    return { ...base, route: "HOLD", explanation: `Relevance ${relevance}: low-priority filter only` };
  }

  const draftEligible = relevance >= thresholds.autoDraftMinRelevance;

  // 10.4: a draft written from a feed summary is the defect this whole
  // programme exists to fix. No full source, no draft.
  if (draftEligible && detailStatus !== "ENRICHED") {
    return {
      ...base,
      route: "REVIEW",
      explanation: `Would auto-draft at ${relevance}, but detail is ${detailStatus} - full source required`,
    };
  }

  if (relevance >= 90 && assessment.confidence >= 90) {
    return {
      ...base,
      alert: true,
      route: "CRITICAL_DRAFT_ALERT",
      explanation: `Critical: relevance ${relevance}, confidence ${assessment.confidence}`,
    };
  }

  if (draftEligible && assessment.confidence >= thresholds.autoDraftMinConfidence) {
    return {
      ...base,
      route: "AUTO_DRAFT",
      explanation: `Auto-draft: relevance ${relevance}, confidence ${assessment.confidence}`,
    };
  }

  return {
    ...base,
    route: "REVIEW",
    explanation:
      relevance >= thresholds.autoDraftMinRelevance
        ? `Relevant but confidence ${assessment.confidence} is below ${thresholds.autoDraftMinConfidence}`
        : `Relevance ${relevance}: editor decides`,
  };
}

/** Phase 1 launch safety (10.3). Nothing in this codebase may set PUBLISHED. */
export const PHASE1_AUTO_PUBLISH_ENABLED = false as const;
