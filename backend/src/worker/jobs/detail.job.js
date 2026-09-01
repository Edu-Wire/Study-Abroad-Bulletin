import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Stub handler for source detail enrichment jobs.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.sourceItemId
 * @param {string} [job.data.url]
 * @returns {Promise<object>}
 */
export async function handleDetailJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.SOURCE_DETAIL}] Received detail job:`, {
    jobId: job?.id,
    sourceItemId: payload.sourceItemId,
    url: payload.url,
    timestamp: new Date().toISOString(),
  });

  return {
    status: "COMPLETED_STUB",
    jobName: JobNames.SOURCE_DETAIL,
    sourceItemId: payload.sourceItemId,
  };
}
