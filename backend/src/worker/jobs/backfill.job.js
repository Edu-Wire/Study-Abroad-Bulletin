import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Stub handler for historical backfill window jobs.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.backfillWindowId
 * @param {string} [job.data.backfillRunId]
 * @returns {Promise<object>}
 */
export async function handleBackfillJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.BACKFILL_WINDOW}] Received backfill window job:`, {
    jobId: job?.id,
    backfillWindowId: payload.backfillWindowId,
    backfillRunId: payload.backfillRunId,
    timestamp: new Date().toISOString(),
  });

  return {
    status: "COMPLETED_STUB",
    jobName: JobNames.BACKFILL_WINDOW,
    backfillWindowId: payload.backfillWindowId,
  };
}
