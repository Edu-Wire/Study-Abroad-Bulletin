import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Stub handler for auto-creating draft articles from candidate assessments.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.candidateId
 * @param {string} [job.data.sourceItemId]
 * @returns {Promise<object>}
 */
export async function handleDraftJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.CANDIDATE_DRAFT}] Received draft creation job:`, {
    jobId: job?.id,
    candidateId: payload.candidateId,
    sourceItemId: payload.sourceItemId,
    timestamp: new Date().toISOString(),
  });

  return {
    status: "COMPLETED_STUB",
    jobName: JobNames.CANDIDATE_DRAFT,
    candidateId: payload.candidateId,
  };
}
