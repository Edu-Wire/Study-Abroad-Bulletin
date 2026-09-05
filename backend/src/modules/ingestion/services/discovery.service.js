import { prisma } from "../../../config/prisma.js";
import { enqueueJob, JobNames } from "../../../worker/boss.js";
import { createAdapter } from "../adapters/index.ts";
import { getSource } from "../config/sourceRegistry.ts";
import { createHttpFetcher } from "../utils/httpClient.js";
import { parseSafeXml } from "../utils/safeXmlParser.js";
import { canonicalizeUrl, hashCanonicalUrl } from "../utils/urlCanonicalizer.js";
import { hashContent } from "../utils/contentHasher.js";

/**
 * Processing statuses that mean "never successfully went through detail yet" -
 * an item still in one of these should always get a detail job, regardless of
 * whether its discovery-level fields happen to match last time (e.g. a prior
 * attempt failed before a version was ever recorded).
 */
const PRE_DETAIL_STATUSES = new Set(["DISCOVERED", "DETAIL_PENDING"]);

/**
 * Fingerprint of the cheap fields discovery already has in hand, without an
 * extra fetch. Only meaningful for sources whose discovery payload actually
 * reflects the page's real content (RSS/API/WEB/DATA) - a CHANGE_WATCH
 * source's discovery is static config (the same title/URL every run), so this
 * would hash to the same value forever and can never be used to decide
 * whether to re-check the page; that source family relies on detail.service's
 * own content hash of the fetched page instead.
 */
export function computeDiscoveryHash(title, summary, publishedAt) {
  return hashContent(`${title}\n${summary || ""}\n${publishedAt ? publishedAt.toISOString() : ""}`);
}

/**
 * Whether an already-known item can skip re-enqueueing the detail fetch this
 * discovery run. Shared by both upsert branches below (externalId lookup and
 * canonicalUrlHash fallback) so the rule only lives in one place.
 *
 * @param {object} params
 * @param {boolean} params.isWatchSource
 * @param {string|null} params.existingHash
 * @param {string} params.newHash
 * @param {string} params.existingStatus
 * @returns {boolean}
 */
export function shouldSkipDetail({ isWatchSource, existingHash, newHash, existingStatus }) {
  if (isWatchSource) return false;
  if (existingHash !== newHash) return false;
  return !PRE_DETAIL_STATUSES.has(existingStatus);
}

/**
 * Executes discovery for a ContentSource, upserting discovered items and enqueueing detail extraction.
 *
 * @param {object} params
 * @param {string} params.contentSourceId Database ID of the ContentSource
 * @param {string} [params.runType="LIVE"] SourceRunType (LIVE, BACKFILL, RECONCILE, MANUAL)
 * @param {string} [params.runId] Optional existing SourceRun ID
 * @returns {Promise<object>} Execution summary
 */
export async function processDiscovery({ contentSourceId, runType = "LIVE", runId }) {
  const contentSource = await prisma.contentSource.findUnique({
    where: { id: contentSourceId },
    include: { syncState: true },
  });

  if (!contentSource) {
    throw new Error(`ContentSource with ID "${contentSourceId}" not found.`);
  }

  if (!contentSource.enabled) {
    return {
      status: "SKIPPED",
      reason: `ContentSource "${contentSource.code}" is currently disabled.`,
    };
  }

  // Retrieve configuration from registry or database JSON
  const sourceConfig =
    getSource(contentSource.code) || contentSource.config;

  if (!sourceConfig) {
    throw new Error(
      `Source configuration for "${contentSource.code}" could not be resolved from registry or database.`
    );
  }

  // Create or attach SourceRun audit record
  let run;
  if (runId) {
    run = await prisma.sourceRun.findUnique({ where: { id: runId } });
  }
  if (!run) {
    run = await prisma.sourceRun.create({
      data: {
        contentSourceId: contentSource.id,
        runType: runType || "LIVE",
        status: "RUNNING",
        startedAt: new Date(),
      },
    });
  }

  const syncState = contentSource.syncState;
  const http = createHttpFetcher();
  const adapter = createAdapter(sourceConfig);

  let itemsFound = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFailed = 0;

  try {
    const discoverContext = {
      source: sourceConfig,
      http,
      xml: { parse: (xml) => parseSafeXml(xml) },
      logger: {
        debug: (msg, meta) => console.debug(`[${sourceConfig.code}] ${msg}`, meta || ""),
        info: (msg, meta) => console.info(`[${sourceConfig.code}] ${msg}`, meta || ""),
        warn: (msg, meta) => console.warn(`[${sourceConfig.code}] ${msg}`, meta || ""),
        error: (msg, meta) => console.error(`[${sourceConfig.code}] ${msg}`, meta || ""),
      },
      now: () => new Date(),
      syncState: {
        watermarkAt: syncState?.watermark ? syncState.watermark.toISOString() : undefined,
        cursor: syncState?.cursor || undefined,
        etag: syncState?.etag || undefined,
        lastModified: syncState?.lastModified || undefined,
      },
      cursor: syncState?.cursor || undefined,
      sinceWatermark: syncState?.watermark
        ? syncState.watermark.toISOString()
        : undefined,
      etag: syncState?.etag || undefined,
      lastModified: syncState?.lastModified || undefined,
    };

    const discoveryPage = await adapter.discover(discoverContext);
    const discoveredItems = discoveryPage?.items || [];
    itemsFound = discoveredItems.length;
    const isWatchSource = sourceConfig.transport === "WATCH";

    for (const item of discoveredItems) {
      try {
        const itemUrl = item.canonicalUrl || item.url;
        if (!itemUrl || !item.title) {
          continue;
        }

        const canonicalUrl = canonicalizeUrl(itemUrl);
        const canonicalUrlHash = hashCanonicalUrl(canonicalUrl);
        const externalId = item.externalId ? String(item.externalId).trim() : null;
        const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
        const summary = item.sourceSummary || item.summary || null;
        const nativeTopics = item.sourceTopics || item.nativeTopics || [];
        const discoveryHash = computeDiscoveryHash(item.title, summary, publishedAt);

        let sourceItem = null;
        let skipDetail = false;

        if (externalId) {
          // Unique lookup on (contentSourceId, externalId)
          const existing = await prisma.sourceItem.findUnique({
            where: {
              contentSourceId_externalId: {
                contentSourceId: contentSource.id,
                externalId,
              },
            },
          });

          if (existing) {
            skipDetail = shouldSkipDetail({
              isWatchSource,
              existingHash: existing.discoveryHash,
              newHash: discoveryHash,
              existingStatus: existing.processingStatus,
            });

            sourceItem = await prisma.sourceItem.update({
              where: { id: existing.id },
              data: {
                canonicalUrl,
                canonicalUrlHash,
                title: item.title,
                summary: summary || existing.summary,
                publishedAt: publishedAt || existing.publishedAt,
                language: item.language || existing.language || "en",
                nativeTopics: nativeTopics.length > 0 ? nativeTopics : existing.nativeTopics,
                rawMetadata: item.discoveryRaw || item.rawMetadata || item,
                discoveryHash,
              },
            });
            itemsUpdated++;
          } else {
            sourceItem = await prisma.sourceItem.create({
              data: {
                contentSourceId: contentSource.id,
                externalId,
                canonicalUrl,
                canonicalUrlHash,
                title: item.title,
                summary,
                publishedAt,
                countryId: contentSource.countryId,
                language: item.language || "en",
                nativeTopics,
                rawMetadata: item.discoveryRaw || item.rawMetadata || item,
                processingStatus: "DETAIL_PENDING",
                discoveryHash,
              },
            });
            itemsCreated++;
          }
        } else {
          // Unique lookup on fallback (contentSourceId, canonicalUrlHash)
          const existing = await prisma.sourceItem.findUnique({
            where: {
              contentSourceId_canonicalUrlHash: {
                contentSourceId: contentSource.id,
                canonicalUrlHash,
              },
            },
          });

          if (existing) {
            skipDetail = shouldSkipDetail({
              isWatchSource,
              existingHash: existing.discoveryHash,
              newHash: discoveryHash,
              existingStatus: existing.processingStatus,
            });

            sourceItem = await prisma.sourceItem.update({
              where: { id: existing.id },
              data: {
                title: item.title,
                summary: summary || existing.summary,
                publishedAt: publishedAt || existing.publishedAt,
                language: item.language || existing.language || "en",
                nativeTopics: nativeTopics.length > 0 ? nativeTopics : existing.nativeTopics,
                rawMetadata: item.discoveryRaw || item.rawMetadata || item,
                discoveryHash,
              },
            });
            itemsUpdated++;
          } else {
            sourceItem = await prisma.sourceItem.create({
              data: {
                contentSourceId: contentSource.id,
                externalId: null,
                canonicalUrl,
                canonicalUrlHash,
                title: item.title,
                summary,
                publishedAt,
                countryId: contentSource.countryId,
                language: item.language || "en",
                nativeTopics,
                rawMetadata: item.discoveryRaw || item.rawMetadata || item,
                processingStatus: "DETAIL_PENDING",
                discoveryHash,
              },
            });
            itemsCreated++;
          }
        }

        // Enqueue detail job for item enrichment - unless discovery's own cheap
        // fingerprint already matches what we saw last time (see skipDetail
        // above), in which case there is nothing new to fetch or classify.
        if (sourceItem && !skipDetail) {
          await enqueueJob(JobNames.SOURCE_DETAIL, {
            sourceItemId: sourceItem.id,
            contentSourceId: contentSource.id,
            url: sourceItem.canonicalUrl,
          });
        } else if (sourceItem) {
          discoverContext.logger.debug("Discovery fingerprint unchanged, skipping detail fetch", {
            source: sourceConfig.code,
            sourceItemId: sourceItem.id,
          });
        }
      } catch (itemErr) {
        itemsFailed++;
      }
    }

    // Update SourceSyncState upon successful discovery
    const newWatermark = discoveryPage?.newWatermark
      ? new Date(discoveryPage.newWatermark)
      : syncState?.watermark;

    await prisma.sourceSyncState.upsert({
      where: { contentSourceId: contentSource.id },
      create: {
        contentSourceId: contentSource.id,
        cursor: discoveryPage?.nextCursor || null,
        watermark: newWatermark || null,
        etag: discoveryPage?.etag || null,
        lastModified: discoveryPage?.lastModified || null,
        lastSuccessAt: new Date(),
        consecutiveFailures: 0,
        healthStatus: "HEALTHY",
      },
      update: {
        cursor: discoveryPage?.nextCursor || syncState?.cursor || null,
        watermark: newWatermark || syncState?.watermark || null,
        etag: discoveryPage?.etag || syncState?.etag || null,
        lastModified: discoveryPage?.lastModified || syncState?.lastModified || null,
        lastSuccessAt: new Date(),
        consecutiveFailures: 0,
        healthStatus: "HEALTHY",
      },
    });

    // Finalize SourceRun
    await prisma.sourceRun.update({
      where: { id: run.id },
      data: {
        status: itemsFailed > 0 && itemsCreated === 0 ? "PARTIAL" : "SUCCESS",
        finishedAt: new Date(),
        itemsFound,
        itemsCreated,
        itemsUpdated,
        itemsFailed,
      },
    });

    return {
      status: "SUCCESS",
      runId: run.id,
      itemsFound,
      itemsCreated,
      itemsUpdated,
      itemsFailed,
    };
  } catch (error) {
    const consecutiveFailures = (syncState?.consecutiveFailures || 0) + 1;
    const healthStatus =
      consecutiveFailures >= 3 ? "DEGRADED" : syncState?.healthStatus || "HEALTHY";

    // Update sync state with failure tracking
    await prisma.sourceSyncState.upsert({
      where: { contentSourceId: contentSource.id },
      create: {
        contentSourceId: contentSource.id,
        lastFailureAt: new Date(),
        lastErrorMessage: error.message,
        consecutiveFailures,
        healthStatus,
      },
      update: {
        lastFailureAt: new Date(),
        lastErrorMessage: error.message,
        consecutiveFailures,
        healthStatus,
      },
    });

    // Mark SourceRun as FAILED
    await prisma.sourceRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage: error.message,
        itemsFound,
        itemsCreated,
        itemsUpdated,
        itemsFailed,
      },
    });

    throw error;
  }
}
