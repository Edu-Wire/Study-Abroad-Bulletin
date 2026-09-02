import { prisma } from "../../../config/prisma.js";
import { enqueueJob, JobNames } from "../../../worker/boss.js";
import { createAdapter } from "../adapters/index.ts";
import { getSource } from "../config/sourceRegistry.ts";
import { createHttpFetcher } from "../utils/httpClient.js";
import { canonicalizeUrl, hashCanonicalUrl } from "../utils/urlCanonicalizer.js";

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
      cursor: syncState?.cursor || undefined,
      sinceWatermark: syncState?.watermark
        ? syncState.watermark.toISOString()
        : undefined,
      etag: syncState?.etag || undefined,
      lastModified: syncState?.lastModified || undefined,
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    };


    const discoveryPage = await adapter.discover(discoverContext);
    const discoveredItems = discoveryPage?.items || [];
    itemsFound = discoveredItems.length;

    for (const item of discoveredItems) {
      try {
        if (!item.url || !item.title) {
          continue;
        }

        const canonicalUrl = canonicalizeUrl(item.url);
        const canonicalUrlHash = hashCanonicalUrl(canonicalUrl);
        const externalId = item.externalId ? String(item.externalId).trim() : null;
        const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;

        let sourceItem = null;

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
            sourceItem = await prisma.sourceItem.update({
              where: { id: existing.id },
              data: {
                canonicalUrl,
                canonicalUrlHash,
                title: item.title,
                summary: item.summary || existing.summary,
                publishedAt: publishedAt || existing.publishedAt,
                language: item.language || existing.language || "en",
                nativeTopics: item.nativeTopics || existing.nativeTopics,
                rawMetadata: item.rawMetadata || item,
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
                summary: item.summary || null,
                publishedAt,
                countryId: contentSource.countryId,
                language: item.language || "en",
                nativeTopics: item.nativeTopics || [],
                rawMetadata: item.rawMetadata || item,
                processingStatus: "DETAIL_PENDING",
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
            sourceItem = await prisma.sourceItem.update({
              where: { id: existing.id },
              data: {
                title: item.title,
                summary: item.summary || existing.summary,
                publishedAt: publishedAt || existing.publishedAt,
                language: item.language || existing.language || "en",
                nativeTopics: item.nativeTopics || existing.nativeTopics,
                rawMetadata: item.rawMetadata || item,
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
                summary: item.summary || null,
                publishedAt,
                countryId: contentSource.countryId,
                language: item.language || "en",
                nativeTopics: item.nativeTopics || [],
                rawMetadata: item.rawMetadata || item,
                processingStatus: "DETAIL_PENDING",
              },
            });
            itemsCreated++;
          }
        }

        // Enqueue detail job for item enrichment
        if (sourceItem) {
          await enqueueJob(JobNames.SOURCE_DETAIL, {
            sourceItemId: sourceItem.id,
            contentSourceId: contentSource.id,
            url: sourceItem.canonicalUrl,
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
