import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Stub handler for source discovery jobs.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.contentSourceId
 * @param {string} [job.data.runId]
 * @param {string} [job.data.mode]
 * @returns {Promise<object>}
 */
export async function handleDiscoverJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.SOURCE_DISCOVER}] Received discovery job:`, {
    jobId: job?.id,
    contentSourceId: payload.contentSourceId,
    mode: payload.mode || "LIVE",
    timestamp: new Date().toISOString(),
  });

  // Plumbing stub: real adapter discovery will be connected in Day 2
  return {
    status: "COMPLETED_STUB",
    jobName: JobNames.SOURCE_DISCOVER,
    contentSourceId: payload.contentSourceId,
    itemsDiscovered: 0,
  };
}
