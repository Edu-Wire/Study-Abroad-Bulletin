import { processDiscovery } from "../../modules/ingestion/services/discovery.service.js";
import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Worker job handler for source discovery.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.contentSourceId
 * @param {string} [job.data.runType]
 * @param {string} [job.data.runId]
 * @returns {Promise<object>}
 */
export async function handleDiscoverJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.SOURCE_DISCOVER}] Executing discovery for source: ${payload.contentSourceId}`);

  if (!payload.contentSourceId) {
    throw new Error("Missing required contentSourceId in discover job payload.");
  }

  const result = await processDiscovery({
    contentSourceId: payload.contentSourceId,
    runType: payload.runType || payload.mode || "LIVE",
    runId: payload.runId,
  });

  return {
    jobName: JobNames.SOURCE_DISCOVER,
    contentSourceId: payload.contentSourceId,
    ...result,
  };
}
