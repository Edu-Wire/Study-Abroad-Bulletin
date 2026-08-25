/**
 * Seed safety and RSS duplicate handling.
 *
 * The static checks run everywhere. The double-run idempotency check needs a
 * database and skips without one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const seedSource = readFileSync(path.join(repoRoot, "prisma/seed.ts"), "utf8");

// ---------------------------------------------------------------------------
// Seed hygiene
// ---------------------------------------------------------------------------

test("the seed contains no schema-changing SQL", () => {
  // Schema changes belong in migrations, never in a seed.
  const forbidden = [
    /CREATE\s+TABLE/i,
    /ALTER\s+TABLE/i,
    /DROP\s+TABLE/i,
    /CREATE\s+(UNIQUE\s+)?INDEX/i,
    /\$executeRaw/,
    /\$executeRawUnsafe/,
  ];

  for (const pattern of forbidden) {
    assert.ok(
      !pattern.test(seedSource),
      `seed.ts must not contain ${pattern} — put it in a migration`
    );
  }
});

test("the seed writes only through idempotent upserts", () => {
  // A create() or createMany() would duplicate rows on a second run.
  const risky = seedSource.match(/prisma\.\w+\.(create|createMany|delete|deleteMany)\(/g);
  assert.equal(
    risky,
    null,
    `seed.ts should use upsert only, found: ${risky?.join(", ")}`
  );
});

test("university intakes are upserted on the composite key", () => {
  // This relies on @@unique([universityId, term]), which the corrective
  // migration adds; without it a second seed run duplicates intakes.
  assert.match(
    seedSource,
    /universityIntake\.upsert/,
    "intakes must be upserted, not created"
  );
  assert.match(
    seedSource,
    /universityId_term/,
    "the upsert must target the composite unique key"
  );
});

test("the seed hardcodes no production password", () => {
  // Development-only demo passwords are acceptable, but they must be gated
  // behind a non-production check.
  const hasDemoPasswords = /Editor@123456|Student@123456/.test(seedSource);
  if (hasDemoPasswords) {
    assert.match(
      seedSource,
      /!isProduction/,
      "demo credentials must be gated behind a non-production guard"
    );
  }

  assert.match(
    seedSource,
    /INITIAL_ADMIN_PASSWORD|SEED_ADMIN_PASSWORD/,
    "the admin password must come from the environment"
  );
});

test("production seeding requires an explicit admin password", () => {
  // In production the fallback must be empty, so no default password is set.
  assert.match(
    seedSource,
    /isProduction \? "" :/,
    "production must have no default admin password"
  );
});

// ---------------------------------------------------------------------------
// Migrations own the schema
// ---------------------------------------------------------------------------

test("the corrective unique constraints exist in a migration", () => {
  const migrationsDir = path.join(repoRoot, "prisma/migrations");
  const combined = readdirSync(migrationsDir)
    .filter((entry) => !entry.includes("."))
    .map((dir) => {
      try {
        return readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");

  assert.match(
    combined,
    /Article_sourceUrl_key/,
    "Article.sourceUrl unique index must exist in a migration"
  );
  assert.match(
    combined,
    /UniversityIntake_universityId_term_key/,
    "UniversityIntake composite unique index must exist in a migration"
  );
  assert.match(
    combined,
    /UserSession/,
    "the UserSession table must exist in a migration"
  );
});

test("the corrective migration refuses to delete duplicate data", () => {
  const file = path.join(
    repoRoot,
    "prisma/migrations/20260825110000_corrective_unique_constraints/migration.sql"
  );
  const sql = readFileSync(file, "utf8");

  assert.match(sql, /RAISE EXCEPTION/, "must abort rather than proceed silently");
  assert.ok(
    !/\bDELETE\s+FROM\b/i.test(sql),
    "a migration must never delete production rows to satisfy a constraint"
  );
});

test("a read-only duplicate preflight exists", () => {
  const preflight = readFileSync(
    path.join(repoRoot, "prisma/preflight-duplicates.ts"),
    "utf8"
  );

  assert.match(preflight, /HAVING COUNT\(\*\) > 1/);
  for (const mutation of [/\.delete\(/, /\.deleteMany\(/, /\.update\(/, /\$executeRaw/]) {
    assert.ok(
      !mutation.test(preflight),
      `the preflight must stay read-only, found ${mutation}`
    );
  }
});

// ---------------------------------------------------------------------------
// RSS duplicate handling
// ---------------------------------------------------------------------------

test("RSS import guards against duplicate source URLs", () => {
  const serverSource = readFileSync(
    path.join(repoRoot, "backend/src/server.js"),
    "utf8"
  );

  const importSection = serverSource.slice(
    serverSource.indexOf('"/api/admin/articles/import-rss"')
  );

  assert.match(
    importSection,
    /sourceUrl/,
    "the import path must consider sourceUrl"
  );
  // Either a pre-check or a unique-violation handler is required so a repeated
  // import does not create a second copy of the same article.
  assert.ok(
    /findFirst|findUnique|P2002/.test(importSection),
    "RSS import must detect an already-imported sourceUrl"
  );
});

// ---------------------------------------------------------------------------
// Live double-run idempotency
// ---------------------------------------------------------------------------

if (!process.env.DATABASE_URL) {
  test("seed runs twice without duplicating rows", {
    skip: "DATABASE_URL is not set",
  }, () => {});
} else {
  test("seed runs twice without duplicating rows", async () => {
    const { execFileSync } = await import("node:child_process");
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");

    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    try {
      const runSeed = () =>
        execFileSync("npx", ["prisma", "db", "seed"], {
          cwd: repoRoot,
          stdio: "pipe",
          shell: true,
        });

      runSeed();
      const first = {
        intakes: await prisma.universityIntake.count(),
        articles: await prisma.article.count(),
        universities: await prisma.university.count(),
      };

      runSeed();
      const second = {
        intakes: await prisma.universityIntake.count(),
        articles: await prisma.article.count(),
        universities: await prisma.university.count(),
      };

      assert.deepEqual(second, first, "a second seed run must not add rows");
    } finally {
      await prisma.$disconnect();
    }
  });
}
