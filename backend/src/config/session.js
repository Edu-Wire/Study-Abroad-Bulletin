import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Attempt to load .env from the project root if the process was not started
// with the variables already present in its environment.
function loadEnvIfNeeded(varName) {
  if (process.env[varName]) return;
  try {
    if (typeof process.loadEnvFile === "function") {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const envPath = path.resolve(__dirname, "../../../.env");
      if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
      } else {
        process.loadEnvFile();
      }
    }
  } catch {
    // Ignore: already loaded or absent. The validation below is the real gate.
  }
}

function requireSecret(varName, description) {
  loadEnvIfNeeded(varName);
  const raw = process.env[varName];

  if (!raw || typeof raw !== "string" || raw.trim().length < 32) {
    console.error(
      `\n❌ [FATAL SECURITY ERROR] ${varName} must be configured and be at least 32 characters long.`
    );
    console.error(
      `   ${description}\n   Current status: ` +
        (!raw ? "MISSING" : `TOO SHORT (${raw.trim().length} chars, required >= 32)`)
    );
    console.error("   The server will not start in an insecure state.\n");
    process.exit(1);
  }

  return raw.trim();
}

/** Secret used to derive the HMAC-SHA-256 hash of session tokens at rest. */
export const SESSION_HASH_SECRET = requireSecret(
  "SESSION_HASH_SECRET",
  "Used to hash opaque session tokens before storing them in PostgreSQL."
);

/**
 * Shared secret proving a request arrived through the Next.js BFF rather than
 * directly from a browser or third party.
 */
export const BFF_SHARED_SECRET = requireSecret(
  "BFF_SHARED_SECRET",
  "Must match BFF_SHARED_SECRET configured on the Next.js server."
);

/**
 * Host-only session cookie.
 *
 * The `__Host-` prefix is enforced by browsers: the cookie is only accepted
 * when it is Secure, has Path=/, and carries no Domain attribute. That makes it
 * impossible for a sibling subdomain to set or read it.
 *
 * Browsers reject `__Host-` cookies sent over plain HTTP, so local development
 * over http://localhost uses an unprefixed name instead.
 */
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const SESSION_COOKIE_NAME = IS_PRODUCTION
  ? "__Host-abroad_session"
  : "abroad_session";

/** Absolute session lifetime: 7 days. */
export const SESSION_ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Idle timeout: 24 hours without an authenticated request. */
export const SESSION_IDLE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Only refresh `lastUsedAt` when it is meaningfully stale, so a burst of
 * requests does not trigger a write per request.
 */
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Raw opaque token size. 32 bytes = 256 bits of entropy. */
export const SESSION_TOKEN_BYTES = 32;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax",
  path: "/",
  // Deliberately no `domain`: the cookie must stay host-only.
};
