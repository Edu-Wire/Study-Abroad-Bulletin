/**
 * Lint baseline gate.
 *
 * `eslint` exits 0 with warnings, so warning count can creep upward unnoticed.
 * This compares the current count against a committed baseline and fails when
 * it grows, which is what makes "no new lint issues" actually enforced rather
 * than aspirational.
 *
 *   node scripts/lint-baseline.mjs           # check against the baseline
 *   node scripts/lint-baseline.mjs --update  # record the current counts
 *
 * Errors are always a failure regardless of the baseline; eslint itself gates
 * those. The baseline exists to ratchet warnings down over time.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const BASELINE_PATH = path.join(process.cwd(), ".lint-baseline.json");
const shouldUpdate = process.argv.includes("--update");

function runEslint() {
  let raw;
  try {
    // Invoke eslint's own entry point with the current node binary. No shell,
    // so there is no deprecation warning and no argument-injection surface,
    // and no dependence on how npx resolves on this platform.
    raw = execFileSync(
      process.execPath,
      [path.join("node_modules", "eslint", "bin", "eslint.js"), "--format", "json"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
  } catch (error) {
    // eslint exits non-zero when there are errors, but still prints JSON.
    raw = error.stdout ?? "";
  }

  const start = raw.indexOf("[");
  if (start === -1) {
    console.error("Could not parse eslint JSON output.");
    process.exit(1);
  }

  return JSON.parse(raw.slice(start));
}

const results = runEslint();

let errors = 0;
const warningsByRule = {};

for (const file of results) {
  for (const message of file.messages) {
    if (message.severity === 2) {
      errors += 1;
    } else if (message.severity === 1) {
      const rule = message.ruleId ?? "(no rule)";
      warningsByRule[rule] = (warningsByRule[rule] ?? 0) + 1;
    }
  }
}

const totalWarnings = Object.values(warningsByRule).reduce((a, b) => a + b, 0);

if (shouldUpdate) {
  const sorted = Object.fromEntries(
    Object.entries(warningsByRule).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ totalWarnings, warningsByRule: sorted }, null, 2)}\n`
  );
  console.log(
    `Recorded baseline: ${totalWarnings} warning(s) across ${Object.keys(sorted).length} rule(s).`
  );
  process.exit(0);
}

if (errors > 0) {
  console.error(`✖ ${errors} lint error(s). Errors are never baselined.`);
  process.exit(1);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(
    `No baseline at ${BASELINE_PATH}. Run: node scripts/lint-baseline.mjs --update`
  );
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

const regressions = [];
for (const [rule, count] of Object.entries(warningsByRule)) {
  const allowed = baseline.warningsByRule?.[rule] ?? 0;
  if (count > allowed) {
    regressions.push(`  ${rule}: ${count} (baseline ${allowed})`);
  }
}

if (regressions.length > 0) {
  console.error("✖ New lint warnings introduced:\n" + regressions.join("\n"));
  console.error(
    "\nFix them, or if they are unavoidable, update the baseline deliberately:\n" +
      "  node scripts/lint-baseline.mjs --update"
  );
  process.exit(1);
}

if (totalWarnings < baseline.totalWarnings) {
  console.log(
    `✓ Lint warnings reduced: ${totalWarnings} (baseline ${baseline.totalWarnings}). ` +
      "Run with --update to lock in the improvement."
  );
} else {
  console.log(`✓ No new lint warnings (${totalWarnings}, baseline ${baseline.totalWarnings}).`);
}
