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
    // Detail extraction failed. The discovery summary stands in so the item is
    // still visible in Admin, but `detailStatus: FAILED` is recorded with it:
    // the routing policy refuses to auto-draft anything that is not ENRICHED,
    // so a snippet can never reach the CMS as if it were the full source.
    console.warn(
      `[${sourceConfig.code}:detail] Detail extraction failed for ${sourceItem.id}: ${adapterErr?.message}`
    );
    sourceDetail = {
      url: discoveredItem.url,
      title: discoveredItem.title,
      rawBody: sourceItem.summary || sourceItem.title,
      detailStatus: "FAILED",
      httpStatus: 200,
    };
    normalizedDoc = {
      title: sourceItem.title,
      sourceSummary: sourceItem.summary || sourceItem.title,
      cleanHtml: `<p>${sourceItem.summary || sourceItem.title}</p>`,
      fullText: sourceItem.summary || sourceItem.title,
      authors: [],
      rawMetadata: { detailStatus: "FAILED", detailError: String(adapterErr?.message || adapterErr) },
    };
  }



  // HTML sanitization & whitespace normalization.
  //
  // The adapter contract (7.2) names the body `fullText` and the raw detail
  // region `body`; the older `cleanText`/`cleanHtml`/`rawBody` names are kept as
  // fallbacks for the local error path below. Reading only the old names left
  // `cleanText` empty and hashed the title instead of the document, which is
  // exactly the "classified from a snippet" defect 10.4 exists to prevent.
  const rawHtml =
    normalizedDoc.cleanHtml || sourceDetail.body || normalizedDoc.rawBody || sourceDetail.rawBody || "";
  const cleanHtml = sanitizeHtml(rawHtml);
  const rawText = normalizedDoc.fullText || normalizedDoc.cleanText || stripAllHtml(cleanHtml);
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

  // Update SourceItem record and status.
  //
  // `rawMetadata` carries the adapter's `detailStatus` forward: the classify
  // job reads it to decide whether the auto-draft lane is even open (10.4).
  await prisma.sourceItem.update({
    where: { id: sourceItem.id },
    data: {
      processingStatus: "VERSIONED",
      title: normalizedDoc.title || sourceItem.title,
      summary: normalizedDoc.sourceSummary || normalizedDoc.summary || sourceItem.summary,
      rawMetadata: {
        ...(sourceItem.rawMetadata || {}),
        ...(normalizedDoc.rawMetadata || {}),
        detailStatus:
          normalizedDoc.rawMetadata?.detailStatus || sourceDetail.detailStatus || "ENRICHED",
      },
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
