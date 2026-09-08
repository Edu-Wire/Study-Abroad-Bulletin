/**
 * Day-3 B3 — every configured Phase 1 source answers all seven questions.
 *
 * Run: `npx tsx --test backend/src/modules/ingestion/__tests__/*.test.ts`
 * or `npm run verify:completeness` for the matrix and the generated report.
 *
 * This is the gate that stops a source being added to the registry with a
 * missing adapter method, an unrecorded Appendix A reference, or an identity
 * rule nobody defined.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { PHASE1_SOURCES } from "../config/sourceRegistry";
import { CHECK_LABELS, checkSource } from "../validation/sourceCompleteness";

for (const source of PHASE1_SOURCES) {
  test(`B3: ${source.code} is complete on all seven checks`, async () => {
    const result = await checkSource(source);

    const failures = CHECK_LABELS.filter(([key]) => result.checks[key].status === "FAIL").map(
      ([key, label]) => `${label}: ${result.checks[key].detail}`
    );

    assert.deepEqual(failures, [], `${source.code} (${source.adapter})`);
  });
}

test("B3: every source records an official reference or a justified exemption", async () => {
  for (const source of PHASE1_SOURCES) {
    const hasReference = source.provenance.references.length > 0;
    const justifiedExemption = source.provenance.appendixExempt && Boolean(source.provenance.note);

    assert.ok(
      hasReference || justifiedExemption,
      `${source.code} has neither an Appendix A reference nor a justified exemption`
    );
  }
});
