import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Stub handler for AI classification and scoring jobs.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.sourceItemId
 * @param {string} [job.data.versionId]
 * @returns {Promise<object>}
 */
export async function handleClassifyJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.SOURCE_CLASSIFY}] Received classification job:`, {
    jobId: job?.id,
    sourceItemId: payload.sourceItemId,
    versionId: payload.versionId,
    timestamp: new Date().toISOString(),
  });

  return {
    status: "COMPLETED_STUB",
    jobName: JobNames.SOURCE_CLASSIFY,
    sourceItemId: payload.sourceItemId,
  };
}
