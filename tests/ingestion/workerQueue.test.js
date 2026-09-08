import test from "node:test";
import assert from "node:assert/strict";
import { handleDiscoverJob } from "../../backend/src/worker/jobs/discover.job.js";
import { handleDetailJob } from "../../backend/src/worker/jobs/detail.job.js";
import { handleClassifyJob } from "../../backend/src/worker/jobs/classify.job.js";
import { handleDraftJob } from "../../backend/src/worker/jobs/draft.job.js";
import { handleBackfillJob } from "../../backend/src/worker/jobs/backfill.job.js";
import { handleReconcileJob } from "../../backend/src/worker/jobs/reconcile.job.js";

test("Worker Job Handlers: discover throws on missing contentSourceId", async () => {
  await assert.rejects(
    () => handleDiscoverJob({ id: "job-1", data: {} }),
    /Missing required contentSourceId/
  );
});

test("Worker Job Handlers: detail throws on missing sourceItemId", async () => {
  await assert.rejects(
    () => handleDetailJob({ id: "job-2", data: {} }),
    /Missing required sourceItemId/
  );
});

test("Worker Job Handlers: classify throws on missing sourceItemId", async () => {
  await assert.rejects(
    () => handleClassifyJob({ id: "job-3", data: {} }),
    /Missing required sourceItemId/
  );
});

test("Worker Job Handlers: draft throws on missing candidateId", async () => {
  await assert.rejects(
    () => handleDraftJob({ id: "job-4", data: {} }),
    /Missing required candidateId/
  );
});

test("Worker Job Handlers: backfill window throws on missing backfillWindowId", async () => {
  await assert.rejects(
    () => handleBackfillJob({ id: "job-5", data: {} }),
    /Missing required backfillWindowId/
  );
});

test("Worker Job Handlers: reconcile throws on missing contentSourceId", async () => {
  await assert.rejects(
    () => handleReconcileJob({ id: "job-6", data: {} }),
    /Missing required contentSourceId/
  );
});
