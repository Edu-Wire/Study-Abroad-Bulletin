import { prisma } from "../../../config/prisma.js";
import { enqueueJob, JobNames } from "../../../worker/boss.js";
import { createAdapter } from "../adapters/index.ts";
import { getSource } from "../config/sourceRegistry.ts";
import { createHttpFetcher } from "../utils/httpClient.js";
import { canonicalizeUrl, hashCanonicalUrl } from "../utils/urlCanonicalizer.js";

/**
 * Creates a BackfillRun and partitions the requested date range into BackfillWindows.
 *
 * @param {object} params
 * @param {string} params.contentSourceId Database ID of the ContentSource
 * @param {Date|string} params.startDate Start date
 * @param {Date|string} params.endDate End date
 * @param {number} [params.windowDays=7] Number of days per window partition
 * @param {object} [params.config] Optional custom config
 * @returns {Promise<object>}
 */
export async function createBackfillRun({
  contentSourceId,
  startDate,
  endDate,
  windowDays = 7,
  config = {},
}) {
  const contentSource = await prisma.contentSource.findUnique({
    where: { id: contentSourceId },
  });

  if (!contentSource) {
    throw new Error(`ContentSource with ID "${contentSourceId}" not found.`);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    throw new Error("Invalid date range provided for backfill.");
  }

  const backfillRun = await prisma.backfillRun.create({
    data: {
      contentSourceId,
      startDate: start,
      endDate: end,
      status: "RUNNING",
      startedAt: new Date(),
      config,
    },
  });

  const windowsToCreate = [];
  let currentStart = new Date(start);

  while (currentStart < end) {
    const currentEnd = new Date(
      Math.min(
        end.getTime(),
        currentStart.getTime() + windowDays * 24 * 60 * 60 * 1000
      )
    );

    windowsToCreate.push({
      backfillRunId: backfillRun.id,
      windowStart: new Date(currentStart),
      windowEnd: new Date(currentEnd),
      status: "PENDING",
    });

    currentStart = new Date(currentEnd);
  }

  // Create windows in database
  const createdWindows = [];
  for (const win of windowsToCreate) {
    const w = await prisma.backfillWindow.create({ data: win });
    createdWindows.push(w);
    // Enqueue window job
    await enqueueJob(JobNames.BACKFILL_WINDOW, {
      backfillWindowId: w.id,
      backfillRunId: backfillRun.id,
    });
  }

  await prisma.backfillRun.update({
    where: { id: backfillRun.id },
    data: { totalWindows: createdWindows.length },
  });

  return {
    backfillRunId: backfillRun.id,
    totalWindows: createdWindows.length,
    windows: createdWindows,
  };
}

/**
 * Processes a single BackfillWindow job.
 *
 * @param {object} params
 * @param {string} params.backfillWindowId
 * @returns {Promise<object>}
 */
export async function processBackfillWindow({ backfillWindowId }) {
  const window = await prisma.backfillWindow.findUnique({
    where: { id: backfillWindowId },
    include: {
      backfillRun: {
        include: { contentSource: true },
      },
    },
  });

  if (!window) {
    throw new Error(`BackfillWindow "${backfillWindowId}" not found.`);
  }

  await prisma.backfillWindow.update({
    where: { id: window.id },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
    },
  });

  const contentSource = window.backfillRun.contentSource;
  const sourceConfig =
    getSource(contentSource.code) || contentSource.config;

  const http = createHttpFetcher();
  const adapter = createAdapter(sourceConfig);

  const defaultLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  try {
    let discoveredItems = [];

    if (typeof adapter.backfill === "function") {
      const backfillResult = await adapter.backfill(
        {
          start: window.windowStart,
          end: window.windowEnd,
          cursor: window.cursor || undefined,
        },
        {
          http,
          source: sourceConfig,
          logger: defaultLogger,
        }
      );
      discoveredItems = backfillResult?.items || [];
    } else {
      // Fallback to discover
      const discoveryPage = await adapter.discover({
        source: sourceConfig,
        http,
        sinceWatermark: window.windowStart.toISOString(),
        logger: defaultLogger,
      });
      discoveredItems = discoveryPage?.items || [];
    }


    let itemsCreated = 0;

    for (const item of discoveredItems) {
      if (!item.url || !item.title) continue;

      const canonicalUrl = canonicalizeUrl(item.url);
      const canonicalUrlHash = hashCanonicalUrl(canonicalUrl);
      const externalId = item.externalId ? String(item.externalId).trim() : null;
      const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;

      let sourceItem;
      if (externalId) {
        sourceItem = await prisma.sourceItem.upsert({
          where: {
            contentSourceId_externalId: {
              contentSourceId: contentSource.id,
              externalId,
            },
          },
          create: {
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
          update: {
            canonicalUrl,
            canonicalUrlHash,
            title: item.title,
            summary: item.summary || undefined,
            publishedAt: publishedAt || undefined,
          },
        });
      } else {
        sourceItem = await prisma.sourceItem.upsert({
          where: {
            contentSourceId_canonicalUrlHash: {
              contentSourceId: contentSource.id,
              canonicalUrlHash,
            },
          },
          create: {
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
          update: {
            title: item.title,
            summary: item.summary || undefined,
            publishedAt: publishedAt || undefined,
          },
        });
      }

      if (sourceItem) {
        itemsCreated++;
        await enqueueJob(JobNames.SOURCE_DETAIL, {
          sourceItemId: sourceItem.id,
          contentSourceId: contentSource.id,
        });
      }
    }

    // Mark window completed
    await prisma.backfillWindow.update({
      where: { id: window.id },
      data: {
        status: "COMPLETED",
        itemsFound: itemsCreated,
        completedAt: new Date(),
        lastError: null,
      },
    });

    // Update parent BackfillRun progress
    const remainingPending = await prisma.backfillWindow.count({
      where: {
        backfillRunId: window.backfillRunId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    const completedWindowsCount = await prisma.backfillWindow.count({
      where: {
        backfillRunId: window.backfillRunId,
        status: "COMPLETED",
      },
    });

    const failedWindowsCount = await prisma.backfillWindow.count({
      where: {
        backfillRunId: window.backfillRunId,
        status: "FAILED",
      },
    });

    await prisma.backfillRun.update({
      where: { id: window.backfillRunId },
      data: {
        completedWindows: completedWindowsCount,
        failedWindows: failedWindowsCount,
        status: remainingPending === 0 ? "COMPLETED" : "RUNNING",
        finishedAt: remainingPending === 0 ? new Date() : null,
      },
    });

    return {
      status: "COMPLETED",
      windowId: window.id,
      itemsFound: itemsCreated,
    };
  } catch (error) {
    await prisma.backfillWindow.update({
      where: { id: window.id },
      data: {
        status: "FAILED",
        lastError: error.message,
      },
    });

    await prisma.backfillRun.update({
      where: { id: window.backfillRunId },
      data: {
        failedWindows: { increment: 1 },
      },
    });

    throw error;
  }
}
