/**
 * Candidate service - the bridge from source corpus to CMS.
 *
 *   AiAssessment -> ArticleCandidate -> Article (DRAFT)
 *
 * There is no shortcut around this path, and there is no code path in this file
 * that sets `PUBLISHED`. Blueprint 10.3 launch safety: Phase 1 creates drafts,
 * humans publish. `candidate.service.test` asserts it.
 *
 * Persistence goes through `repos`; this file never imports Prisma.
 */

import { mapToCmsCategory, type CmsCategory } from "../config/categoryMapping";
import type { AiAssessmentOutput } from "../schemas/aiAssessment.schema";
import type { EditorialRoute } from "../schemas/aiAssessment.schema";
import type { SourceConfig } from "../config/sourceConfig.schema";
import type { NormalizedSourceDocument } from "../schemas/candidate.schema";
import type { AdapterLogger, IngestionRepos } from "../adapters/base/types";

/** Average adult reading speed, rounded down to be honest about long documents. */
const WORDS_PER_MINUTE = 200;

export interface Actor {
  id: string;
  kind: "SYSTEM" | "USER";
}

export interface CandidateInput {
  source: SourceConfig;
  sourceItem: { id: string; externalId: string; canonicalUrl: string };
  version?: { id: string; hash: string };
  document: NormalizedSourceDocument;
  assessment: AiAssessmentOutput;
  route: EditorialRoute;
  repos: IngestionRepos;
  logger: AdapterLogger;
  actor?: Actor;
  /** True when a watched page changed after a candidate already existed. */
  sourceChanged?: boolean;
}

export interface DraftPayload {
  title: string;
  summary: string;
  body: string;
  readingTime: number;
  category: CmsCategory | null;
  primaryCountryId: string | null;
  countryCodes: string[];
  sourceUrl: string;
  sourceAttribution: string;
  slug: string;
}

export interface CandidateResult {
  candidateId: string;
  status: string;
  draftPayload: DraftPayload;
  /** False when the category could not be resolved automatically. */
  autoDraftable: boolean;
  reason: string;
}

/**
 * Create or update the candidate for a source item.
 *
 * Idempotent by `sourceItem.id`: re-running a sync updates the existing
 * candidate rather than producing a second one, which is what makes the 72-hour
 * overlap window in incremental discovery safe.
 */
export async function createOrUpdateCandidate(
  input: CandidateInput
): Promise<CandidateResult> {
  const { source, sourceItem, document, assessment, repos, logger } = input;

  const decision = mapToCmsCategory(assessment);
  const draftPayload = await buildDraftPayload(input, decision.category);

  const existing = await repos.articleCandidate.findBySourceItem(sourceItem.id);
  const status = resolveStatus(input, Boolean(existing));

  const candidate = await repos.articleCandidate.upsertBySourceItem({
    sourceItemId: sourceItem.id,
    sourceCode: source.code,
    sourceVersionId: input.version?.id ?? null,
    status,
    route: input.route,
    primaryCategory: assessment.primaryCategory,
    secondaryCategories: assessment.secondaryCategories,
    cmsCategory: decision.category,
    autoDraftable: decision.autoDraftable,
    categoryReason: decision.reason,
    shortSummary: assessment.shortSummary,
    confidence: assessment.confidence,
    draftPayload,
    updatedAt: new Date().toISOString(),
    updatedBy: input.actor?.id ?? "system:ingestion",
  });

  if (status === "SOURCE_UPDATED") {
    // 11.2: an existing draft is marked, and a published article raises an
    // editorial alert. Nothing rewrites live copy behind an editor's back.
    logger.warn("Source changed after a candidate already existed", {
      source: source.code,
      externalId: sourceItem.externalId,
      candidateId: candidate.id,
      versionHash: input.version?.hash,
    });
  }

  logger.info("Candidate upserted", {
    source: source.code,
    candidateId: candidate.id,
    status,
    category: decision.category ?? "unmapped",
  });

  return {
    candidateId: candidate.id,
    status,
    draftPayload,
    autoDraftable: decision.autoDraftable,
    reason: decision.reason,
  };
}

/**
 * Promote a candidate to an Article. Always a DRAFT, and always linked back to
 * the source item and version so the article's evidence stays auditable.
 */
export async function promoteToArticleDraft(
  candidateId: string,
  options: {
    candidate: CandidateResult;
    sourceItemId: string;
    sourceVersionId?: string;
    repos: IngestionRepos;
    logger: AdapterLogger;
    actor: Actor;
  }
): Promise<{ id: string; slug: string }> {
  const { candidate, repos, logger, actor } = options;

  if (!candidate.draftPayload.category) {
    throw new Error(
      `Candidate ${candidateId} has no CMS category (${candidate.reason}); an editor must choose one`
    );
  }

  const article = await repos.article.createDraftFromCandidate({
    candidateId,
    ...candidate.draftPayload,
    // Hardcoded, never derived from the assessment or a config flag.
    // Phase 1 has no auto-publish path (Blueprint 10.3).
    status: "DRAFT",
    createdBy: actor.id,
  });

  await repos.articleSourceLink.link({
    articleId: article.id,
    sourceItemId: options.sourceItemId,
    sourceVersionId: options.sourceVersionId ?? null,
    relationType: "ORIGIN",
  });

  logger.info("Draft created from candidate", {
    candidateId,
    articleId: article.id,
    slug: article.slug,
    actor: actor.id,
  });

  return article;
}

/** Dismiss a candidate. Audited; the source evidence is retained either way. */
export async function ignoreCandidate(
  candidateId: string,
  options: {
    sourceItemId: string;
    reason: string;
    repos: IngestionRepos;
    logger: AdapterLogger;
    actor: Actor;
  }
): Promise<void> {
  await options.repos.articleCandidate.upsertBySourceItem({
    sourceItemId: options.sourceItemId,
    status: "DISMISSED_BY_EDITOR",
    dismissedReason: options.reason,
    dismissedBy: options.actor.id,
    updatedAt: new Date().toISOString(),
  });

  options.logger.info("Candidate ignored", {
    candidateId,
    actor: options.actor.id,
    reason: options.reason,
  });
}

// ============================================================
// Internals
// ============================================================

function resolveStatus(input: CandidateInput, exists: boolean): string {
  if (exists && input.sourceChanged) return "SOURCE_UPDATED";

  switch (input.route) {
    case "IGNORE":
      return "IGNORED";
    case "HOLD":
      return "HELD";
    case "REVIEW":
      return "AWAITING_REVIEW";
    case "AUTO_DRAFT":
    case "CRITICAL_DRAFT_ALERT":
      return "DRAFT_PENDING";
    default:
      return "AWAITING_REVIEW";
  }
}

async function buildDraftPayload(
  input: CandidateInput,
  category: CmsCategory | null
): Promise<DraftPayload> {
  const { source, document, assessment, repos } = input;

  const countryIds = await repos.country.findIdsByCodes(source.countryCodes);
  const primaryCountryId = countryIds[source.countryCodes[0]] ?? null;

  const body = sanitizeBody(document.fullText);

  return {
    title: document.title,
    summary: assessment.shortSummary,
    // The body is the full source text, not the feed summary (7.1). An editor
    // rewrites it; the pipeline never publishes government prose verbatim.
    body,
    readingTime: Math.max(1, Math.ceil(countWords(body) / WORDS_PER_MINUTE)),
    category,
    primaryCountryId,
    countryCodes: source.countryCodes,
    sourceUrl: document.canonicalUrl,
    sourceAttribution: `${source.name} (${source.provenance.owner})`,
    slug: buildSlug(source.code, document.title, document.externalId),
  };
}

/**
 * Plain text in, plain text out. Adapters already extract text rather than
 * HTML, so this is a defensive second pass: any markup that reached here would
 * otherwise be stored and later rendered.
 */
function sanitizeBody(text: string): string {
  return text
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Source-prefixed slug. The prefix keeps two governments announcing the same
 * change on the same day from colliding, and the external-id suffix keeps the
 * slug stable when an editor retitles the draft.
 */
function buildSlug(sourceCode: string, title: string, externalId: string): string {
  const titlePart = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  const idPart = externalId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-12);

  return [sourceCode, titlePart, idPart].filter(Boolean).join("-");
}

export { mapToCmsCategory } from "../config/categoryMapping";
