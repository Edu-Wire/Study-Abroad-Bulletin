import { prisma } from "../../config/prisma.js";
import { assess } from "../../modules/ingestion/services/classification.service.ts";
import { createOrUpdateCandidate } from "../../modules/ingestion/services/candidate.service.ts";
import { createPrismaRepos } from "../../modules/ingestion/services/prismaRepos.ts";
import { getSource } from "../../modules/ingestion/config/sourceRegistry.ts";
import { enqueueJob, JobNames } from "../boss.js";

/**
 * Editorial routes that produce a candidate. IGNORE and HOLD keep the source
 * evidence and the assessment, but never reach an editor's queue (10.3).
 */
const CANDIDATE_ROUTES = new Set(["REVIEW", "AUTO_DRAFT", "CRITICAL_DRAFT_ALERT"]);
const DRAFT_ROUTES = new Set(["AUTO_DRAFT", "CRITICAL_DRAFT_ALERT"]);

/**
 * Structured logger bridging the worker's console to the adapter contract.
 *
 * @param {string} sourceCode
 */
function createJobLogger(sourceCode) {
  const emit = (level, method) => (message, meta) =>
    console[method](`[${sourceCode}:classify] ${level}: ${message}`, meta || "");
  return {
    debug: emit("debug", "debug"),
    info: emit("info", "info"),
    warn: emit("warn", "warn"),
    error: emit("error", "error"),
  };
}

/**
 * Rebuild the normalized document (Blueprint 7.2) from what the detail stage
 * persisted.
 *
 * The full stored text is the input, never the discovery summary: classifying a
 * feed snippet is the root cause Blueprint 10.4 names, and the prefilter refuses
 * an empty body rather than scoring a headline.
 *
 * @param {object} sourceItem
 * @param {object|null} version
 * @param {object} sourceConfig
 */
function buildNormalizedDocument(sourceItem, version, sourceConfig) {
  const rawMetadata = sourceItem.rawMetadata || {};

  return {
    sourceId: sourceItem.contentSource.code,
    externalId: sourceItem.externalId || sourceItem.canonicalUrl,
    canonicalUrl: sourceItem.canonicalUrl,
    countryCodes: sourceConfig.countryCodes || [],
    publishedAt: sourceItem.publishedAt
      ? sourceItem.publishedAt.toISOString()
      : new Date(sourceItem.discoveredAt).toISOString(),
    updatedAtSource: null,
    documentType: rawMetadata.documentType || null,
    title: version?.title || sourceItem.title,
    sourceSummary: sourceItem.summary || null,
    fullText: version?.cleanText || "",
    sourceTopics: sourceItem.nativeTopics || [],
    language: sourceItem.language || "en",
    contentHash: version?.contentHash || "PENDING_PIPELINE_HASH",
    rawMetadata,
  };
}

/**
 * `detailStatus` gates the auto-draft lane (10.4: no full source, no draft).
 * The adapter records it in the item's raw metadata; a version with no text is
 * treated as FAILED regardless of what the metadata claims.
 *
 * @param {object} sourceItem
 * @param {object|null} version
 */
function resolveDetailStatus(sourceItem, version) {
  if (!version?.cleanText || version.cleanText.trim().length === 0) return "FAILED";
  const recorded = sourceItem.rawMetadata?.detailStatus;
  return recorded === "ENRICHED" || recorded === "PARTIAL" || recorded === "FAILED"
    ? recorded
    : "ENRICHED";
}

/**
 * Worker job handler for AI assessment, category invariants, routing and
 * candidate staging.
 *
 * The editorial decision itself lives in Developer B's services — prefilter,
 * provider, schema invariants (10.4), routing table (10.3), candidate bridge.
 * This handler only loads state, calls them, and records the outcome, so the
 * rules an editor sees in Admin are the rules that actually ran.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.sourceItemId
 * @param {string} [job.data.versionId]
 * @param {string} [job.data.triggeredBy]
 * @returns {Promise<object>}
 */
export async function handleClassifyJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.SOURCE_CLASSIFY}] Classifying source item: ${payload.sourceItemId}`);

  if (!payload.sourceItemId) {
    throw new Error("Missing required sourceItemId in classify job payload.");
  }

  const sourceItem = await prisma.sourceItem.findUnique({
    where: { id: payload.sourceItemId },
    include: {
      contentSource: true,
      versions: {
        where: payload.versionId ? { id: payload.versionId } : undefined,
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
      candidate: { select: { id: true } },
    },
  });

  if (!sourceItem) {
    throw new Error(`SourceItem "${payload.sourceItemId}" not found.`);
  }

  const contentSource = sourceItem.contentSource;
  const sourceConfig = getSource(contentSource.code) || contentSource.config;

  if (!sourceConfig) {
    throw new Error(`Source config for "${contentSource.code}" not found.`);
  }

  const version = sourceItem.versions[0] || null;
  const logger = createJobLogger(contentSource.code);
  const repos = createPrismaRepos({
    versionId: version?.id ?? null,
    actorId: payload.triggeredBy || "system:ingestion",
  });

  const document = buildNormalizedDocument(sourceItem, version, sourceConfig);
  const detailStatus = resolveDetailStatus(sourceItem, version);

  await prisma.sourceItem.update({
    where: { id: sourceItem.id },
    data: { processingStatus: "SCORED" },
  });

  // A provider outage or an invalid model payload throws a retryable error.
  // It propagates so pg-boss re-queues: the source evidence is already stored
  // and must not be marked processed because the model was unavailable (15.1).
  const result = await assess({
    source: sourceConfig,
    sourceItem: {
      id: sourceItem.id,
      externalId: document.externalId,
      canonicalUrl: sourceItem.canonicalUrl,
    },
    document,
    detailStatus,
    repos,
    logger,
  });

  const route = result.routing.route;

  await prisma.sourceItem.update({
    where: { id: sourceItem.id },
    data: { processingStatus: "CLASSIFIED" },
  });

  if (!CANDIDATE_ROUTES.has(route)) {
    // Evidence retained, no candidate. The assessment explains why on the
    // item's Admin page, so an operator can see what the pipeline decided.
    await prisma.sourceItem.update({
      where: { id: sourceItem.id },
      data: { processingStatus: "ROUTED" },
    });

    return {
      status: "NO_CANDIDATE",
      sourceItemId: sourceItem.id,
      assessmentId: result.assessmentId,
      route,
      reason: result.routing.explanation,
    };
  }

  // A material change on an item that already had a candidate is flagged rather
  // than silently re-drafted (11.2).
  const sourceChanged = version
    ? Boolean(sourceItem.candidate) &&
      (await prisma.sourceDiff.count({
        where: { nextVersionId: version.id, isMaterial: true },
      })) > 0
    : false;

  const candidate = await createOrUpdateCandidate({
    source: sourceConfig,
    sourceItem: {
      id: sourceItem.id,
      externalId: document.externalId,
      canonicalUrl: sourceItem.canonicalUrl,
    },
    version: version ? { id: version.id, hash: version.contentHash } : undefined,
    document,
    assessment: result.assessment,
    route,
    repos,
    logger,
    actor: { id: payload.triggeredBy || "system:ingestion", kind: "SYSTEM" },
    sourceChanged,
  });

  await prisma.articleCandidate.update({
    where: { id: candidate.candidateId },
    data: { aiAssessmentId: result.assessmentId },
  });

  await prisma.sourceItem.update({
    where: { id: sourceItem.id },
    data: { processingStatus: "ROUTED" },
  });

  // An auto-draftable route still needs a resolved CMS category. When the
  // mapping refused one the candidate waits for an editor instead of drafting
  // into a guessed category.
  const autoDraft = DRAFT_ROUTES.has(route) && candidate.autoDraftable && !sourceChanged;
  if (autoDraft) {
    await enqueueJob(JobNames.CANDIDATE_DRAFT, {
      candidateId: candidate.candidateId,
      sourceItemId: sourceItem.id,
    });
  }

  return {
    status: "CLASSIFIED",
    sourceItemId: sourceItem.id,
    assessmentId: result.assessmentId,
    candidateId: candidate.candidateId,
    route,
    routeExplanation: result.routing.explanation,
    category: candidate.draftPayload.category,
    categoryReason: candidate.reason,
    autoDraftQueued: autoDraft,
  };
}
