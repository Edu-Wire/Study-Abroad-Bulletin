import crypto from "crypto";
import { BFF_SHARED_SECRET } from "../config/session.js";

const BFF_HEADER = "x-bff-secret";

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

  next();
}

export { BFF_HEADER };
