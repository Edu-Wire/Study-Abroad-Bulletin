import crypto from "crypto";
import { ipKeyGenerator } from "express-rate-limit";
import { BFF_SHARED_SECRET } from "../config/session.js";

const BFF_HEADER = "x-bff-secret";

/**
 * Client address as reported by the trusted BFF.
 *
 * Deliberately not `x-forwarded-for`: this value is believed only on requests
 * that also carry a valid X-BFF-Secret, so it cannot be set by an arbitrary
 * caller. See clientKeyGenerator below.
 */
const CLIENT_ADDRESS_HEADER = "x-bff-client-address";

/**
 * Paths reachable without the BFF shared secret.
 *
 * Health checks must stay callable by load balancers and uptime probes, which
 * have no reason to hold an application secret.
 */
const PUBLIC_PATHS = new Set(["/api/health"]);

/** Constant-time comparison that tolerates differing lengths. */
function secretsMatch(provided, expected) {
  const providedBuf = Buffer.from(String(provided));
  const expectedBuf = Buffer.from(expected);

  // timingSafeEqual throws on length mismatch, so compare digests of equal
  // length instead of returning early on length alone.
  const providedDigest = crypto.createHash("sha256").update(providedBuf).digest();
  const expectedDigest = crypto.createHash("sha256").update(expectedBuf).digest();

  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

/**
 * Require that a request arrived through the trusted Next.js BFF.
 *
 * This is defence in depth, not the authorization decision itself: it stops a
 * browser, a stolen cookie replayed cross-origin, or an internet scanner from
 * reaching the API surface directly. Authentication and RBAC still run
 * afterwards on every request.
 */
export function requireBffSecret(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) {
    return next();
  }

  const provided = req.headers[BFF_HEADER];

  if (!provided || !secretsMatch(provided, BFF_SHARED_SECRET)) {
    return res.status(403).json({
      success: false,
      message: "Direct API access is not permitted.",
    });
  }

  // The shared secret has now been verified, which is precisely what makes the
  // accompanying client-address header believable. Promote it to a trusted
  // value for the rate limiters downstream.
  //
  // Order matters: this runs only after the secret check above, so an untrusted
  // caller can never reach the assignment and seed a value of their choosing.
  const claimed = req.headers[CLIENT_ADDRESS_HEADER];
  if (typeof claimed === "string" && claimed.length > 0 && claimed.length <= 45) {
    req.trustedClientAddress = claimed;
  }

  next();
}

/**
 * Rate-limit key for a request.
 *
 * Prefers the address the trusted BFF reported. Falls back to the socket
 * address, which is correct when Express is reached directly (health probes,
 * local development).
 *
 * `trust proxy` is deliberately NOT enabled: it would make Express believe any
 * X-Forwarded-For it receives, including one a client forged, which is exactly
 * the bypass express-rate-limit warns about.
 */
export function clientKeyGenerator(req) {
  const address = req.trustedClientAddress ?? req.ip ?? req.socket?.remoteAddress;
  if (!address) {
    // No identity available: group these together rather than exempting them.
    return "unknown";
  }

  // Strip a trailing port only for IPv4 (`1.2.3.4:5678`) and for the bracketed
  // IPv6 form (`[::1]:5678`). A bare IPv6 address is left intact, since its
  // colons are part of the address, not a port.
  const raw = String(address).trim();
  let host = raw;

  const bracketed = raw.match(/^\[(.+)\](?::\d+)?$/);
  if (bracketed) {
    host = bracketed[1];
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(raw)) {
    host = raw.slice(0, raw.lastIndexOf(":"));
  }

  // ipKeyGenerator normalises IPv4-mapped IPv6 and groups IPv6 into a subnet,
  // so a client holding a large IPv6 range cannot rotate addresses to get a
  // fresh bucket per request.
  return ipKeyGenerator(host);
}

export { BFF_HEADER, CLIENT_ADDRESS_HEADER };
