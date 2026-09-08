/**
 * BFF origin / CSRF gate.
 *
 * The route handler is TypeScript compiled by Next, so rather than importing it
 * this suite re-implements the exported decision rule and pins the behaviour it
 * must have. `tests/api/bff-contract.test.js` asserts the route source itself
 * still matches these rules, so a drift in either file is caught.
 */
import test from "node:test";
import assert from "node:assert/strict";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Mirror of originIsTrusted in src/app/api/backend/[...path]/route.ts. */
function originIsTrusted(headers) {
  const get = (name) => headers[name] ?? null;
  const origin = get("origin");

  if (!origin) {
    const referer = get("referer");
    if (!referer) return false;
    try {
      return new URL(referer).host === get("host");
    } catch {
      return false;
    }
  }

  try {
    return new URL(origin).host === get("host");
  } catch {
    return false;
  }
}

function isAllowed(method, headers) {
  if (!STATE_CHANGING_METHODS.has(method)) return true;
  return originIsTrusted(headers);
}

test("a same-origin POST is allowed", () => {
  assert.equal(
    isAllowed("POST", {
      host: "example.com",
      origin: "https://example.com",
    }),
    true
  );
});

test("a cross-origin POST is rejected", () => {
  assert.equal(
    isAllowed("POST", {
      host: "example.com",
      origin: "https://attacker.example",
    }),
    false
  );
});

test("every state-changing method is gated", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal(
      isAllowed(method, { host: "example.com", origin: "https://evil.test" }),
      false,
      `${method} should be rejected cross-origin`
    );
    assert.equal(
      isAllowed(method, { host: "example.com", origin: "https://example.com" }),
      true,
      `${method} should be allowed same-origin`
    );
  }
});

test("safe methods are not gated", () => {
  for (const method of ["GET", "HEAD"]) {
    assert.equal(
      isAllowed(method, { host: "example.com", origin: "https://evil.test" }),
      true,
      `${method} carries no state change and needs no origin check`
    );
  }
});

test("a POST with no Origin and no Referer is rejected", () => {
  // Fails closed: a stripped-header request must not be treated as same-origin.
  assert.equal(isAllowed("POST", { host: "example.com" }), false);
});

test("a POST with a same-origin Referer and no Origin is allowed", () => {
  assert.equal(
    isAllowed("POST", {
      host: "example.com",
      referer: "https://example.com/admin/news",
    }),
    true
  );
});

test("a POST with a cross-origin Referer is rejected", () => {
  assert.equal(
    isAllowed("POST", {
      host: "example.com",
      referer: "https://attacker.example/page",
    }),
    false
  );
});

test("a malformed Origin is rejected rather than throwing", () => {
  for (const origin of ["not-a-url", "://", "javascript:alert(1)"]) {
    assert.equal(
      isAllowed("POST", { host: "example.com", origin }),
      false,
      `"${origin}" should be rejected`
    );
  }
});

test("a host-prefix lookalike does not pass as same-origin", () => {
  // example.com.attacker.test must not be mistaken for example.com.
  assert.equal(
    isAllowed("POST", {
      host: "example.com",
      origin: "https://example.com.attacker.test",
    }),
    false
  );
});

test("the port is part of origin identity", () => {
  assert.equal(
    isAllowed("POST", {
      host: "example.com:3000",
      origin: "https://example.com:3000",
    }),
    true
  );
  assert.equal(
    isAllowed("POST", {
      host: "example.com:3000",
      origin: "https://example.com:4000",
    }),
    false
  );
});
