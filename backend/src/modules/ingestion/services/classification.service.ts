/**
 * Classification service - the single entrypoint the worker's `source.classify`
 * job calls.
 *
 *   normalized document
 *     -> deterministic prefilter (10.1)
 *     -> AI provider (mock | anthropic)
 *     -> Zod validation + category invariants (10.2 / 10.4)
 *     -> routing policy (10.3)
 *
 * Persistence goes through `repos.aiAssessment`. This file never imports Prisma.
 */

import { runPrefilter, type PrefilterResult } from "../ai/prefilter.rules";
import { getProvider, type ProviderKey } from "../ai/provider/index";
import { ClassificationError } from "../ai/provider/types";
import { decideRoute, type RoutingDecision } from "../ai/routing.policy";
import {
  aiAssessmentOutputSchema,
  enforceCategoryInvariants,
  type AiAssessmentOutput,
} from "../schemas/aiAssessment.schema";
import { mapToCmsCategory } from "../config/categoryMapping";
import type { SourceConfig } from "../config/sourceConfig.schema";
import type { NormalizedSourceDocument } from "../schemas/candidate.schema";
import type { AdapterLogger, DetailStatus, IngestionRepos } from "../adapters/base/types";

export interface AssessInput {
  source: SourceConfig;
  sourceItem: { id: string; externalId: string; canonicalUrl: string };
  document: NormalizedSourceDocument;
  detailStatus: DetailStatus;
  repos: IngestionRepos;
  logger: AdapterLogger;
  providerOverride?: ProviderKey;
}

export interface AssessResult {
  prefilter: PrefilterResult;
  assessment: AiAssessmentOutput | null;
  routing: RoutingDecision;
  assessmentId: string | null;
}

/**
 * Assess one enriched source document.
 *
 * A hard-excluded item still returns a result: the source evidence is kept and
 * auditable (10.3 "keep source item for audit"), it simply never reaches the
 * model and produces no candidate.
 */
export async function assess(input: AssessInput): Promise<AssessResult> {
  const { source, document, logger } = input;

  const prefilter = runPrefilter(source, document);

  if (prefilter.verdict === "HARD_EXCLUDE") {
    logger.debug("Prefilter excluded item before AI spend", {
      source: source.code,
      externalId: document.externalId,
      reason: prefilter.reason,
    });
    return {
      prefilter,
      assessment: null,
      assessmentId: null,
      routing: {
        route: "IGNORE",
        relevance: prefilter.score,
        explanation: `Deterministic prefilter: ${prefilter.reason}`,
        alert: false,
      },
    };
  }

  const provider = getProvider(input.providerOverride);
  const providerResult = await provider.assess({
    sourceCode: source.code,
    sourceName: source.name,
    sourceAuthority: source.authorityType,
    countryCodes: source.countryCodes,
    title: document.title,
    documentType: document.documentType,
    publishedAt: document.publishedAt,
    sourceTopics: document.sourceTopics,
    fullText: document.fullText,
    prefilterMatches: prefilter.matchedBoost,
  });

  // The schema is the gate. An invalid payload is a retryable failure, never a
  // partially-valid assessment and never a candidate.
  const parsed = aiAssessmentOutputSchema.safeParse(providerResult.raw);
  if (!parsed.success) {
    throw new ClassificationError(
      source.code,
      "Model output failed the required assessment schema",
      parsed.error.issues
    );
  }

  // 10.4 invariants applied before anything is persisted or displayed.
  const assessment = enforceCategoryInvariants(parsed.data);

  if (assessment.primaryCategory !== parsed.data.primaryCategory) {
    logger.warn("Category rewritten by invariant guard", {
      source: source.code,
      externalId: document.externalId,
      proposed: parsed.data.primaryCategory,
      applied: assessment.primaryCategory,
      confidence: assessment.confidence,
      scholarshipRelevance: assessment.scholarshipRelevance,
    });
  }

  const routing = decideRoute({
    assessment,
    detailStatus: input.detailStatus,
    thresholds: {
      autoDraftMinRelevance: source.editorial.autoDraftMinRelevance,
      autoDraftMinConfidence: source.editorial.autoDraftMinConfidence,
    },
  });

  // Resolved here rather than at persistence time so the stored assessment
  // carries the CMS category decision — including the null that means "no
  // honest equivalent, an editor chooses" — alongside the scores that produced it.
  const categoryDecision = mapToCmsCategory(assessment);

  const stored = await input.repos.aiAssessment.create({
    sourceItemId: input.sourceItem.id,
    sourceCode: source.code,
    ...assessment,
    cmsCategory: categoryDecision.category,
    cmsCategoryReason: categoryDecision.reason,
    autoDraftable: categoryDecision.autoDraftable,
    suggestedHeadline: document.title,
    suggestedContent: document.fullText,
    // Recorded so a misclassification found months later is reproducible (10.4).
    modelKey: providerResult.modelKey,
    promptVersion: providerResult.promptVersion,
    providerKey: provider.key,
    prefilterScore: prefilter.score,
    prefilterMatchedBoost: prefilter.matchedBoost,
    prefilterMatchedNegative: prefilter.matchedNegative,
    route: routing.route,
    routeExplanation: routing.explanation,
    assessedAt: new Date().toISOString(),
  });

  logger.info("Assessment complete", {
    source: source.code,
    externalId: document.externalId,
    category: assessment.primaryCategory,
    route: routing.route,
    relevance: routing.relevance,
    confidence: assessment.confidence,
  });

  return { prefilter, assessment, routing, assessmentId: stored.id };
}

export { ClassificationError } from "../ai/provider/types";
export type { PrefilterResult } from "../ai/prefilter.rules";
