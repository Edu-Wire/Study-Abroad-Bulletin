/**
 * Server-only backend configuration.
 *
 * Nothing here may ever be imported into a Client Component. These values are
 * deliberately not exposed through `NEXT_PUBLIC_*`, so the Express host and the
 * BFF shared secret never reach browser JavaScript. Browser code talks only to
 * relative `/api/backend/*` paths.
 */

import "server-only";

/** Session cookie name, mirroring backend/src/config/session.js. */
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-abroad_session"
    : "abroad_session";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[bff] ${name} is not configured. The Next.js server cannot reach the API without it.`
    );
  }
  return value.trim();
}

/**
 * Base URL of the Express API. Server-only; may be an internal hostname.
 * Trailing slashes are stripped so path joining stays predictable.
 */
export function getBackendUrl(): string {
  return readRequiredEnv("BACKEND_URL").replace(/\/+$/, "");
}

/** Shared secret proving a request came through this BFF. */
export function getBffSharedSecret(): string {
  const secret = readRequiredEnv("BFF_SHARED_SECRET");
  if (secret.length < 32) {
    throw new Error(
      "[bff] BFF_SHARED_SECRET must be at least 32 characters long."
    );
  }
  return secret;
}
