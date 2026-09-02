import { processBackfillWindow } from "../../modules/ingestion/services/backfill.service.js";
import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Worker job handler for backfill window execution.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.backfillWindowId
 * @param {string} [job.data.backfillRunId]
 * @returns {Promise<object>}
 */
export async function handleBackfillJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.BACKFILL_WINDOW}] Executing backfill window: ${payload.backfillWindowId}`);

  if (!payload.backfillWindowId) {
    throw new Error("Missing required backfillWindowId in backfill job payload.");
  }

  const result = await processBackfillWindow({
    backfillWindowId: payload.backfillWindowId,
  });

  return {
    jobName: JobNames.BACKFILL_WINDOW,
    backfillWindowId: payload.backfillWindowId,
    ...result,
  };
}
