import crypto from "node:crypto";

/**
 * Known marketing/tracking query parameters to strip during URL canonicalization.
 */
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "twclid",
  "mc_cid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "ref",
  "ref_src",
  "ref_url",
]);

/**
 * Normalizes a URL to a stable canonical representation.
 * - Lowercases protocol and host
 * - Strips default ports
 * - Removes marketing/analytics query parameters
 * - Deterministically sorts remaining query parameters
 * - Removes URL hash fragments
 * - Normalizes trailing slashes on sub-paths
 *
 * @param {string} rawUrl
 * @returns {string} Canonical URL
 */
export function canonicalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Invalid URL: URL must be a non-empty string.");
  }

  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: Unable to parse "${rawUrl}"`);
  }

  // Enforce http/https only
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported protocol "${parsed.protocol}" in URL: "${rawUrl}"`);
  }

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  // Strip default ports
  if (
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443")
  ) {
    parsed.port = "";
  }

  // Filter and sort query params
  const cleanParams = new URLSearchParams();
  const keys = Array.from(parsed.searchParams.keys()).sort();

  for (const key of keys) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      const values = parsed.searchParams.getAll(key);
      for (const val of values) {
        cleanParams.append(key, val);
      }
    }
  }

  // Normalize pathname: remove trailing slash if path is longer than "/"
  let pathname = parsed.pathname || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const searchStr = cleanParams.toString();
  return `${parsed.protocol}//${parsed.host}${pathname}${searchStr ? `?${searchStr}` : ""}`;
}

/**
 * Generates SHA-256 hash of a canonicalized URL.
 *
 * @param {string} canonicalUrl
 * @returns {string} SHA-256 hex string (64 characters)
 */
export function hashCanonicalUrl(canonicalUrl) {
  if (!canonicalUrl || typeof canonicalUrl !== "string") {
    throw new Error("Invalid canonical URL for hashing.");
  }
  return crypto.createHash("sha256").update(canonicalUrl).digest("hex");
}
