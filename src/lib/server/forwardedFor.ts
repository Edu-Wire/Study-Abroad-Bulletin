/**
 * X-Forwarded-For chain parsing — pure, dependency-free, and directly testable.
 *
 * Deliberately separate from clientAddress.ts, which is `server-only` and reads
 * the environment. Keeping the decision rule here means the security-critical
 * logic can be exercised in isolation rather than inferred from a mirror.
 *
 * The header is a chain that each proxy APPENDS to:
 *
 *     X-Forwarded-For: <whatever the caller sent>, <added by proxy 1>, <proxy 2>
 *
 * So entries on the LEFT are attacker-controlled and entries on the RIGHT were
 * added by infrastructure we control. Selecting from the left is the classic
 * spoofing bug.
 */

/** Split a raw header value into its non-empty, trimmed entries. */
export function parseForwardedForChain(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Pick the client address from a chain, given the number of trusted proxies.
 *
 * Returns null — meaning "no trustworthy address" — when:
 *  - `hops` is 0, so no entry was added by anything we control;
 *  - the chain is empty;
 *  - the chain is SHORTER than `hops`, which means the request did not traverse
 *    the proxies we were configured to expect. Clamping into the untrusted
 *    region to salvage a value is exactly how a forged entry becomes a trusted
 *    identity, so this fails closed instead.
 *
 * With a correct `hops`, no amount of caller-supplied padding changes the
 * result: the client address sits at a fixed offset from the right.
 */
export function selectClientAddress(
  chain: string[],
  hops: number
): string | null {
  if (!Number.isInteger(hops) || hops <= 0) return null;
  if (chain.length === 0) return null;
  if (chain.length < hops) return null;

  return chain[chain.length - hops] ?? null;
}

/**
 * Reject values that are not addresses at all.
 *
 * A sanity filter, not proof of ownership: an attacker able to append to the
 * trusted portion of the chain is already inside the perimeter. This stops
 * header-injection oddities from becoming rate-limit keys.
 */
export function isPlausibleAddress(value: string): boolean {
  if (!value || value.length > 45) return false;

  // IPv4, optionally with a port.
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d{1,5})?$/.test(value)) return true;

  // IPv6, bracketed or bare.
  if (/^\[?[0-9a-fA-F:]+\]?(:\d{1,5})?$/.test(value) && value.includes(":")) {
    return true;
  }

  return false;
}

/**
 * Parse a TRUSTED_PROXY_HOP_COUNT value.
 *
 * Returns null for anything that is not a plain non-negative integer, so the
 * caller can warn and fall back to trusting nothing. Note that a bare
 * `parseInt` would turn "1.5" into 1 — quietly converting a malformed setting
 * into a trusting one — which is why this validates the whole string.
 */
export function parseHopCount(raw: string | undefined): number | null {
  if (raw === undefined) return null;

  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
