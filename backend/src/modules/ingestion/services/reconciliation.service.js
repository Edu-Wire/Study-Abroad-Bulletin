import { prisma } from "../../../config/prisma.js";
import { enqueueJob, JobNames } from "../../../worker/boss.js";

/**
 * Executes a reconciliation run for a source, repairing failed windows and stuck items.
 *
 * @param {object} params
 * @param {string} params.contentSourceId Database ID of the ContentSource
 * @param {Date|string} [params.periodStart]
 * @param {Date|string} [params.periodEnd]
 * @returns {Promise<object>}
 */
export async function processReconciliation({ contentSourceId, periodStart, periodEnd }) {
  const contentSource = await prisma.contentSource.findUnique({
    where: { id: contentSourceId },
    include: { syncState: true },
  });

  if (!contentSource) {
    throw new Error(`ContentSource "${contentSourceId}" not found.`);
  }

  let reEnqueuedWindows = 0;
  let reEnqueuedDetails = 0;

  // 1. Retry failed BackfillWindows for this source
  const failedWindows = await prisma.backfillWindow.findMany({
    where: {
      backfillRun: { contentSourceId },
      status: "FAILED",
      attempts: { lt: 5 },
    },
    take: 20,
  });

  for (const win of failedWindows) {
    await prisma.backfillWindow.update({
      where: { id: win.id },
      data: { status: "PENDING" },
    });
    await enqueueJob(JobNames.BACKFILL_WINDOW, {
      backfillWindowId: win.id,
      backfillRunId: win.backfillRunId,
    });
    reEnqueuedWindows++;
  }

  // 2. Retry stuck DETAIL_PENDING items discovered more than 10 minutes ago
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const stuckItems = await prisma.sourceItem.findMany({
    where: {
      contentSourceId,
      processingStatus: "DETAIL_PENDING",
      discoveredAt: { lt: tenMinutesAgo },
    },
    take: 50,
  });

  for (const item of stuckItems) {
    await enqueueJob(JobNames.SOURCE_DETAIL, {
      sourceItemId: item.id,
      contentSourceId,
    });
    reEnqueuedDetails++;
  }

  return {
    contentSourceId,
    sourceCode: contentSource.code,
    reEnqueuedWindows,
    reEnqueuedDetails,
    healthStatus: contentSource.syncState?.healthStatus || "HEALTHY",
  };
}
