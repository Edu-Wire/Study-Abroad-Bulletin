/**
 * Phase 2 — opaque session token cryptography.
 *
 * These assertions are pure and need no database, so they run everywhere.
 */
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// The session config fails fast on weak secrets, so provide strong test values
// before importing anything that reads them.
process.env.SESSION_HASH_SECRET =
  process.env.SESSION_HASH_SECRET ?? "test-session-hash-secret-".padEnd(48, "x");
process.env.BFF_SHARED_SECRET =
  process.env.BFF_SHARED_SECRET ?? "test-bff-shared-secret-".padEnd(48, "y");

const { generateSessionToken, hashSessionToken } = await import(
  "../../backend/src/services/session.service.js"
);
const {
  SESSION_TOKEN_BYTES,
  SESSION_COOKIE_OPTIONS,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_IDLE_TTL_MS,
} = await import("../../backend/src/config/session.js");

test("token carries 256 bits of entropy", () => {
  assert.equal(SESSION_TOKEN_BYTES, 32);

  const token = generateSessionToken();
  // base64url of 32 bytes decodes back to exactly 32 bytes.
  assert.equal(Buffer.from(token, "base64url").length, 32);
});

test("token is URL-safe and cookie-safe", () => {
  for (let i = 0; i < 50; i++) {
    const token = generateSessionToken();
    assert.match(token, /^[A-Za-z0-9_-]+$/, `unsafe characters in ${token}`);
  }
});

test("tokens do not repeat", () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) seen.add(generateSessionToken());
  assert.equal(seen.size, 1000, "generated a duplicate session token");
});

test("stored hash is not reversible to the raw token", () => {
  const token = generateSessionToken();
  const hash = hashSessionToken(token);

  assert.notEqual(hash, token);
  assert.ok(!hash.includes(token), "hash leaks the raw token");
  assert.match(hash, /^[0-9a-f]{64}$/, "expected hex SHA-256 digest");
});

test("hashing is deterministic for the same token", () => {
  const token = generateSessionToken();
  assert.equal(hashSessionToken(token), hashSessionToken(token));
});

test("distinct tokens hash to distinct digests", () => {
  const a = hashSessionToken(generateSessionToken());
  const b = hashSessionToken(generateSessionToken());
  assert.notEqual(a, b);
});

test("hash is keyed, so a plain SHA-256 digest does not match", () => {
  const token = generateSessionToken();
  const plain = crypto.createHash("sha256").update(token).digest("hex");

  // If these matched, an attacker with the database could precompute digests
  // without also stealing SESSION_HASH_SECRET.
  assert.notEqual(hashSessionToken(token), plain);
});

test("hash depends on the secret", () => {
  const token = generateSessionToken();
  const withTestSecret = hashSessionToken(token);
  const withOtherSecret = crypto
    .createHmac("sha256", "a-completely-different-secret-value-here")
    .update(token)
    .digest("hex");

  assert.notEqual(withTestSecret, withOtherSecret);
});

test("cookie is HttpOnly, host-only, and Lax", () => {
  assert.equal(SESSION_COOKIE_OPTIONS.httpOnly, true);
  assert.equal(SESSION_COOKIE_OPTIONS.sameSite, "lax");
  assert.equal(SESSION_COOKIE_OPTIONS.path, "/");
  assert.ok(
    !("domain" in SESSION_COOKIE_OPTIONS),
    "a Domain attribute would break host-only scoping"
  );
});

test("session lifetimes match the security decision", () => {
  assert.equal(SESSION_ABSOLUTE_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(SESSION_IDLE_TTL_MS, 24 * 60 * 60 * 1000);
  assert.ok(SESSION_IDLE_TTL_MS < SESSION_ABSOLUTE_TTL_MS);
});
