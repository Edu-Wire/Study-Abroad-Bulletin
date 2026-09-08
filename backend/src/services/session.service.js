import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_HASH_SECRET,
  SESSION_IDLE_TTL_MS,
  SESSION_TOKEN_BYTES,
  SESSION_TOUCH_INTERVAL_MS,
} from "../config/session.js";

/**
 * Opaque session service.
 *
 * The raw token exists only in the browser cookie and in memory during the
 * request that mints it. PostgreSQL stores nothing but its keyed HMAC-SHA-256
 * digest, so an attacker who reads the session table cannot forge a cookie.
 */

/** Generate a raw opaque token. URL-safe base64 of 32 random bytes. */
export function generateSessionToken() {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

/**
 * Derive the at-rest digest for a token.
 *
 * HMAC (rather than a bare hash) means the digest cannot be precomputed
 * without also stealing SESSION_HASH_SECRET from the application environment.
 */
export function hashSessionToken(rawToken) {
  return crypto
    .createHmac("sha256", SESSION_HASH_SECRET)
    .update(rawToken)
    .digest("hex");
}

/**
 * Create a session for a user and return the raw token exactly once.
 *
 * @returns {Promise<{ rawToken: string, session: object, expiresAt: Date }>}
 */
export async function createSession(userId) {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_TTL_MS);

  const session = await prisma.userSession.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { rawToken, session, expiresAt };
}

/**
 * Resolve a raw token to its live session and user.
 *
 * Enforces, in order: existence, revocation, absolute expiry, and idle expiry.
 * Returns `{ session, user }` on success or `null` for every failure mode, so
 * callers cannot accidentally distinguish "unknown token" from "expired token".
 */
export async function findActiveSession(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return null;

  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;

  const now = Date.now();

  // Absolute expiry.
  if (session.expiresAt.getTime() <= now) return null;

  // Idle expiry — revoke so the stale row cannot be reused.
  if (now - session.lastUsedAt.getTime() > SESSION_IDLE_TTL_MS) {
    await revokeSessionById(session.id);
    return null;
  }

  if (!session.user) return null;

  return { session, user: session.user };
}

/**
 * Refresh the idle window after a successful authenticated request.
 *
 * Throttled to SESSION_TOUCH_INTERVAL_MS so a busy client does not cause a
 * database write on every request. Failures are swallowed: a missed touch must
 * never break an otherwise valid request.
 */
export async function touchSession(session) {
  const now = Date.now();
  if (now - session.lastUsedAt.getTime() < SESSION_TOUCH_INTERVAL_MS) {
    return;
  }

  try {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date(now) },
    });
  } catch (error) {
    console.error("[session] failed to refresh lastUsedAt:", error.message);
  }
}

/** Revoke a single session by its primary key. */
export async function revokeSessionById(sessionId) {
  try {
    await prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    console.error("[session] failed to revoke session:", error.message);
  }
}

/** Revoke the session identified by a raw token. Used on logout. */
export async function revokeSessionByToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return;
  const tokenHash = hashSessionToken(rawToken);

  try {
    await prisma.userSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (error) {
    console.error("[session] failed to revoke session by token:", error.message);
  }
}

/**
 * Revoke every live session for a user.
 *
 * Called on logout-all, password change, and password reset, so a stolen
 * cookie cannot outlive a credential change.
 *
 * @returns {Promise<number>} number of sessions revoked
 */
export async function revokeAllSessionsForUser(userId, { exceptSessionId } = {}) {
  const where = { userId, revokedAt: null };
  if (exceptSessionId) {
    where.id = { not: exceptSessionId };
  }

  const result = await prisma.userSession.updateMany({
    where,
    data: { revokedAt: new Date() },
  });

  return result.count;
}

/**
 * Delete sessions that are long dead. Purely housekeeping — expiry is always
 * enforced at read time, so this is never required for correctness.
 */
export async function purgeExpiredSessions() {
  const cutoff = new Date(Date.now() - SESSION_ABSOLUTE_TTL_MS);
  const result = await prisma.userSession.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return result.count;
}
