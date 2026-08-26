/**
 * Guided database rollout.
 *
 * Runs the plan's rollout order and STOPS rather than improvising whenever
 * something needs a human decision — duplicate data in particular.
 *
 *   node scripts/rollout.mjs            # preflight + report, applies nothing
 *   node scripts/rollout.mjs --apply    # also applies migrations
 *
 * Nothing here deletes or edits data. `--apply` runs `prisma migrate deploy`,
 * which is forward-only; the corrective migration aborts by itself if
 * duplicates exist.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");

function heading(text) {
  console.log(`\n${"=".repeat(68)}\n${text}\n${"=".repeat(68)}`);
}

function run(command, args, { allowFailure = false } = {}) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  try {
    const out = execFileSync(command, args, {
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (out.trim()) console.log(out.trim());
    return { ok: true, out };
  } catch (error) {
    const out = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    if (out) console.log(out);
    if (!allowFailure) {
      console.error(`\n✖ Command failed: ${command} ${args.join(" ")}`);
      process.exit(1);
    }
    return { ok: false, out };
  }
}

const node = process.execPath;
const prismaBin = path.join("node_modules", "prisma", "build", "index.js");
const tsxBin = path.join("node_modules", "tsx", "dist", "cli.mjs");

// ---------------------------------------------------------------------------
// 0. Environment
// ---------------------------------------------------------------------------

heading("0. Environment check");

if (!existsSync(".env")) {
  console.error(
    "✖ No .env file found.\n\n" +
      "  Create one with at least:\n" +
      "    DATABASE_URL=postgresql://user:pass@host:5432/dbname\n" +
      "    SESSION_HASH_SECRET=<32+ random chars>\n" +
      "    BFF_SHARED_SECRET=<32+ random chars>\n\n" +
      "  .env is gitignored and must never be committed."
  );
  process.exit(1);
}

// Loaded the same way the app loads it, so this validates the real file.
process.loadEnvFile(".env");

const missing = ["DATABASE_URL", "SESSION_HASH_SECRET", "BFF_SHARED_SECRET"].filter(
  (name) => !process.env[name]?.trim()
);
if (missing.length > 0) {
  console.error(`✖ .env is missing: ${missing.join(", ")}`);
  process.exit(1);
}

for (const name of ["SESSION_HASH_SECRET", "BFF_SHARED_SECRET"]) {
  if (process.env[name].trim().length < 32) {
    console.error(`✖ ${name} must be at least 32 characters (the server refuses to start otherwise).`);
    process.exit(1);
  }
}

const url = process.env.DATABASE_URL.trim();
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error(
    `✖ DATABASE_URL is not a PostgreSQL URL.\n` +
      `  Found protocol: ${url.split(":")[0]}:\n\n` +
      "  This project requires PostgreSQL. Prisma has no migration engine for\n" +
      "  MongoDB, so the session and unique-constraint migrations cannot apply."
  );
  process.exit(1);
}

// Never print credentials.
console.log(`✓ .env present; DATABASE_URL host: ${(() => {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable)";
  }
})()}`);
console.log("✓ Secrets present and long enough");

// ---------------------------------------------------------------------------
// 1. Schema and client
// ---------------------------------------------------------------------------

heading("1. Prisma schema and client");
run(node, [prismaBin, "validate"]);
run(node, [prismaBin, "generate"]);

// ---------------------------------------------------------------------------
// 2. Connectivity + pending migrations
// ---------------------------------------------------------------------------

heading("2. Database connectivity and migration status");
const status = run(node, [prismaBin, "migrate", "status"], { allowFailure: true });

if (/P1001|Can't reach database server/i.test(status.out)) {
  console.error(
    "\n✖ Cannot reach the database.\n" +
      "  Check the host, port, credentials, and any IP allowlist on the provider."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Duplicate preflight — READ ONLY
// ---------------------------------------------------------------------------

heading("3. Duplicate preflight (read-only)");
console.log(
  "The corrective migration adds unique indexes on Article.sourceUrl and\n" +
    "UniversityIntake(universityId, term). It ABORTS if duplicates exist and\n" +
    "never deletes rows. This step only reports them."
);

const preflight = run(node, [tsxBin, "prisma/preflight-duplicates.ts"], {
  allowFailure: true,
});

const hasDuplicates =
  !preflight.ok || /duplicate group\(s\) found/i.test(preflight.out);

if (hasDuplicates) {
  heading("STOPPED: duplicate data needs a human decision");
  console.error(
    "Duplicates were reported above.\n\n" +
      "Resolving them means choosing which row survives, which is a data-loss\n" +
      "decision this script will not make for you. For each group:\n\n" +
      "  1. Inspect the rows listed above.\n" +
      "  2. Decide which to keep (usually the earliest, or the one referenced\n" +
      "     elsewhere).\n" +
      "  3. Merge or remove the rest deliberately, with a backup in place.\n" +
      "  4. Re-run this script.\n\n" +
      "Migrations were NOT applied."
  );
  process.exit(2);
}

console.log("\n✓ No duplicates. The corrective migration can apply safely.");

// ---------------------------------------------------------------------------
// 4. Apply migrations
// ---------------------------------------------------------------------------

if (!APPLY) {
  heading("Dry run complete — nothing was applied");
  console.log(
    "Everything checks out. To apply the migrations:\n\n" +
      "  node scripts/rollout.mjs --apply\n\n" +
      "Take a database backup first."
  );
  process.exit(0);
}

heading("4. Applying migrations");
run(node, [prismaBin, "migrate", "deploy"]);
run(node, [prismaBin, "generate"]);

// ---------------------------------------------------------------------------
// 5. Verify
// ---------------------------------------------------------------------------

heading("5. Verification");
run(node, [prismaBin, "migrate", "status"], { allowFailure: true });

console.log(
  "\nNext: run the full suite. The two DB-gated suites should now execute\n" +
    "instead of skipping:\n\n  npm test\n"
);

heading("Rollout complete");
console.log(
  "Still outstanding, deliberately not automated:\n" +
    "  - Rotate the legacy JWT_SECRET (and remove it from the environment).\n" +
    "  - Set TRUSTED_PROXY_HOP_COUNT from your verified proxy topology.\n" +
    "  - Remove backend/src/config/jwt.js and the jsonwebtoken dependency.\n"
);
