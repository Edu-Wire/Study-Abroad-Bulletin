/**
 * `npm run verify:editorial`
 *
 * Runs the four Day-3 B2 cases through the live editorial pipeline and prints
 * what each one decided and why. Exits non-zero if any case missed its expected
 * routing decision or landed on a forbidden category.
 *
 * The same cases run as assertions in `__tests__/editorial.test.ts`. This CLI
 * exists because the interesting output during a review is not "pass", it is
 * the scores and the one-line explanation that produced the lane.
 */

import { runAllEditorialCases } from "./editorialCases";

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

async function main(): Promise<void> {
  const results = await runAllEditorialCases();

  console.log("\nDay-3 B2 — Editorial validation\n");
  console.log(
    `${pad("CASE", 26)}${pad("SOURCE", 26)}${pad("EXPECTED", 16)}${pad("DECISION", 14)}${pad("LANE", 22)}${pad("CATEGORY", 24)}CMS`
  );
  console.log("-".repeat(140));

  for (const result of results) {
    console.log(
      pad(result.case.title, 26) +
        pad(result.case.sourceCode, 26) +
        pad(result.case.expectedDecisions.join("/"), 16) +
        pad(result.decision, 14) +
        pad(result.route, 22) +
        pad(result.primaryCategory ?? "—", 24) +
        (result.cmsCategory ?? "— (editor selects)")
    );
    console.log(
      `${" ".repeat(26)}relevance ${result.relevance}/100 · confidence ${result.confidence ?? "n/a"}/100 · prefilter ${result.prefilterVerdict}`
    );
    console.log(`${" ".repeat(26)}${result.explanation}`);
    if (result.prefilterVerdict === "HARD_EXCLUDE") {
      console.log(`${" ".repeat(26)}prefilter: ${result.prefilterReason}`);
    }
    for (const failure of result.failures) {
      console.log(`${" ".repeat(26)}✗ ${failure}`);
    }
    console.log("");
  }

  const failed = results.filter((result) => !result.passed);
  if (failed.length > 0) {
    console.error(`✗ ${failed.length} of ${results.length} editorial cases failed`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ all ${results.length} editorial cases routed as specified`);
  console.log("✓ no case reached the CMS under a scholarship label it did not earn");
}

void main();
