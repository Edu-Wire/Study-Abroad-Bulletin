/**
 * Phase 2 — role authorization and the BFF boundary.
 *
 * Exercises the real middleware with fake req/res objects, so no database or
 * listening server is required.
 */
import test from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_HASH_SECRET =
  process.env.SESSION_HASH_SECRET ?? "test-session-hash-secret-".padEnd(48, "x");
process.env.BFF_SHARED_SECRET =
  process.env.BFF_SHARED_SECRET ?? "test-bff-shared-secret-".padEnd(48, "y");

const { authorize, requirePasswordChanged, getCookie } = await import(
  "../../backend/src/middleware/auth.js"
);
const { requireBffSecret } = await import("../../backend/src/middleware/bff.js");

/** Minimal res double capturing status + JSON body. */
function makeRes() {
  return {
    statusCode: null,
    body: null,
    locals: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function run(middleware, req) {
  const res = makeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { res, nextCalled };
}

// ---------------------------------------------------------------------------
// authorize
// ---------------------------------------------------------------------------

test("unauthenticated requests are rejected with 401", () => {
  const { res, nextCalled } = run(authorize("EDITOR"), {});
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
});

test("a STUDENT cannot reach an EDITOR endpoint", () => {
  const { res, nextCalled } = run(authorize("EDITOR", "ADMIN", "SUPER_ADMIN"), {
    user: { role: "STUDENT" },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("a CONSULTANT cannot reach an EDITOR endpoint", () => {
  // CONSULTANT exists in the enum but holds no privileges; an unmapped role
  // must never fall through to allowed.
  const { res, nextCalled } = run(authorize("EDITOR", "ADMIN", "SUPER_ADMIN"), {
    user: { role: "CONSULTANT" },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("an unknown role is denied rather than defaulted", () => {
  const { res, nextCalled } = run(authorize("EDITOR"), {
    user: { role: "NOT_A_REAL_ROLE" },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("an EDITOR reaches an EDITOR endpoint", () => {
  const { nextCalled, res } = run(authorize("EDITOR", "ADMIN", "SUPER_ADMIN"), {
    user: { role: "EDITOR" },
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("privilege is hierarchical: ADMIN satisfies EDITOR", () => {
  const { nextCalled } = run(authorize("EDITOR", "ADMIN", "SUPER_ADMIN"), {
    user: { role: "ADMIN" },
  });
  assert.equal(nextCalled, true);
});

test("an EDITOR cannot reach an ADMIN endpoint", () => {
  const { res, nextCalled } = run(authorize("ADMIN", "SUPER_ADMIN"), {
    user: { role: "EDITOR" },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("an ADMIN cannot reach a SUPER_ADMIN endpoint", () => {
  const { res, nextCalled } = run(authorize("SUPER_ADMIN"), {
    user: { role: "ADMIN" },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("a SUPER_ADMIN reaches a SUPER_ADMIN endpoint", () => {
  const { nextCalled } = run(authorize("SUPER_ADMIN"), {
    user: { role: "SUPER_ADMIN" },
  });
  assert.equal(nextCalled, true);
});

// ---------------------------------------------------------------------------
// requirePasswordChanged
// ---------------------------------------------------------------------------

test("a user holding a temporary password is blocked", () => {
  const { res, nextCalled } = run(requirePasswordChanged, {
    user: { role: "ADMIN", mustChangePassword: true },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "PASSWORD_CHANGE_REQUIRED");
});

test("a user with a settled password proceeds", () => {
  const { nextCalled } = run(requirePasswordChanged, {
    user: { role: "ADMIN", mustChangePassword: false },
  });
  assert.equal(nextCalled, true);
});

// ---------------------------------------------------------------------------
// BFF boundary
// ---------------------------------------------------------------------------

test("a request without the BFF secret is refused", () => {
  const { res, nextCalled } = run(requireBffSecret, {
    path: "/api/admin/articles",
    headers: {},
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("a request with a wrong BFF secret is refused", () => {
  const { res, nextCalled } = run(requireBffSecret, {
    path: "/api/admin/articles",
    headers: { "x-bff-secret": "wrong-value-of-a-similar-length-here" },
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("a request with the correct BFF secret passes", () => {
  const { nextCalled } = run(requireBffSecret, {
    path: "/api/admin/articles",
    headers: { "x-bff-secret": process.env.BFF_SHARED_SECRET },
  });
  assert.equal(nextCalled, true);
});

test("health checks bypass the BFF secret", () => {
  const { nextCalled } = run(requireBffSecret, {
    path: "/api/health",
    headers: {},
  });
  assert.equal(nextCalled, true);
});

test("a secret of differing length is refused without throwing", () => {
  // timingSafeEqual throws on length mismatch; the implementation must digest
  // first so a short or long guess is a clean 403.
  for (const guess of ["", "a", "x".repeat(500)]) {
    const { res, nextCalled } = run(requireBffSecret, {
      path: "/api/admin/articles",
      headers: { "x-bff-secret": guess },
    });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  }
});

// ---------------------------------------------------------------------------
// cookie parsing
// ---------------------------------------------------------------------------

test("the host-prefixed cookie name is parsed correctly", () => {
  const req = {
    headers: {
      cookie: "other=1; __Host-abroad_session=abc123; another=2",
    },
  };
  assert.equal(getCookie(req, "__Host-abroad_session"), "abc123");
});

test("a missing cookie header yields null", () => {
  assert.equal(getCookie({ headers: {} }, "__Host-abroad_session"), null);
});

test("a similarly named cookie is not confused for the session cookie", () => {
  const req = {
    headers: { cookie: "prefix__Host-abroad_session=wrong; unrelated=1" },
  };
  // The value must come from the real cookie only, never a suffix match.
  assert.notEqual(getCookie(req, "__Host-abroad_session"), "wrong");
});
