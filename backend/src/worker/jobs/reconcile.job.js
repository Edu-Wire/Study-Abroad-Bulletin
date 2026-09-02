import { processReconciliation } from "../../modules/ingestion/services/reconciliation.service.js";
import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Worker job handler for source reconciliation and missed window repair.
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
  console.log(`[Job: ${JobNames.SOURCE_RECONCILE}] Reconciling source: ${payload.contentSourceId}`);

  if (!payload.contentSourceId) {
    throw new Error("Missing required contentSourceId in reconcile job payload.");
  }

  const result = await processReconciliation({
    contentSourceId: payload.contentSourceId,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
  });

  return {
    jobName: JobNames.SOURCE_RECONCILE,
    contentSourceId: payload.contentSourceId,
    ...result,
  };
}
