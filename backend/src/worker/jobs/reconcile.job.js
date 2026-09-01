import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Stub handler for source reconciliation jobs.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.contentSourceId
 * @param {string} [job.data.periodStart]
 * @param {string} [job.data.periodEnd]
 * @returns {Promise<object>}
 */
export async function handleReconcileJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.SOURCE_RECONCILE}] Received reconciliation job:`, {
    jobId: job?.id,
    contentSourceId: payload.contentSourceId,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    timestamp: new Date().toISOString(),
  });

  return {
    status: "COMPLETED_STUB",
    jobName: JobNames.SOURCE_RECONCILE,
    contentSourceId: payload.contentSourceId,
  };
}
