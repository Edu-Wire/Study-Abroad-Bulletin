/**
 * Client address resolution for the BFF.
 *
 * Express cannot see the real caller — every request reaches it from the
 * Next.js server — so the BFF has to tell it who the caller is. That value is
 * only as trustworthy as the hop that produced it, which is why this module
 * exists rather than relaying a client-supplied header verbatim.
 *
 * `X-Forwarded-For` arrives as a chain: `client, proxy1, proxy2`. Everything a
 * client sends is prepended by each subsequent proxy, so entries on the LEFT
 * are the least trustworthy and entries on the RIGHT were added by
 * infrastructure we control. Taking the leftmost entry — the common mistake —
 * lets any caller forge an address and evade or poison a rate limiter.
 *
 * We therefore count inward from the right by the number of proxies actually in
 * front of this app, configured via TRUSTED_PROXY_HOP_COUNT.
 */

import "server-only";

/**
 * Number of trusted reverse proxies / load balancers in front of Next.js.
 *
 * 0  — Next.js is reached directly (local development). Ignore XFF entirely.
 * 1  — one managed proxy or CDN appends the real client address (typical).
 * 2+ — a chain, e.g. CDN in front of a platform load balancer.
 *
 * A wrong value fails safe in one direction only: too high yields an address
 * from deeper in the chain (over-grouping requests), never a client-forged one.
 */
function trustedHopCount(): number {
  const raw = process.env.TRUSTED_PROXY_HOP_COUNT;
  if (raw === undefined) {
    // Default to 1 in production, where a TLS-terminating proxy is a given,
    // and 0 in development, where Next.js is usually hit directly.
    return process.env.NODE_ENV === "production" ? 1 : 0;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.warn(
      `[bff] TRUSTED_PROXY_HOP_COUNT="${raw}" is not a non-negative integer; treating it as 0.`
    );
    return 0;
  }
  return parsed;
}

/**
 * Resolve the caller's address, or null when it cannot be established.
 *
 * Returning null is meaningful: it tells Express to fall back to grouping by
 * something other than a forged address, rather than trusting a guess.
 */
export function resolveClientAddress(headers: Headers): string | null {
  const hops = trustedHopCount();

  if (hops === 0) {
    // No trusted proxy, so no header can be believed. Express will fall back to
    // the socket address, which is correct in a direct-connection setup.
    return null;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;

  const chain = forwardedFor
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (chain.length === 0) return null;

  // Count inward from the right: the last entry was appended by our own
  // outermost proxy, so with N trusted hops the client sits at index
  // length - N. Clamp to 0 so a shorter-than-expected chain degrades to the
  // leftmost entry rather than reading out of bounds.
  const index = Math.max(0, chain.length - hops);
  const candidate = chain[index] ?? chain[0];

  return isPlausibleAddress(candidate) ? candidate : null;
}

/**
 * Reject values that are not addresses at all.
 *
 * This is a sanity filter, not validation of ownership: an attacker positioned
 * to append to the trusted portion of the chain is already inside the
 * perimeter. It stops header-injection oddities from becoming limiter keys.
 */
function isPlausibleAddress(value: string): boolean {
  if (!value || value.length > 45) return false;

  // IPv4, optionally with a port.
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d{1,5})?$/.test(value)) return true;

  // IPv6, bracketed or bare.
  if (/^\[?[0-9a-fA-F:]+\]?(:\d{1,5})?$/.test(value) && value.includes(":")) {
    return true;
  }

  return false;
}
