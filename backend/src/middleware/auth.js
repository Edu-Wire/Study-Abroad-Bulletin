import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "studyabroadnews_secret_key_2026";

// ---------------------------------------------------------------------------
// Role hierarchy (higher index = more privileged)
// ---------------------------------------------------------------------------
const ROLE_LEVELS = {
  STUDENT: 0,
  EDITOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

// ---------------------------------------------------------------------------
// authenticate — verify JWT and load current user from DB
// ---------------------------------------------------------------------------
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }

    // Load fresh user state from DB — do NOT trust stale role in JWT
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found. Please log in again.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is suspended or inactive. Access denied.",
      });
    }

    // Attach user to request for downstream middleware / handlers
    req.user = user;
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

// ---------------------------------------------------------------------------
// Convenient role preset middleware chains (use as arrays in route handlers)
// ---------------------------------------------------------------------------

/** Any authenticated user (any role). */
export const requireAuth = [authenticate];

/** EDITOR and above. */
export const requireEditor = [authenticate, authorize("EDITOR", "ADMIN", "SUPER_ADMIN")];

/** ADMIN and above. */
export const requireAdmin = [authenticate, authorize("ADMIN", "SUPER_ADMIN")];

/** SUPER_ADMIN only. */
export const requireSuperAdmin = [authenticate, authorize("SUPER_ADMIN")];
