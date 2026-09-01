/**
 * Rate limiting: configuration, live 429 behaviour, and route coverage.
 */
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { readFileSync } from "node:fs";
import path from "node:path";

// The limiters key on the trusted-BFF client address, so importing them pulls
// in the session config, which fails fast on a weak secret. Set test values
// before that import runs.
process.env.SESSION_HASH_SECRET =
  process.env.SESSION_HASH_SECRET ?? "test-session-hash-secret-".padEnd(48, "x");
process.env.BFF_SHARED_SECRET =
  process.env.BFF_SHARED_SECRET ?? "test-bff-shared-secret-".padEnd(48, "y");

const { authLimiter, adminMutationLimiter, generalApiLimiter } = await import(
  "../../backend/src/middleware/rateLimiter.js"
);

const repoRoot = path.resolve(import.meta.dirname, "../..");
const serverSource = readFileSync(
  path.join(repoRoot, "backend/src/app.js"),
  "utf8"
);

// ---------------------------------------------------------------------------
// Live limiter behaviour
// ---------------------------------------------------------------------------

async function withServer(configure) {
  const app = express();
  // Deliberately NOT `app.set("trust proxy", true)`: production keeps it off,
  // and enabling it here would both model the wrong thing and trip
  // express-rate-limit's ERR_ERL_PERMISSIVE_TRUST_PROXY validator.
  configure(app);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    request: (p, init) => fetch(base + p, init),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("a limiter returns 429 once its ceiling is passed", async () => {
  // A dedicated limiter instance keeps this test independent of the shared
  // module-level stores used by the application.
  const { default: rateLimit } = await import("express-rate-limit");
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 3,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    statusCode: 429,
    message: { success: false, message: "Too many requests." },
  });

  const srv = await withServer((app) => {
    app.post("/t", limiter, (req, res) => res.json({ success: true }));
  });

  try {
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      const res = await srv.request("/t", { method: "POST" });
      statuses.push(res.status);
    }

    assert.deepEqual(
      statuses,
      [200, 200, 200, 429, 429],
      "the 4th request onwards must be rejected"
    );
  } finally {
    await srv.close();
  }
});

test("a 429 response carries a structured JSON body", async () => {
  const { default: rateLimit } = await import("express-rate-limit");
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 1,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    statusCode: 429,
    message: { success: false, message: "Too many requests." },
  });

  const srv = await withServer((app) => {
    app.post("/t", limiter, (req, res) => res.json({ success: true }));
  });

  try {
    await srv.request("/t", { method: "POST" });
    const res = await srv.request("/t", { method: "POST" });

    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /too many/i);
    assert.ok(res.headers.get("ratelimit-policy") || res.headers.get("ratelimit"),
      "draft-7 RateLimit headers should be present");
  } finally {
    await srv.close();
  }
});

// ---------------------------------------------------------------------------
// Limiter configuration
// ---------------------------------------------------------------------------

test("all three limiters are configured and distinct", () => {
  for (const limiter of [authLimiter, adminMutationLimiter, generalApiLimiter]) {
    assert.equal(typeof limiter, "function");
  }
  assert.notEqual(authLimiter, adminMutationLimiter);
  assert.notEqual(adminMutationLimiter, generalApiLimiter);
});

// ---------------------------------------------------------------------------
// Route coverage — every listed admin mutation must be limited
// ---------------------------------------------------------------------------

/**
 * Extract the middleware chain declared for a route, i.e. the text between the
 * route path and the handler function.
 */
function chainFor(method, routePath) {
  const pattern = new RegExp(
    `app\\.${method}\\(\\s*"${routePath.replace(/[/:]/g, (c) => "\\" + c)}"([\\s\\S]*?)async \\(req, res\\)`,
    "m"
  );
  const match = serverSource.match(pattern);
  return match ? match[1] : null;
}

const MUTATIONS_REQUIRING_LIMITER = [
  ["post", "/api/admin/articles"],
  ["put", "/api/admin/articles/:id"],
  ["patch", "/api/admin/articles/:id/status"],
  ["delete", "/api/admin/articles/:id"],
  ["post", "/api/admin/articles/import-rss"],
  ["post", "/api/admin/users/invite"],
  ["patch", "/api/admin/users/:id"],
  ["delete", "/api/admin/users/:id"],
];

test("every admin mutation applies adminMutationLimiter", () => {
  const missing = [];

  for (const [method, routePath] of MUTATIONS_REQUIRING_LIMITER) {
    const chain = chainFor(method, routePath);
    if (chain === null) {
      missing.push(`${method.toUpperCase()} ${routePath} (route not found)`);
      continue;
    }
    if (!chain.includes("adminMutationLimiter")) {
      missing.push(`${method.toUpperCase()} ${routePath}`);
    }
  }

  assert.deepEqual(missing, [], "these admin mutations are not rate limited");
});

test("password change is rate limited", () => {
  const chain = chainFor("post", "/api/password/change");
  assert.ok(chain, "expected a password change route");
  assert.ok(
    chain.includes("authLimiter") || chain.includes("adminMutationLimiter"),
    "password changes must be rate limited"
  );
});

test("login and signup remain rate limited", () => {
  for (const route of ["/api/login", "/api/signup"]) {
    const chain = chainFor("post", route);
    assert.ok(chain, `expected route ${route}`);
    assert.ok(
      chain.includes("authLimiter"),
      `${route} must keep its auth limiter`
    );
  }
});

test("a baseline limiter covers all API traffic", () => {
  assert.match(
    serverSource,
    /app\.use\("\/api", generalApiLimiter\)/,
    "generalApiLimiter should be mounted, not merely imported"
  );
});

// ---------------------------------------------------------------------------
// The BFF gate and session auth must precede everything
// ---------------------------------------------------------------------------

test("the BFF gate is registered before any route", () => {
  const gateIndex = serverSource.indexOf("app.use(requireBffSecret)");
  const firstRouteIndex = serverSource.search(/app\.(get|post|put|patch|delete)\(/);

  assert.ok(gateIndex > -1, "requireBffSecret must be mounted");
  assert.ok(
    gateIndex < firstRouteIndex,
    "the BFF gate must run before route handlers"
  );
});

test("no JWT signing or verification remains in the server", () => {
  assert.ok(
    !/jsonwebtoken|jwt\.sign|jwt\.verify/.test(serverSource),
    "the server must not issue or verify JWTs"
  );
});

test("no auth response returns a token in JSON", () => {
  // A bare `token,` or `token:` inside a res.json payload would leak it.
  const jsonPayloads = serverSource.match(/res\.status\(\d+\)\.json\(\{[\s\S]*?\}\);/g) ?? [];
  const offenders = jsonPayloads.filter((payload) =>
    /^\s*token[,:]/m.test(payload)
  );
  assert.deepEqual(offenders, [], "a session token must never appear in JSON");
});
