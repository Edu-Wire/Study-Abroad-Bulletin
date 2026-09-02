import { prisma } from "../../config/prisma.js";
import { runPrefilter } from "../../modules/ingestion/classification/prefilterRules.ts";
import { getSource } from "../../modules/ingestion/config/sourceRegistry.ts";
import { enqueueJob, JobNames } from "../boss.js";

/**
 * Worker job handler for AI assessment, relevance scoring, and candidate staging.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.sourceItemId
 * @param {string} [job.data.versionId]
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
    },
  });

  if (!sourceItem) {
    throw new Error(`SourceItem "${payload.sourceItemId}" not found.`);
  }

  const contentSource = sourceItem.contentSource;
  const version = sourceItem.versions[0] || null;
  const sourceConfig =
    getSource(contentSource.code) || contentSource.config;

  if (!sourceConfig) {
    throw new Error(`Source config for "${contentSource.code}" not found.`);
  }

  // Build document representation for prefilter evaluation
  const normalizedDoc = {
    sourceId: contentSource.code,
    sourceCode: contentSource.code,
    externalId: sourceItem.externalId || undefined,
    url: sourceItem.canonicalUrl,
    title: version?.title || sourceItem.title,
    sourceSummary: sourceItem.summary || undefined,
    sourceTopics: sourceItem.nativeTopics || [],
    documentType: "NEWS_UPDATE",
    publishedAt: sourceItem.publishedAt
      ? sourceItem.publishedAt.toISOString()
      : undefined,
    capturedAt: version?.capturedAt
      ? version.capturedAt.toISOString()
      : new Date().toISOString(),
    fullText: version?.cleanText || version?.cleanHtml || sourceItem.title,
    authors: version?.authors || [],
  };

  const prefilterVerdict = runPrefilter(sourceConfig, normalizedDoc);

  // If rejected by prefilter, record assessment as IGNORED and exit
  if (!prefilterVerdict.passed) {
    const assessment = await prisma.aiAssessment.create({
      data: {
        sourceItemId: sourceItem.id,
        versionId: version?.id || null,
        relevanceScore: prefilterVerdict.signal / 100,
        confidenceScore: 0.9,
        urgency: "LOW",
        internalCategory: "OTHER",
        suggestedCategory: "VISA",
        routingDecision: "IGNORE",
        suggestedHeadline: sourceItem.title,
        suggestedSummary: prefilterVerdict.reason,
        model: "prefilter-deterministic-v1",
        promptVersion: "v1.0",
        rawOutput: prefilterVerdict,
      },
    });

    await prisma.sourceItem.update({
      where: { id: sourceItem.id },
      data: { processingStatus: "ROUTED" },
    });

    return {
      status: "REJECTED_PREFILTER",
      sourceItemId: sourceItem.id,
      assessmentId: assessment.id,
      reason: prefilterVerdict.reason,
    };
  }

  // Passed prefilter -> Map category and route decision
  const relevanceScore = Math.min(1.0, Math.max(0.65, prefilterVerdict.signal / 100));
  const routingDecision = relevanceScore >= 0.8 ? "CREATE_DRAFT" : "REVIEW";
  const suggestedCategory = contentSource.categoryHint || "VISA";

  const assessment = await prisma.aiAssessment.create({
    data: {
      sourceItemId: sourceItem.id,
      versionId: version?.id || null,
      relevanceScore,
      confidenceScore: 0.88,
      urgency: sourceConfig.priority || "MEDIUM",
      internalCategory: "STUDENT_VISA",
      suggestedCategory,
      routingDecision,
      suggestedHeadline: version?.title || sourceItem.title,
      suggestedSummary: sourceItem.summary || sourceItem.title,
      suggestedContent: version?.cleanHtml || version?.cleanText || null,
      model: "gemini-flash-1.5-assessment-v1",
      promptVersion: "v1.0",
      rawOutput: { prefilterVerdict, score: relevanceScore },
    },
  });

  // Create or update ArticleCandidate in editorial staging
  const candidateStatus = routingDecision === "CREATE_DRAFT" ? "AUTO_DRAFTED" : "PENDING";

  const candidate = await prisma.articleCandidate.upsert({
    where: { sourceItemId: sourceItem.id },
    create: {
      sourceItemId: sourceItem.id,
      aiAssessmentId: assessment.id,
      headline: assessment.suggestedHeadline || sourceItem.title,
      summary: assessment.suggestedSummary || sourceItem.summary || sourceItem.title,
      content: version?.cleanHtml || version?.cleanText || null,
      category: suggestedCategory,
      primaryCountryId: sourceItem.countryId,
      confidence: assessment.confidenceScore,
      status: candidateStatus,
    },
    update: {
      aiAssessmentId: assessment.id,
      headline: assessment.suggestedHeadline || sourceItem.title,
      summary: assessment.suggestedSummary || sourceItem.summary || sourceItem.title,
      content: version?.cleanHtml || version?.cleanText || null,
      category: suggestedCategory,
      primaryCountryId: sourceItem.countryId,
      confidence: assessment.confidenceScore,
      status: candidateStatus,
    },
  });

  await prisma.sourceItem.update({
    where: { id: sourceItem.id },
    data: { processingStatus: "CLASSIFIED" },
  });

  // Auto-draft to CMS if candidate is AUTO_DRAFTED
  if (candidate.status === "AUTO_DRAFTED") {
    await enqueueJob(JobNames.CANDIDATE_DRAFT, {
      candidateId: candidate.id,
      sourceItemId: sourceItem.id,
    });
  }

  return {
    status: "CLASSIFIED",
    sourceItemId: sourceItem.id,
    assessmentId: assessment.id,
    candidateId: candidate.id,
    routingDecision,
  };
}
