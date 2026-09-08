/**
 * Client address resolution for the BFF.
 *
 * Express cannot see the real caller — every request reaches it from the
 * Next.js server — so the BFF has to tell it who the caller is. That value is
 * only as trustworthy as the hop that produced it, which is why this module
 * exists rather than relaying a client-supplied header verbatim.
 *
 * The chain-selection rule lives in ./forwardedFor.ts so it can be tested
 * directly; this module supplies the environment and the logging.
 */

import "server-only";
import {
  isPlausibleAddress,
  parseForwardedForChain,
  parseHopCount,
  selectClientAddress,
} from "./forwardedFor";

/** Warn once per process rather than on every request. */
let warnedAboutMissingHopCount = false;
let warnedAboutInvalidHopCount = false;
let warnedAboutShortChain = false;

/**
 * Number of trusted reverse proxies / load balancers in front of Next.js.
 *
 * Set this from the VERIFIED topology, not a guess. The two error directions are
 * not symmetric:
 *
 * - Too HIGH is unsafe. It reaches left past the entries our proxies appended,
 *   into the client-controlled part of the header, letting a caller forge an
 *   address and evade or poison IP-based rate limits. `selectClientAddress`
 *   rejects the clearest case — a chain shorter than the configured count — but
 *   a too-high value combined with a padded chain is indistinguishable from a
 *   genuine one.
 * - Too LOW is merely inaccurate. It reads an address our own infrastructure
 *   appended, which groups legitimate users together but is never forgeable.
 *
 * When in doubt, prefer the lower value.
 *
 * 0  — Next.js is reached directly. X-Forwarded-For is ignored entirely.
 * 1  — one managed proxy or CDN appends the real client address.
 * 2+ — a chain, e.g. a CDN in front of a platform load balancer.
 */
function trustedHopCount(): number {
  const parsed = parseHopCount(process.env.TRUSTED_PROXY_HOP_COUNT);

  if (parsed === null) {
    const raw = process.env.TRUSTED_PROXY_HOP_COUNT;
    const isAbsent = raw === undefined || raw.trim() === "";

    // Default to trusting no header rather than assuming a topology we have not
    // verified. Guessing 1 here would silently trust X-Forwarded-For on a
    // deployment reached directly, handing every caller a forgeable identity.
    // The cost is that rate limits group proxied users together — an
    // availability trade-off, not a security hole.
    if (isAbsent) {
      if (process.env.NODE_ENV === "production" && !warnedAboutMissingHopCount) {
        warnedAboutMissingHopCount = true;
        console.warn(
          "[bff] TRUSTED_PROXY_HOP_COUNT is not set. X-Forwarded-For will be " +
            "ignored and rate limits will group all proxied users together. Set " +
            "it to the verified number of trusted proxies in front of this app."
        );
      }
    } else if (!warnedAboutInvalidHopCount) {
      warnedAboutInvalidHopCount = true;
      console.warn(
        `[bff] TRUSTED_PROXY_HOP_COUNT="${raw}" is not a non-negative integer; ` +
          "ignoring X-Forwarded-For."
      );
    }

    return 0;
  }

  return parsed;
}

/**
 * Resolve the caller's address, or null when it cannot be established.
 *
 * Returning null is meaningful: it tells Express to fall back to the socket
 * address rather than trusting a guess.
 */
export function resolveClientAddress(headers: Headers): string | null {
  const hops = trustedHopCount();
  if (hops === 0) return null;

  const chain = parseForwardedForChain(headers.get("x-forwarded-for"));
  if (chain.length === 0) return null;

  if (chain.length < hops) {
    if (!warnedAboutShortChain) {
      warnedAboutShortChain = true;
      console.warn(
        `[bff] X-Forwarded-For carries ${chain.length} entr` +
          `${chain.length === 1 ? "y" : "ies"} but TRUSTED_PROXY_HOP_COUNT is ` +
          `${hops}. Refusing to trust it — verify the proxy topology. Falling ` +
          "back to the socket address."
      );
    }
    return null;
  }

  const candidate = selectClientAddress(chain, hops);
  if (!candidate) return null;

  return isPlausibleAddress(candidate) ? candidate : null;
}
