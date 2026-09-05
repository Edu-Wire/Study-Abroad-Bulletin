/**
 * Day-3 B2 — the four deliberate editorial cases, as assertions.
 *
 * Run: `npx tsx --test backend/src/modules/ingestion/__tests__/*.test.ts`
 * or `npm run verify:editorial` for the same cases with their scores printed.
 *
 * The cases themselves live in `../validation/editorialCases` so the report CLI
 * and the test suite cannot drift into checking different things.
 */

process.env.AI_PROVIDER = "mock";

import assert from "node:assert/strict";
import { test } from "node:test";

import { EDITORIAL_CASES, runEditorialCase } from "../validation/editorialCases";

for (const testCase of EDITORIAL_CASES) {
  test(`B2: ${testCase.title.toLowerCase()} -> ${testCase.expectedDecisions.join(" or ")}`, async () => {
    const result = await runEditorialCase(testCase);

    assert.deepEqual(
      result.failures,
      [],
      `${testCase.rationale}\n  lane ${result.route}, relevance ${result.relevance}, confidence ${result.confidence}\n  ${result.explanation}`
    );
  });
}

test("B2: no editorial case reaches the CMS as a scholarship it did not earn", async () => {
  for (const testCase of EDITORIAL_CASES) {
    const result = await runEditorialCase(testCase);
    if (result.cmsCategory !== "SCHOLARSHIPS") continue;

    // The one legitimate route to the label: the assessment cleared both gates.
    assert.ok(
      result.primaryCategory === "SCHOLARSHIP",
      `${testCase.id} reached SCHOLARSHIPS from ${result.primaryCategory}`
    );
  }
});

test("B2: the auto-draft lane is never reached without the full source", async () => {
  for (const testCase of EDITORIAL_CASES) {
    if (testCase.detailStatus === "ENRICHED") continue;
    const result = await runEditorialCase(testCase);
    assert.notEqual(
      result.decision,
      "CREATE_DRAFT",
      `${testCase.id} drafted from a ${testCase.detailStatus} document`
    );
  }
});
