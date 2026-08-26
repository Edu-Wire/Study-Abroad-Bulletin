/**
 * Proxy-hop resolution for X-Forwarded-For.
 *
 * Regression cover for a rate-limit evasion bug. The header is a chain
 * `client, proxy1, proxy2` where each proxy APPENDS, so entries on the left are
 * whatever the caller chose to send and entries on the right were added by
 * infrastructure we control.
 *
 * The original implementation clamped an over-large hop count with
 * `Math.max(0, length - hops)`, which silently selected the LEFTMOST entry —
 * fully attacker-controlled — and promoted it to a trusted identity.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  isPlausibleAddress,
  parseForwardedForChain,
  parseHopCount,
  selectClientAddress,
} from "../../src/lib/server/forwardedFor.ts";

/** Resolve as the BFF would, for a given header value and hop count. */
function resolve(headerValue, hops) {
  const chain = parseForwardedForChain(headerValue ?? null);
  const candidate = selectClientAddress(chain, hops);
  if (!candidate) return null;
  return isPlausibleAddress(candidate) ? candidate : null;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

test("with no trusted proxy the header is ignored entirely", () => {
  assert.equal(resolve("9.9.9.9, 203.0.113.7", 0), null);
});

test("with one trusted proxy the appended client address is used", () => {
  assert.equal(resolve("203.0.113.7", 1), "203.0.113.7");
});

test("a forged left-hand entry cannot win when the hop count is correct", () => {
  // The attacker sends "9.9.9.9"; our proxy appends the real address.
  assert.equal(
    resolve("9.9.9.9, 203.0.113.7", 1),
    "203.0.113.7",
    "the rightmost entry is the one our proxy appended"
  );
});

test("padding the chain cannot shift selection when the hop count is correct", () => {
  // The key property: however many entries the caller prepends, the real client
  // address stays at a fixed offset from the right.
  for (const padding of [
    "1.1.1.1",
    "1.1.1.1, 2.2.2.2",
    "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 5.5.5.5",
  ]) {
    assert.equal(
      resolve(`${padding}, 203.0.113.7`, 1),
      "203.0.113.7",
      `padding "${padding}" must not change the result`
    );
  }
});

test("a two-proxy chain selects the client, not the inner proxy", () => {
  assert.equal(resolve("203.0.113.7, 10.0.0.1", 2), "203.0.113.7");
});

test("a chain shorter than the hop count is refused, not clamped", () => {
  // The previous implementation returned "9.9.9.9" here — the attacker's value.
  assert.equal(
    resolve("9.9.9.9, 203.0.113.7", 3),
    null,
    "a topology mismatch must fail closed rather than trust a forged entry"
  );
  assert.equal(
    resolve("9.9.9.9", 5),
    null,
    "a single forged entry must never satisfy a 5-hop configuration"
  );
});

test("an absent or empty header yields no address", () => {
  assert.equal(resolve(undefined, 1), null);
  assert.equal(resolve("", 1), null);
  assert.equal(resolve(null, 1), null);
});

test("a non-address value is rejected", () => {
  for (const bogus of ["not-an-ip", "<script>", "unknown", "a".repeat(60)]) {
    assert.equal(
      resolve(`9.9.9.9, ${bogus}`, 1),
      null,
      `"${bogus}" should not be accepted as an address`
    );
  }
});

test("IPv6 addresses survive resolution", () => {
  assert.equal(resolve("9.9.9.9, 2001:db8::1", 1), "2001:db8::1");
});

test("whitespace in the chain is tolerated", () => {
  assert.equal(resolve("  9.9.9.9 ,   203.0.113.7  ", 1), "203.0.113.7");
});

test("empty entries do not shift the offset", () => {
  // A caller sending "a,,b" must not be able to move the selection window.
  assert.equal(resolve("9.9.9.9,,203.0.113.7", 1), "203.0.113.7");
});

test("a negative or non-integer hop count trusts nothing", () => {
  for (const hops of [-1, -5, 1.5, NaN, Infinity]) {
    assert.equal(
      selectClientAddress(["9.9.9.9", "203.0.113.7"], hops),
      null,
      `hops=${hops} should select nothing`
    );
  }
});

// ---------------------------------------------------------------------------
// Hop-count parsing
// ---------------------------------------------------------------------------

test("a valid hop count parses", () => {
  assert.equal(parseHopCount("0"), 0);
  assert.equal(parseHopCount("1"), 1);
  assert.equal(parseHopCount("3"), 3);
  assert.equal(parseHopCount(" 2 "), 2);
});

test("an absent hop count is null, not a guess", () => {
  assert.equal(parseHopCount(undefined), null);
  assert.equal(parseHopCount(""), null);
  assert.equal(parseHopCount("   "), null);
});

test("a malformed hop count is rejected rather than coerced", () => {
  // parseInt("1.5") is 1, which would quietly turn a malformed setting into a
  // trusting one. The whole string must validate.
  for (const value of ["1.5", "abc", "-1", "NaN", "1e3", "0x2", "2 proxies", "+1"]) {
    assert.equal(
      parseHopCount(value),
      null,
      `"${value}" must not be accepted as a hop count`
    );
  }
});

// ---------------------------------------------------------------------------
// Address plausibility
// ---------------------------------------------------------------------------

test("plausible addresses are accepted", () => {
  for (const value of [
    "203.0.113.7",
    "203.0.113.7:4433",
    "2001:db8::1",
    "[2001:db8::1]:4433",
    "::1",
  ]) {
    assert.ok(isPlausibleAddress(value), `${value} should be accepted`);
  }
});

test("implausible addresses are rejected", () => {
  for (const value of ["", "unknown", "not-an-ip", "a".repeat(60), "<img>"]) {
    assert.ok(!isPlausibleAddress(value), `${value} should be rejected`);
  }
});
