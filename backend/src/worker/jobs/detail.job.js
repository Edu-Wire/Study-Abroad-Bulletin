import { processDetail } from "../../modules/ingestion/services/detail.service.js";
import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Worker job handler for source item detail extraction and versioning.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.sourceItemId
 * @param {string} [job.data.contentSourceId]
 * @returns {Promise<object>}
 */
export async function handleDetailJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.SOURCE_DETAIL}] Fetching detail for item: ${payload.sourceItemId}`);

  if (!payload.sourceItemId) {
    throw new Error("Missing required sourceItemId in detail job payload.");
  }

  const result = await processDetail({
    sourceItemId: payload.sourceItemId,
    contentSourceId: payload.contentSourceId,
  });

  return {
    jobName: JobNames.SOURCE_DETAIL,
    sourceItemId: payload.sourceItemId,
    ...result,
  };
}
