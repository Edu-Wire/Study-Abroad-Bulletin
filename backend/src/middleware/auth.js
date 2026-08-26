import { SESSION_COOKIE_NAME } from "../config/session.js";
import { findActiveSession, touchSession } from "../services/session.service.js";

// ---------------------------------------------------------------------------
// Role hierarchy (higher index = more privileged)
// ---------------------------------------------------------------------------
const ROLE_LEVELS = {
  STUDENT: 0,
  CONSULTANT: 0,
  EDITOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Helper to parse a specific cookie from the Cookie request header
 */
export function getCookie(req, name) {
  if (!req.headers.cookie) return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = req.headers.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Read the raw opaque session token from the request. */
export function getSessionToken(req) {
  return getCookie(req, SESSION_COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// authenticate — resolve the opaque session cookie and load the user from the DB
//
// Express remains the sole authority: the session row is looked up on every
// request and the user record is re-read, so revocation, expiry, suspension and
// role changes all take effect on the very next request.
// ---------------------------------------------------------------------------
export async function authenticate(req, res, next) {
  try {
    const rawToken = getSessionToken(req);

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const resolved = await findActiveSession(rawToken);

    // Missing, revoked, expired, and malformed tokens are indistinguishable.
    if (!resolved) {
      return res.status(401).json({
        success: false,
        message: "Session is invalid or has expired. Please log in again.",
      });
    }

    const { session, user } = resolved;

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is suspended or inactive. Access denied.",
      });
    }

    // Slide the idle window forward (throttled inside the service).
    await touchSession(session);

    req.user = user;
    req.session = { id: session.id, expiresAt: session.expiresAt };
    req.sessionToken = rawToken;
    next();
  } catch (error) {
    console.error("[auth] authenticate error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error. Please try again.",
    });
  }
}

// ---------------------------------------------------------------------------
// authorize — enforce minimum role level
// ---------------------------------------------------------------------------
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const userLevel = ROLE_LEVELS[req.user.role] ?? -1;
    const minRequired = Math.min(...allowedRoles.map((r) => ROLE_LEVELS[r] ?? 99));

    if (userLevel < minRequired) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Insufficient permissions. Required: ${allowedRoles.join(" or ")}.`,
      });
    }

    next();
  };
}

/**
 * Block users who have been issued a temporary password until they have
 * replaced it. Applied after `authenticate`, ahead of privileged work.
 */
export function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      success: false,
      code: "PASSWORD_CHANGE_REQUIRED",
      message: "You must set a new password before continuing.",
    });
  }
  next();
}

// ---------------------------------------------------------------------------
// Convenient role preset middleware chains (use as arrays in route handlers)
// ---------------------------------------------------------------------------

/**
 * Any authenticated user (any role), regardless of password state.
 *
 * Use only for endpoints the password-change flow itself depends on:
 * /api/me, /api/logout, /api/logout-all, /api/password/change. Everything
 * else should use `requireSettledAuth` so a temporary password grants no
 * ordinary access.
 */
export const requireAuth = [authenticate];

/** Any authenticated user whose password is their own. */
export const requireSettledAuth = [authenticate, requirePasswordChanged];

/** EDITOR and above, with a settled password. */
export const requireEditor = [
  authenticate,
  requirePasswordChanged,
  authorize("EDITOR", "ADMIN", "SUPER_ADMIN"),
];

/** ADMIN and above, with a settled password. */
export const requireAdmin = [
  authenticate,
  requirePasswordChanged,
  authorize("ADMIN", "SUPER_ADMIN"),
];

/** SUPER_ADMIN only, with a settled password. */
export const requireSuperAdmin = [
  authenticate,
  requirePasswordChanged,
  authorize("SUPER_ADMIN"),
];

export { ROLE_LEVELS };
