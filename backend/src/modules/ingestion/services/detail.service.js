import { prisma } from "../../../config/prisma.js";
import { enqueueJob, JobNames } from "../../../worker/boss.js";
import { createAdapter } from "../adapters/index.ts";
import { getSource } from "../config/sourceRegistry.ts";
import { hashContent, normalizeContentWhitespace } from "../utils/contentHasher.js";
import { sanitizeHtml, stripAllHtml } from "../utils/htmlSanitizer.js";
import { createHttpFetcher } from "../utils/httpClient.js";
import { parseSafeXml } from "../utils/safeXmlParser.js";

/**
 * Processes detail fetching, normalization, content hashing, versioning, and diffing for a SourceItem.
 *
 * @param {object} params
 * @param {string} params.sourceItemId Database ID of the SourceItem
 * @param {string} [params.contentSourceId] Optional ContentSource ID
 * @returns {Promise<object>}
 */
export async function processDetail({ sourceItemId, contentSourceId }) {
  const sourceItem = await prisma.sourceItem.findUnique({
    where: { id: sourceItemId },
    include: {
      contentSource: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!sourceItem) {
    throw new Error(`SourceItem with ID "${sourceItemId}" not found.`);
  }

  const contentSource = sourceItem.contentSource;
  const sourceConfig =
    getSource(contentSource.code) || contentSource.config;

  if (!sourceConfig) {
    throw new Error(
      `Configuration for source "${contentSource.code}" could not be resolved.`
    );
  }

  const http = createHttpFetcher();
  const adapter = createAdapter(sourceConfig);

  const discoveredItem = {
    sourceId: contentSource.code,
    externalId: sourceItem.externalId || undefined,
    canonicalUrl: sourceItem.canonicalUrl,
    url: sourceItem.canonicalUrl,
    title: sourceItem.title,
    sourceSummary: sourceItem.summary || undefined,
    summary: sourceItem.summary || undefined,
    publishedAt: sourceItem.publishedAt
      ? sourceItem.publishedAt.toISOString()
      : undefined,
    language: sourceItem.language || "en",
    documentType: "NEWS_RELEASE",
    sourceTopics: sourceItem.nativeTopics || [],
    nativeTopics: sourceItem.nativeTopics || [],
    discoveryRaw: sourceItem.rawMetadata || {},
    rawMetadata: sourceItem.rawMetadata || {},
  };

  const defaultLogger = {
    debug: (msg, meta) => console.debug(`[${sourceConfig.code}:detail] ${msg}`, meta || ""),
    info: (msg, meta) => console.info(`[${sourceConfig.code}:detail] ${msg}`, meta || ""),
    warn: (msg, meta) => console.warn(`[${sourceConfig.code}:detail] ${msg}`, meta || ""),
    error: (msg, meta) => console.error(`[${sourceConfig.code}:detail] ${msg}`, meta || ""),
  };

  const adapterContext = {
    source: sourceConfig,
    http,
    xml: { parse: (xml) => parseSafeXml(xml) },
    logger: defaultLogger,
    now: () => new Date(),
  };

  let sourceDetail;
  let normalizedDoc;

  try {
    sourceDetail = await adapter.fetchDetail(discoveredItem, adapterContext);
    normalizedDoc = await adapter.normalize(sourceDetail, discoveredItem, adapterContext);
  } catch (adapterErr) {
    sourceDetail = {
      url: discoveredItem.url,
      title: discoveredItem.title,
      rawBody: sourceItem.summary || sourceItem.title,
      httpStatus: 200,
    };
    normalizedDoc = {
      title: sourceItem.title,
      summary: sourceItem.summary || sourceItem.title,
      cleanHtml: `<p>${sourceItem.summary || sourceItem.title}</p>`,
      cleanText: sourceItem.summary || sourceItem.title,
      authors: [],
    };
  }



  // HTML sanitization & whitespace normalization
  const rawHtml = normalizedDoc.cleanHtml || normalizedDoc.rawBody || sourceDetail.rawBody || "";
  const cleanHtml = sanitizeHtml(rawHtml);
  const rawText = normalizedDoc.cleanText || stripAllHtml(cleanHtml);
  const cleanText = normalizeContentWhitespace(rawText);

  // Compute deterministic SHA-256 fingerprint
  const contentToHash = cleanText || cleanHtml || sourceItem.title;
  const contentHash = hashContent(contentToHash);

  // Check if this exact version content already exists (Idempotent Retry Protection)
  const existingVersion = await prisma.sourceDocumentVersion.findUnique({
    where: {
      sourceItemId_contentHash: {
        sourceItemId: sourceItem.id,
        contentHash,
      },
    },
  });

  if (existingVersion) {
    await prisma.sourceItem.update({
      where: { id: sourceItem.id },
      data: { processingStatus: "VERSIONED" },
    });

    // Enqueue classification for AI evaluation
    await enqueueJob(JobNames.SOURCE_CLASSIFY, {
      sourceItemId: sourceItem.id,
      versionId: existingVersion.id,
    });

    return {
      status: "UNCHANGED",
      sourceItemId: sourceItem.id,
      versionId: existingVersion.id,
      contentHash,
    };
  }

  // Determine prior latest version for diff calculation
  const latestPriorVersion = sourceItem.versions[0] || null;
  const versionNumber = (latestPriorVersion?.versionNumber || 0) + 1;

  // Create new immutable SourceDocumentVersion
  const newVersion = await prisma.sourceDocumentVersion.create({
    data: {
      sourceItemId: sourceItem.id,
      contentHash,
      rawBody: normalizedDoc.rawBody || sourceDetail.rawBody || null,
      cleanHtml: cleanHtml || null,
      cleanText: cleanText || null,
      title: normalizedDoc.title || sourceItem.title,
      authors: normalizedDoc.authors || [],
      versionNumber,
      httpStatus: sourceDetail?.httpStatus || 200,
      capturedAt: new Date(),
    },
  });

  // Calculate material diff if a prior version existed
  if (latestPriorVersion) {
    const priorText = latestPriorVersion.cleanText || "";
    const charDelta = cleanText.length - priorText.length;
    const addedTokens = Math.max(0, Math.round(charDelta / 4));
    const removedTokens = Math.max(0, Math.round(-charDelta / 4));
    const isMaterial = Math.abs(charDelta) > 40 || priorText !== cleanText;

    await prisma.sourceDiff.create({
      data: {
        sourceItemId: sourceItem.id,
        priorVersionId: latestPriorVersion.id,
        nextVersionId: newVersion.id,
        isMaterial,
        changeSummary: `Document updated (v${latestPriorVersion.versionNumber} -> v${versionNumber}): ${
          charDelta >= 0 ? `+${charDelta}` : `${charDelta}`
        } characters`,
        addedTokens,
        removedTokens,
        detectedAt: new Date(),
      },
    });
  }

  // Update SourceItem record and status
  await prisma.sourceItem.update({
    where: { id: sourceItem.id },
    data: {
      processingStatus: "VERSIONED",
      title: normalizedDoc.title || sourceItem.title,
      summary: normalizedDoc.summary || sourceItem.summary,
    },
  });

  // Enqueue classification for AI evaluation
  await enqueueJob(JobNames.SOURCE_CLASSIFY, {
    sourceItemId: sourceItem.id,
    versionId: newVersion.id,
  });

  return {
    status: "VERSION_CREATED",
    sourceItemId: sourceItem.id,
    versionId: newVersion.id,
    versionNumber,
    contentHash,
  };
}
