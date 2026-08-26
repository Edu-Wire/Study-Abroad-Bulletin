/**
 * Documentation and repository hygiene.
 *
 * Keeps credentials, provider-specific hosts, and retired configuration from
 * creeping back into the tracked docs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");

const DOCS = ["DEPLOYMENT-GUIDE.md", "README.md"].filter((file) =>
  existsSync(path.join(repoRoot, file))
);

function readDoc(file) {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

test("no document contains a known credential", () => {
  const offenders = [];
  // Passwords that previously shipped in the deployment guide.
  const knownPasswords = [
    "Admin@123456",
    "Editor@123456",
    "Student@123456",
    "studyabroadnews_secret_key_2026",
  ];

  for (const file of DOCS) {
    const content = readDoc(file);
    for (const password of knownPasswords) {
      if (content.includes(password)) {
        offenders.push(`${file}: ${password}`);
      }
    }
  }

  assert.deepEqual(offenders, [], "documentation must not carry credentials");
});

test("no document contains a hardcoded public backend IP", () => {
  const offenders = [];

  for (const file of DOCS) {
    const content = readDoc(file);
    // A bare IPv4 address, or the sslip.io style host that embeds one.
    const matches = content.match(/\b\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}\.sslip\.io\b/g) ?? [];
    const rawIps = (content.match(/\b(\d{1,3}\.){3}\d{1,3}\b/g) ?? []).filter(
      // 127.0.0.1 is a legitimate loopback reference in proxy config.
      (ip) => !ip.startsWith("127.0.0.1")
    );

    for (const hit of [...matches, ...rawIps]) {
      offenders.push(`${file}: ${hit}`);
    }
  }

  assert.deepEqual(offenders, [], "documentation must not name a backend IP");
});

test("no document instructs setting NEXT_PUBLIC_API_URL", () => {
  const offenders = [];

  for (const file of DOCS) {
    const content = readDoc(file);
    // A mention is allowed only as an explicit removal instruction.
    const lines = content
      .split("\n")
      .filter((line) => line.includes("NEXT_PUBLIC_API_URL"));

    for (const line of lines) {
      if (!/no longer used|Remove|removed|deprecated/i.test(line)) {
        offenders.push(`${file}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "NEXT_PUBLIC_API_URL may only appear as a removal instruction"
  );
});

test("the deployment guide documents the current secrets", () => {
  const guide = readDoc("DEPLOYMENT-GUIDE.md");

  for (const variable of [
    "BACKEND_URL",
    "BFF_SHARED_SECRET",
    "SESSION_HASH_SECRET",
    "DATABASE_URL",
  ]) {
    assert.match(guide, new RegExp(variable), `${variable} should be documented`);
  }
});

test("the deployment guide warns about the duplicate preflight", () => {
  const guide = readDoc("DEPLOYMENT-GUIDE.md");
  assert.match(guide, /db:preflight:duplicates/);
  assert.match(guide, /never deletes rows|aborts/i);
});

test("no .env file is tracked and env files are ignored", async () => {
  const gitignore = readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.env\*/m, ".env files must be git-ignored");

  // A local .env is expected and necessary — developers and deployments need
  // one. The security property is that git never TRACKS it, so check the index
  // rather than the filesystem.
  const { execFileSync } = await import("node:child_process");
  const tracked = execFileSync(
    "git",
    ["ls-files", "--", ".env", ".env.*", "*/.env", "*/.env.*"],
    { cwd: repoRoot, encoding: "utf8" }
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  assert.deepEqual(
    tracked,
    [],
    "a tracked .env would leak live secrets into the repository"
  );
});

test("package scripts cover the documented CI order", () => {
  const pkg = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );

  for (const script of [
    "typecheck",
    "lint",
    "test",
    "build",
    "db:generate",
    "db:validate",
    "db:migrate:deploy",
    "db:preflight:duplicates",
  ]) {
    assert.ok(pkg.scripts[script], `package.json must define "${script}"`);
  }
});

test("the CI workflow generates Prisma Client before typechecking", () => {
  const workflowPath = path.join(repoRoot, ".github/workflows/ci.yml");
  assert.ok(existsSync(workflowPath), "a CI workflow should exist");

  const workflow = readFileSync(workflowPath, "utf8");
  const generateAt = workflow.indexOf("prisma generate");
  const typecheckAt = workflow.indexOf("npm run typecheck");

  assert.ok(generateAt > -1, "CI must run prisma generate");
  assert.ok(typecheckAt > -1, "CI must run the typecheck");
  assert.ok(
    generateAt < typecheckAt,
    "prisma generate must precede typecheck, or the client types are missing"
  );
});

// ---------------------------------------------------------------------------
// Dependency advisories
// ---------------------------------------------------------------------------

test("the deepmerge-ts advisory is pinned forward, not fixed by downgrading Prisma", () => {
  const pkg = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );

  // npm's suggested remedy for GHSA-ggr8-5vv4-36mx is `prisma@6.12.0`, a major
  // downgrade. The plan forbids that, so the transitive dependency is pinned
  // to its patched release instead.
  assert.ok(
    pkg.overrides?.["deepmerge-ts"],
    "expected a deepmerge-ts override pinning the patched release"
  );
  assert.match(pkg.overrides["deepmerge-ts"], /^\^?8\./, "must resolve to >=8");

  assert.ok(
    pkg.overridesRationale?.["deepmerge-ts"],
    "an override needs a recorded reason and a removal condition"
  );

  // Prisma itself must stay on 7.x.
  const prismaRange = pkg.dependencies?.prisma ?? "";
  assert.match(
    prismaRange,
    /^\^?7\./,
    `Prisma must not be downgraded to satisfy an advisory (found "${prismaRange}")`
  );
});

// ---------------------------------------------------------------------------
// Legacy JWT removal
// ---------------------------------------------------------------------------

test("the jsonwebtoken dependency is gone", () => {
  const pkg = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );

  assert.ok(
    !pkg.dependencies?.jsonwebtoken,
    "jsonwebtoken must not be a production dependency"
  );
  assert.ok(
    !pkg.devDependencies?.jsonwebtoken,
    "jsonwebtoken must not be a dev dependency either"
  );
});

test("the legacy JWT config module is deleted", () => {
  assert.ok(
    !existsSync(path.join(repoRoot, "backend/src/config/jwt.js")),
    "backend/src/config/jwt.js was replaced by config/session.js"
  );
});

test("no source file references a JWT secret or signing call", () => {
  const roots = ["backend/src", "src/lib", "src/app", "prisma"];
  const offenders = [];

  const walk = (dir) => {
    const full = path.join(repoRoot, dir);
    if (!existsSync(full)) return;
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(rel);
      } else if (/\.(js|ts|tsx)$/.test(entry.name)) {
        const source = readFileSync(path.join(repoRoot, rel), "utf8");
        // Strip comments: the migration history is legitimately described.
        const code = source
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .split("\n")
          .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
          .join("\n");

        if (/\bJWT_SECRET\b|jwt\.sign|jwt\.verify|require\(["']jsonwebtoken|from ["']jsonwebtoken/.test(code)) {
          offenders.push(rel);
        }
      }
    }
  };

  roots.forEach((r) => walk(r));
  assert.deepEqual(offenders, [], "JWT support was removed and must not return");
});
