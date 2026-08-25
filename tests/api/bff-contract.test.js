/**
 * Static contract checks on the BFF route and the frontend API clients.
 *
 * These assert the security-relevant properties of the source itself, so a
 * regression that reintroduces a public backend URL, a browser-readable token,
 * or an unguarded mutation fails the suite rather than shipping.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");

const read = (relative) =>
  readFileSync(path.join(repoRoot, relative), "utf8");

/**
 * Strip comments so these assertions test code rather than prose. Files here
 * deliberately *describe* the headers and roles they do not use, which would
 * otherwise trip the very checks meant to catch real usage.
 */
const readCode = (relative) =>
  read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

const ROUTE = "src/app/api/backend/[...path]/route.ts";

// ---------------------------------------------------------------------------
// BFF route
// ---------------------------------------------------------------------------

test("the BFF gates every state-changing method on origin", () => {
  const source = read(ROUTE);

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.ok(
      source.includes(`"${method}"`),
      `${method} must appear in STATE_CHANGING_METHODS`
    );
  }
  assert.match(
    source,
    /STATE_CHANGING_METHODS\.has\(request\.method\)\s*&&\s*!originIsTrusted\(request\)/,
    "state-changing requests must be origin-checked before forwarding"
  );
});

test("the BFF attaches the shared secret and forwards the cookie", () => {
  const source = read(ROUTE);
  assert.match(source, /headers\.set\("x-bff-secret", sharedSecret\)/);
  assert.match(source, /headers\.set\("cookie", cookie\)/);
});

test("the BFF never forwards a client-supplied authorization or bff secret", () => {
  const source = read(ROUTE);
  const allowlist = source.match(
    /const FORWARDABLE_REQUEST_HEADERS = \[([\s\S]*?)\]/
  );
  assert.ok(allowlist, "expected an explicit request header allowlist");

  const entries = allowlist[1].toLowerCase();
  assert.ok(!entries.includes("authorization"), "authorization must not be relayed");
  assert.ok(!entries.includes("x-bff-secret"), "the BFF sets this header itself");
  assert.ok(!entries.includes("host"), "host must not be relayed");
});

test("the BFF relays multiple Set-Cookie headers correctly", () => {
  const source = read(ROUTE);
  // A plain .get("set-cookie") collapses multiple cookies into one string.
  assert.match(
    source,
    /getSetCookie/,
    "must use getSetCookie so login/logout cookies survive"
  );
  assert.match(source, /responseHeaders\.append\("set-cookie", value\)/);
});

test("the BFF rejects path traversal", () => {
  const source = read(ROUTE);
  assert.match(source, /segment === "\.\."/);
});

test("the BFF is never cached", () => {
  const source = read(ROUTE);
  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /cache: "no-store"/);
});

// ---------------------------------------------------------------------------
// No public backend URL anywhere in browser-reachable source
// ---------------------------------------------------------------------------

/** Every .ts/.tsx file under src, excluding server-only modules. */
function collectSourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

test("no source file references NEXT_PUBLIC_API_URL", () => {
  const offenders = [];
  for (const file of collectSourceFiles(path.join(repoRoot, "src"))) {
    if (readFileSync(file, "utf8").includes("NEXT_PUBLIC_API_URL")) {
      offenders.push(path.relative(repoRoot, file));
    }
  }
  assert.deepEqual(offenders, [], "NEXT_PUBLIC_API_URL must not be reintroduced");
});

test("no client source hardcodes a backend host", () => {
  const offenders = [];
  for (const file of collectSourceFiles(path.join(repoRoot, "src"))) {
    const source = readFileSync(file, "utf8");
    const relative = path.relative(repoRoot, file).replace(/\\/g, "/");

    // Server-only modules legitimately read BACKEND_URL from the environment.
    if (relative.startsWith("src/lib/server/")) continue;

    if (/localhost:8000|127\.0\.0\.1:8000|http:\/\/\d+\.\d+\.\d+\.\d+/.test(source)) {
      offenders.push(relative);
    }
  }
  assert.deepEqual(offenders, [], "browser code must not name a backend host");
});

test("no source stores auth state in localStorage or a readable cookie", () => {
  const offenders = [];
  for (const file of collectSourceFiles(path.join(repoRoot, "src"))) {
    const source = readFileSync(file, "utf8");
    const relative = path.relative(repoRoot, file).replace(/\\/g, "/");

    // Strip line comments so explanatory prose does not trip the check.
    const code = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
      .join("\n");

    if (/localStorage\.(set|get)Item\s*\(\s*["']authUser/.test(code)) {
      offenders.push(`${relative}: authUser in localStorage`);
    }
    if (/document\.cookie\s*=/.test(code)) {
      offenders.push(`${relative}: writes document.cookie`);
    }
    if (/document\.cookie\.(match|includes)/.test(code)) {
      offenders.push(`${relative}: reads document.cookie`);
    }
  }
  assert.deepEqual(offenders, [], "auth state must not be browser-readable");
});

// ---------------------------------------------------------------------------
// API clients use the same-origin BFF
// ---------------------------------------------------------------------------

test("API clients target only /api/backend", () => {
  for (const client of [
    "src/lib/api/apiClient.ts",
    "src/lib/api/auth.ts",
    "src/lib/api/student.ts",
  ]) {
    const source = read(client);
    assert.match(
      source,
      /["']\/api\/backend["']/,
      `${client} must use the relative BFF base path`
    );
    assert.ok(
      !source.includes("process.env.NEXT_PUBLIC"),
      `${client} must not read a public env var`
    );
  }
});

test("the API client sends no Authorization header", () => {
  const source = readCode("src/lib/api/apiClient.ts");
  assert.ok(
    !/Authorization/i.test(source),
    "there is no browser-readable token to send"
  );
});

// ---------------------------------------------------------------------------
// Proxy is optimistic only
// ---------------------------------------------------------------------------

test("the proxy makes no authorization decision", () => {
  const source = readCode("src/proxy.ts");

  assert.ok(!/jwt|verifyJwt|crypto\.subtle/i.test(source),
    "the proxy must not verify tokens; the cookie is opaque");
  assert.ok(!/\bfetch\s*\(/.test(source),
    "the proxy must not call the backend");
  assert.ok(!/ALLOWED_ADMIN_ROLES|\brole\b/.test(source),
    "the proxy must not inspect roles");
  assert.match(source, /cookies\.get\(SESSION_COOKIE_NAME\)/,
    "the proxy checks only for cookie presence");
});

test("the admin layout performs the authoritative role check", () => {
  const source = read("src/app/admin/layout.tsx");
  assert.match(source, /getSessionUser\(\)/);
  assert.match(source, /isAdminRole\(user\.role\)/);
  assert.match(source, /redirect\(/);
});

test("admin roles are exactly EDITOR, ADMIN, SUPER_ADMIN", () => {
  const source = read("src/lib/server/session.ts");
  const match = source.match(/ADMIN_ROLES[^=]*=\s*\[([^\]]*)\]/);
  assert.ok(match, "expected an ADMIN_ROLES allowlist");

  const roles = match[1]
    .split(",")
    .map((r) => r.trim().replace(/['"]/g, ""))
    .filter(Boolean);

  assert.deepEqual(roles.sort(), ["ADMIN", "EDITOR", "SUPER_ADMIN"]);
  assert.ok(!roles.includes("STUDENT"), "a student must never be an admin role");
});

test("server-only modules are marked server-only", () => {
  for (const module of ["src/lib/server/backendConfig.ts", "src/lib/server/session.ts"]) {
    assert.match(
      read(module),
      /import "server-only"/,
      `${module} must be unimportable from a Client Component`
    );
  }
});
