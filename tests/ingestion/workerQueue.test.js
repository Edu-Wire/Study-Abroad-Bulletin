import test from "node:test";
import assert from "node:assert/strict";
import { handleDiscoverJob } from "../../backend/src/worker/jobs/discover.job.js";
import { handleDetailJob } from "../../backend/src/worker/jobs/detail.job.js";
import { handleClassifyJob } from "../../backend/src/worker/jobs/classify.job.js";
import { handleDraftJob } from "../../backend/src/worker/jobs/draft.job.js";
import { handleBackfillJob } from "../../backend/src/worker/jobs/backfill.job.js";
import { handleReconcileJob } from "../../backend/src/worker/jobs/reconcile.job.js";
import { JobNames } from "../../backend/src/modules/ingestion/types.js";

test("Worker Job Handlers: discover stub resolves cleanly", async () => {
  const result = await handleDiscoverJob({
    id: "job-1",
    data: { contentSourceId: "src-ca-ircc", mode: "LIVE" },
  });
  assert.equal(result.status, "COMPLETED_STUB");
  assert.equal(result.jobName, JobNames.SOURCE_DISCOVER);
  assert.equal(result.contentSourceId, "src-ca-ircc");
});

test("Worker Job Handlers: detail stub resolves cleanly", async () => {
  const result = await handleDetailJob({
    id: "job-2",
    data: { sourceItemId: "item-123", url: "https://canada.ca/news/update" },
  });
  assert.equal(result.status, "COMPLETED_STUB");
  assert.equal(result.jobName, JobNames.SOURCE_DETAIL);
  assert.equal(result.sourceItemId, "item-123");
});

test("Worker Job Handlers: classify stub resolves cleanly", async () => {
  const result = await handleClassifyJob({
    id: "job-3",
    data: { sourceItemId: "item-123", versionId: "ver-1" },
  });
  assert.equal(result.status, "COMPLETED_STUB");
  assert.equal(result.jobName, JobNames.SOURCE_CLASSIFY);
  assert.equal(result.sourceItemId, "item-123");
});

test("Worker Job Handlers: draft stub resolves cleanly", async () => {
  const result = await handleDraftJob({
    id: "job-4",
    data: { candidateId: "cand-456", sourceItemId: "item-123" },
  });
  assert.equal(result.status, "COMPLETED_STUB");
  assert.equal(result.jobName, JobNames.CANDIDATE_DRAFT);
  assert.equal(result.candidateId, "cand-456");
});

test("Worker Job Handlers: backfill window stub resolves cleanly", async () => {
  const result = await handleBackfillJob({
    id: "job-5",
    data: { backfillWindowId: "win-789", backfillRunId: "run-99" },
  });
  assert.equal(result.status, "COMPLETED_STUB");
  assert.equal(result.jobName, JobNames.BACKFILL_WINDOW);
  assert.equal(result.backfillWindowId, "win-789");
});

test("Worker Job Handlers: reconcile stub resolves cleanly", async () => {
  const result = await handleReconcileJob({
    id: "job-6",
    data: { contentSourceId: "src-govuk", periodStart: "2026-08-01", periodEnd: "2026-08-31" },
  });
  assert.equal(result.status, "COMPLETED_STUB");
  assert.equal(result.jobName, JobNames.SOURCE_RECONCILE);
  assert.equal(result.contentSourceId, "src-govuk");
});
