import crypto from "crypto";
import { ipKeyGenerator } from "express-rate-limit";
import { BFF_SHARED_SECRET } from "../config/session.js";

const BFF_HEADER = "x-bff-secret";
const SERVICE_READER_HEADER = "x-bff-service-reader";
const SERVICE_READER_VALUE = "1";

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

  const providedDigest = crypto.createHash("sha256").update(providedBuf).digest();
  const expectedDigest = crypto.createHash("sha256").update(expectedBuf).digest();

  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

export function requireBffSecret(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) return next();

  const provided = req.headers[BFF_HEADER];

  if (!provided || !secretsMatch(provided, BFF_SHARED_SECRET)) {
    return res.status(403).json({
      success: false,
      message: "Direct API access is not permitted.",
    });
  }

  const claimed = req.headers[CLIENT_ADDRESS_HEADER];
  if (typeof claimed === "string" && claimed.length > 0 && claimed.length <= 45) {
    req.trustedClientAddress = claimed;
  }

  if (req.headers[SERVICE_READER_HEADER] === SERVICE_READER_VALUE) {
    req.isTrustedServiceReader = true;
  }

  next();
}

export function clientKeyGenerator(req) {
  const address = req.trustedClientAddress ?? req.ip ?? req.socket?.remoteAddress;
  if (!address) return "unknown";

  const raw = String(address).trim();
  let host = raw;

  const bracketed = raw.match(/^\[(.+)\](?::\d+)?$/);
  if (bracketed) {
    host = bracketed[1];
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(raw)) {
    host = raw.slice(0, raw.lastIndexOf(":"));
  }

  return ipKeyGenerator(host);
}

export {
  BFF_HEADER,
  CLIENT_ADDRESS_HEADER,
  SERVICE_READER_HEADER,
  SERVICE_READER_VALUE,
};
