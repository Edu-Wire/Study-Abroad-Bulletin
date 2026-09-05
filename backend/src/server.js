import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { XMLParser } from "fast-xml-parser";
import { connectDB } from "./config/db.js";
import { prisma } from "./config/prisma.js";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_ABSOLUTE_TTL_MS,
} from "./config/session.js";
import {
  createSession,
  revokeAllSessionsForUser,
  revokeSessionByToken,
} from "./services/session.service.js";
import { requireBffSecret } from "./middleware/bff.js";
import {
  requireAuth,
  requireEditor,
  requireAdmin,
  requireSuperAdmin,
  requireSettledAuth,
  authenticate,
  getSessionToken,
} from "./middleware/auth.js";
import {
  authLimiter,
  adminMutationLimiter,
  generalApiLimiter,
} from "./middleware/rateLimiter.js";
import { validateRequest } from "./middleware/validate.js";
import {
  SignupSchema,
  LoginSchema,
  UserIdParamSchema,
  UserInviteSchema,
  UserUpdateSchema,
  ArticleIdParamSchema,
  ArticleQuerySchema,
  ArticleCreateSchema,
  ArticleUpdateSchema,
  ArticleStatusUpdateSchema,
  RssImportSchema,
  StudentProfileSchema,
  PasswordChangeSchema,
} from "./validators/index.js";
import { getPersonalizedRecommendations } from "./services/recommendation.js";
import ingestionRoutes from "./modules/ingestion/ingestion.routes.js";
import { canonicalizeUrl } from "./modules/ingestion/utils/urlCanonicalizer.js";
import editorialRoutes from "./modules/ingestion/editorial.routes.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Allowed origins for CORS with credentials
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

// CORS configuration supporting HttpOnly cookies and credentials
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // Standard CORS denial: cleanly omits allow-origin header
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Every browser-facing endpoint must arrive through the trusted Next.js BFF.
// /api/health is exempt so infrastructure probes keep working.
app.use(requireBffSecret);

// Baseline ceiling on all API traffic. Endpoint-specific limiters below are
// stricter; this catches everything else, including read-heavy scraping.
app.use("/api", generalApiLimiter);

// Ingestion Engine Admin API Routes.
//
// The editorial router is mounted first: it owns ignore, source changes and
// source health, and it validates the editorial preconditions on create-draft
// before delegating to the operational router that enqueues the job.
app.use("/api/admin", editorialRoutes);
app.use("/api/admin", ingestionRoutes);

// Cookie configuration for opaque session tokens.
export const AUTH_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_OPTIONS,
  maxAge: SESSION_ABSOLUTE_TTL_MS,
};

/**
 * Generate a cryptographically secure 12-character temporary password
 */
function generateTemporaryPassword(length = 12) {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%&*";
  const all = uppercase + lowercase + numbers + symbols;

  let pwd = "";
  pwd += uppercase[crypto.randomInt(uppercase.length)];
  pwd += lowercase[crypto.randomInt(lowercase.length)];
  pwd += numbers[crypto.randomInt(numbers.length)];
  pwd += symbols[crypto.randomInt(symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[crypto.randomInt(all.length)];
  }

  return pwd
    .split("")
    .sort(() => crypto.randomInt(3) - 1)
    .join("");
}

/**
 * @route   POST /api/signup
 * @desc    Register a new user in PostgreSQL
 * @access  Public (Rate Limited: 10 requests / 15 mins)
 */
app.post(
  "/api/signup",
  authLimiter,
  validateRequest({ body: SignupSchema }),
  async (req, res) => {
    try {
      const { firstName, lastName, email, password } = res.locals.validated.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide first name, last name, email, and password.",
        });
      }

      // Password strength is enforced by StrongPasswordSchema in the validator.

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists in PostgreSQL
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists.",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user in PostgreSQL
      const newUser = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password: hashedPassword,
        },
      });

      // Mint an opaque, database-backed session.
      const { rawToken } = await createSession(newUser.id);

      // Host-only HttpOnly cookie. The raw token is never placed in the body.
      res.cookie(SESSION_COOKIE_NAME, rawToken, AUTH_COOKIE_OPTIONS);

      return res.status(201).json({
        success: true,
        message: "Account created successfully.",
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during registration. Please try again.",
      });
    }
  });

/**
 * @route   POST /api/login
 * @desc    Authenticate user and establish an opaque session
 * @access  Public (Rate Limited: 10 requests / 15 mins)
 */
app.post(
  "/api/login",
  authLimiter,
  validateRequest({ body: LoginSchema }),
  async (req, res) => {
    try {
      const { email, password } = res.locals.validated.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please enter both email and password.",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      // Check password match
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      // Check account lifecycle status (Kill-switch check)
      if (user.status === "SUSPENDED") {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Please contact support or an administrator.",
        });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: "Your account is not active. Please complete account activation.",
        });
      }

      // Update lastLogin
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Mint an opaque, database-backed session.
      const { rawToken } = await createSession(user.id);

      // Host-only HttpOnly cookie. The raw token is never placed in the body.
      res.cookie(SESSION_COOKIE_NAME, rawToken, AUTH_COOKIE_OPTIONS);

      return res.status(200).json({
        success: true,
        message: "Logged in successfully!",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during login. Please try again.",
      });
    }
  });

/**
 * @route   POST /api/logout
 * @desc    Revoke the current session and clear its cookie
 */
app.post("/api/logout", async (req, res) => {
  try {
    // Revoke server-side first: clearing the cookie alone would leave a live
    // session row that a copied token could still use.
    const rawToken = getSessionToken(req);
    if (rawToken) {
      await revokeSessionByToken(rawToken);
    }
  } catch (error) {
    console.error("[auth] logout revocation error:", error);
  }

  res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

/**
 * @route   POST /api/logout-all
 * @desc    Revoke every session belonging to the authenticated user
 * @access  Authenticated
 */
app.post("/api/logout-all", ...requireAuth, async (req, res) => {
  try {
    const revoked = await revokeAllSessionsForUser(req.user.id);
    res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      message: `Signed out of ${revoked} session(s).`,
    });
  } catch (error) {
    console.error("[auth] logout-all error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to sign out all sessions." });
  }
});

/**
 * @route   POST /api/password/change
 * @desc    Self-service password change. Revokes every other session so a
 *          stolen cookie cannot outlive the credential it was minted with.
 * @access  Authenticated (allowed while mustChangePassword is set)
 */
app.post(
  "/api/password/change",
  authenticate,
  authLimiter,
  validateRequest({ body: PasswordChangeSchema }),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = res.locals.validated.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, password: true },
      });

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Account not found." });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Current password is incorrect." });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: "The new password must differ from the current password.",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, mustChangePassword: false },
      });

      // Keep the caller signed in, drop every other session.
      const revoked = await revokeAllSessionsForUser(user.id, {
        exceptSessionId: req.session.id,
      });

      return res.status(200).json({
        success: true,
        message: `Password updated. ${revoked} other session(s) were signed out.`,
      });
    } catch (error) {
      console.error("[auth] password change error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update password." });
    }
  }
);

/**
 * @route   GET /api/me
 * @desc    Get current authenticated user info
 */
app.get("/api/me", ...requireAuth, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch user profile." });
  }
});

// ============================================================
// STUDENT PROFILE ROUTES
// ============================================================

/**
 * @route   GET /api/student/profile
 * @desc    Get current authenticated student's profile & preferences
 * @access  Authenticated User (STUDENT, etc.)
 */
app.get("/api/student/profile", ...requireSettledAuth, async (req, res) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });

    return res.status(200).json({
      success: true,
      profile: profile || null,
    });
  } catch (error) {
    console.error("Fetch student profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student profile.",
    });
  }
});

/**
 * @route   PUT /api/student/profile
 * @desc    Create or update current authenticated student's profile
 * @access  Authenticated User (STUDENT, etc.)
 */
app.put(
  "/api/student/profile",
  ...requireSettledAuth,
  adminMutationLimiter,
  validateRequest({ body: StudentProfileSchema }),
  async (req, res) => {
    try {
      const {
        targetCountries = [],
        studyLevel = null,
        degree = null,
        branch = null,
        preferredIntake = null,
        budgetRange = null,
        interests = [],
      } = res.locals.validated.body;

      const profile = await prisma.studentProfile.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          targetCountries,
          studyLevel,
          degree,
          branch,
          preferredIntake,
          budgetRange,
          interests,
        },
        update: {
          targetCountries,
          studyLevel,
          degree,
          branch,
          preferredIntake,
          budgetRange,
          interests,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Student profile saved successfully.",
        profile,
      });
    } catch (error) {
      console.error("Save student profile error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save student profile.",
      });
    }
  }
);

/**
 * @route   GET /api/student/feed
 * @desc    Get personalized recommendation feed (articles, scholarships, deadlines)
 * @access  Authenticated User (STUDENT, etc.)
 */
app.get("/api/student/feed", ...requireSettledAuth, async (req, res) => {
  try {
    // Identity is derived strictly from verified req.user.id
    const recommendations = await getPersonalizedRecommendations(req.user.id);

    return res.status(200).json({
      success: true,
      hasProfile: recommendations.hasProfile,
      profile: recommendations.profile,
      data: {
        articles: recommendations.articles,
        scholarships: recommendations.scholarships,
        deadlines: recommendations.deadlines,
      },
    });
  } catch (error) {
    console.error("Student feed generation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate personalized student feed.",
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    List all platform users & staff for Admin panel
 * @access  ADMIN, SUPER_ADMIN
 */
app.get("/api/admin/users", ...requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Fetch admin users error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

/**
 * @route   POST /api/admin/users/invite
 * @desc    Invite/create a new staff user with role
 * @access  ADMIN, SUPER_ADMIN (Rate Limited)
 */
app.post(
  "/api/admin/users/invite",
  adminMutationLimiter,
  ...requireAdmin,
  validateRequest({ body: UserInviteSchema }),
  async (req, res) => {
    try {
      const { firstName, lastName, email, role, password } = res.locals.validated.body;

      if (!firstName || !lastName || !email || !role) {
        return res.status(400).json({
          success: false,
          message: "Please provide first name, last name, email, and role.",
        });
      }

      if (role === "SUPER_ADMIN" && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only Super Admins can assign or invite Super Admin accounts.",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "A user with this email already exists.",
        });
      }

      let finalPassword = password && typeof password === "string" ? password.trim() : null;
      let autoGenerated = false;

      if (finalPassword) {
        if (finalPassword.length < 8) {
          return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters long.",
          });
        }
      } else {
        finalPassword = generateTemporaryPassword(12);
        autoGenerated = true;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(finalPassword, salt);

      const newUser = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role,
          status: "ACTIVE",
          // An administrator-chosen or auto-generated password is known to
          // someone other than the account holder, so it must be replaced
          // before the account can exercise its privileges.
          mustChangePassword: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: `User created successfully with role ${role}.`,
        user: newUser,
        temporaryPassword: autoGenerated ? finalPassword : null,
      });
    } catch (error) {
      console.error("Invite user error:", error);
      return res.status(500).json({ success: false, message: "Failed to create user" });
    }
  });

/**
 * @route   PATCH /api/admin/users/:id
 * @desc    Update user profile, role, status, and/or reset password with Bcrypt hashing
 * @access  ADMIN, SUPER_ADMIN (Rate Limited)
 */
app.patch(
  "/api/admin/users/:id",
  adminMutationLimiter,
  ...requireAdmin,
  validateRequest({ params: UserIdParamSchema, body: UserUpdateSchema }),
  async (req, res) => {
    try {
      const { id } = res.locals.validated.params;
      const { firstName, lastName, role, status, password } = res.locals.validated.body;
      const caller = req.user;

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      // Role Hierarchy & Self-Modification Security Rules:
      // 1. A user cannot change their own role or status via this administrative endpoint
      if (id === caller.id) {
        if (role !== undefined && role !== caller.role) {
          return res.status(403).json({
            success: false,
            message: "You cannot change your own role.",
          });
        }
        if (status !== undefined && status !== caller.status) {
          return res.status(403).json({
            success: false,
            message: "You cannot change your own account status.",
          });
        }
      }

      // 2. Non-SUPER_ADMIN callers (e.g. ADMIN) have restricted management permissions
      if (caller.role !== "SUPER_ADMIN") {
        // Cannot assign SUPER_ADMIN role to anyone
        if (role === "SUPER_ADMIN") {
          return res.status(403).json({
            success: false,
            message: "Access denied: Only Super Admins can assign the SUPER_ADMIN role.",
          });
        }

        // Cannot modify a SUPER_ADMIN account
        if (existingUser.role === "SUPER_ADMIN") {
          return res.status(403).json({
            success: false,
            message: "Access denied: Cannot modify a Super Admin account.",
          });
        }

        // Cannot modify another ADMIN's role, status, or credentials
        if (existingUser.role === "ADMIN" && existingUser.id !== caller.id) {
          if (role !== undefined || status !== undefined || password !== undefined) {
            return res.status(403).json({
              success: false,
              message: "Access denied: Cannot modify another Administrator's privileged settings or credentials.",
            });
          }
        }
      }

      const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR", "STUDENT", "CONSULTANT"];
      if (role !== undefined && !VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` });
      }

      const VALID_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"];
      if (status !== undefined && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
      }

      const updateData = {};
      if (firstName !== undefined && firstName.trim()) updateData.firstName = firstName.trim();
      if (lastName !== undefined && lastName.trim()) updateData.lastName = lastName.trim();
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;

      // Safely hash password with bcrypt if provided
      const passwordWasReset = Boolean(password && password.trim());
      if (passwordWasReset) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password.trim(), salt);
        // An administrator now knows this password; the holder must replace it.
        updateData.mustChangePassword = true;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          mustChangePassword: true,
          lastLogin: true,
          createdAt: true,
        },
      });

      // A password reset or a suspension must not leave live sessions behind.
      if (passwordWasReset || updateData.status === "SUSPENDED") {
        await revokeAllSessionsForUser(id);
      }

      return res.status(200).json({
        success: true,
        message: `User ${updatedUser.email} updated successfully.`,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({ success: false, message: "Failed to update user." });
    }
  });

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user account from PostgreSQL
 * @access  SUPER_ADMIN only
 */
app.delete(
  "/api/admin/users/:id",
  ...requireSuperAdmin,
  adminMutationLimiter,
  validateRequest({ params: UserIdParamSchema }),
  async (req, res) => {
    try {
      const { id } = res.locals.validated.params;

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account.",
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      await prisma.user.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: `User ${existingUser.email} deleted successfully.`,
      });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ success: false, message: "Failed to delete user." });
    }
  });

// ============================================================
// COUNTRIES LIST (for admin form dropdowns)
// ============================================================

/**
 * @route   GET /api/countries
 * @desc    Return all seeded countries for article form dropdowns
 */
app.get("/api/countries", async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      select: { id: true, name: true, flag: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ success: true, countries });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch countries" });
  }
});

// ============================================================
// ARTICLE CRUD ROUTES
// ============================================================

/**
 * @route   GET /api/admin/articles
 * @desc    List articles with optional filters, search and pagination
 * @query   status, category, search, page, limit
 * @access  EDITOR, ADMIN, SUPER_ADMIN
 */
app.get(
  "/api/admin/articles",
  ...requireEditor,
  validateRequest({ query: ArticleQuerySchema }),
  async (req, res) => {
    try {
      // Zod has already coerced and bounded page/limit, so no reparsing here.
      const {
        status,
        category,
        search,
        page: pageNum,
        limit: limitNum,
      } = res.locals.validated.query;
      const skip = (pageNum - 1) * limitNum;

      const where = {};
      if (status && status !== "ALL") where.status = status;
      if (category && category !== "ALL") where.category = category;
      if (search) {
        where.OR = [
          { headline: { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ];
      }

      const [articles, totalCount] = await prisma.$transaction([
        prisma.article.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
          include: {
            countries: {
              include: { country: { select: { id: true, name: true, flag: true } } },
            },
            primaryCountry: { select: { id: true, name: true, flag: true } },
          },
        }),
        prisma.article.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        articles,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
      });
    } catch (error) {
      console.error("Fetch admin articles error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch articles" });
    }
  });

/**
 * @route   POST /api/admin/articles
 * @desc    Create a new article with optional country tags (Prisma transaction)
 * @access  EDITOR, ADMIN, SUPER_ADMIN
 */
app.post(
  "/api/admin/articles",
  ...requireEditor,
  adminMutationLimiter,
  validateRequest({ body: ArticleCreateSchema }),
  async (req, res) => {
    try {
      const {
        slug, headline, summary, content, category, image,
        readingTime, breaking, featured, status, primaryCountryId, countryIds,
      } = res.locals.validated.body;

      if (!headline || !headline.trim()) {
        return res.status(400).json({ success: false, message: "Headline is required." });
      }
      if (!slug || !slug.trim()) {
        return res.status(400).json({ success: false, message: "Slug is required." });
      }
      if (!summary || !summary.trim()) {
        return res.status(400).json({ success: false, message: "Summary is required." });
      }
      if (!category) {
        return res.status(400).json({ success: false, message: "Category is required." });
      }

      const validCategories = ["UNIVERSITIES", "ADMISSIONS", "SCHOLARSHIPS", "VISA", "STUDENT_LIFE", "CAREER"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ success: false, message: "Invalid category value." });
      }

      const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const existing = await prisma.article.findUnique({ where: { slug: cleanSlug } });
      if (existing) {
        return res.status(400).json({ success: false, message: "An article with this slug already exists. Please use a different slug." });
      }

      const validStatuses = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"];
      const articleStatus = validStatuses.includes(status) ? status : "DRAFT";

      const newArticle = await prisma.$transaction(async (tx) => {
        const article = await tx.article.create({
          data: {
            slug: cleanSlug,
            headline: headline.trim(),
            summary: summary.trim(),
            content: content?.trim() || null,
            category,
            image: image?.trim() || null,
            readingTime: readingTime?.trim() || "4 min read",
            breaking: Boolean(breaking),
            featured: Boolean(featured),
            status: articleStatus,
            publishedAt: new Date(),
            primaryCountryId: primaryCountryId || null,
          },
        });

        if (Array.isArray(countryIds) && countryIds.length > 0) {
          await tx.articleCountry.createMany({
            data: countryIds.map((countryId) => ({ articleId: article.id, countryId })),
            skipDuplicates: true,
          });
        }

        return tx.article.findUnique({
          where: { id: article.id },
          include: {
            countries: { include: { country: true } },
            primaryCountry: true,
          },
        });
      });

      return res.status(201).json({
        success: true,
        message: "Article created successfully.",
        article: newArticle,
      });
    } catch (error) {
      console.error("Create article error:", error);
      if (error.code === "P2002") {
        const field = error.meta?.target ? ` (${error.meta.target.join(", ")})` : "";
        return res.status(409).json({ success: false, message: `An article with this unique value${field} already exists.` });
      }
      return res.status(500).json({ success: false, message: "Failed to create article." });
    }
  });

/**
 * @route   PUT /api/admin/articles/:id
 * @desc    Full update of an existing article with country sync
 * @access  EDITOR, ADMIN, SUPER_ADMIN
 */
app.put(
  "/api/admin/articles/:id",
  ...requireEditor,
  adminMutationLimiter,
  validateRequest({ params: ArticleIdParamSchema, body: ArticleUpdateSchema }),
  async (req, res) => {
    try {
      const { id } = res.locals.validated.params;
      const {
        slug, headline, summary, content, category, image,
        readingTime, breaking, featured, status, primaryCountryId, countryIds,
      } = res.locals.validated.body;

      if (!headline?.trim()) return res.status(400).json({ success: false, message: "Headline is required." });
      if (!slug?.trim()) return res.status(400).json({ success: false, message: "Slug is required." });
      if (!summary?.trim()) return res.status(400).json({ success: false, message: "Summary is required." });

      const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const slugConflict = await prisma.article.findFirst({ where: { slug: cleanSlug, NOT: { id } } });
      if (slugConflict) {
        return res.status(400).json({ success: false, message: "This slug is already in use by another article." });
      }

      const validStatuses = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"];
      const articleStatus = validStatuses.includes(status) ? status : "DRAFT";

      const updatedArticle = await prisma.$transaction(async (tx) => {
        await tx.article.update({
          where: { id },
          data: {
            slug: cleanSlug,
            headline: headline.trim(),
            summary: summary.trim(),
            content: content?.trim() || null,
            category,
            image: image?.trim() || null,
            readingTime: readingTime?.trim() || "4 min read",
            breaking: Boolean(breaking),
            featured: Boolean(featured),
            status: articleStatus,
            primaryCountryId: primaryCountryId || null,
          },
        });

        await tx.articleCountry.deleteMany({ where: { articleId: id } });
        if (Array.isArray(countryIds) && countryIds.length > 0) {
          await tx.articleCountry.createMany({
            data: countryIds.map((countryId) => ({ articleId: id, countryId })),
            skipDuplicates: true,
          });
        }

        return tx.article.findUnique({
          where: { id },
          include: {
            countries: { include: { country: true } },
            primaryCountry: true,
          },
        });
      });

      return res.status(200).json({ success: true, message: "Article updated successfully.", article: updatedArticle });
    } catch (error) {
      console.error("Update article error:", error);
      if (error.code === "P2025") return res.status(404).json({ success: false, message: "Article not found." });
      if (error.code === "P2002") {
        const field = error.meta?.target ? ` (${error.meta.target.join(", ")})` : "";
        return res.status(409).json({ success: false, message: `An article with this unique value${field} already exists.` });
      }
      return res.status(500).json({ success: false, message: "Failed to update article." });
    }
  });

/**
 * @route   PATCH /api/admin/articles/:id/status
 * @desc    Change only the status of an article (status transition endpoint)
 * @access  EDITOR, ADMIN, SUPER_ADMIN
 */
app.patch(
  "/api/admin/articles/:id/status",
  ...requireEditor,
  adminMutationLimiter,
  validateRequest({ params: ArticleIdParamSchema, body: ArticleStatusUpdateSchema }),
  async (req, res) => {
    try {
      const { id } = res.locals.validated.params;
      const { status } = res.locals.validated.body;
      const validStatuses = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }

      const article = await prisma.article.update({
        where: { id },
        data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined },
        select: { id: true, slug: true, headline: true, status: true },
      });

      return res.status(200).json({ success: true, message: `Article status changed to ${status}.`, article });
    } catch (error) {
      console.error("Update status error:", error);
      if (error.code === "P2025") return res.status(404).json({ success: false, message: "Article not found." });
      return res.status(500).json({ success: false, message: "Failed to update article status." });
    }
  });

/**
 * @route   DELETE /api/admin/articles/:id
 * @desc    Permanently delete article and its country junction rows (cascade)
 * @access  ADMIN, SUPER_ADMIN
 */
app.delete(
  "/api/admin/articles/:id",
  ...requireAdmin,
  adminMutationLimiter,
  validateRequest({ params: ArticleIdParamSchema }),
  async (req, res) => {
    try {
      const { id } = res.locals.validated.params;
      await prisma.article.delete({ where: { id } });
      return res.status(200).json({ success: true, message: "Article deleted successfully." });
    } catch (error) {
      console.error("Delete article error:", error);
      if (error.code === "P2025") return res.status(404).json({ success: false, message: "Article not found." });
      return res.status(500).json({ success: false, message: "Failed to delete article." });
    }
  });

// ============================================================
// RSS UTILITIES — supports Atom AND RSS 2.0
// Used only by the two admin RSS routes below.
// Mirrors src/lib/rss/parser.ts settings for consistency.
// ============================================================

/** RSS User-Agent sent with every feed request to avoid headless-fetch 403s. */
const RSS_USER_AGENT =
  "Mozilla/5.0 (compatible; AbroadBulletinBot/1.0; +https://abroadbulletin.com)";

/** Parser configured for both Atom and RSS 2.0 feeds. */
function createFeedParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    isArray: (name) =>
      name === "entry" ||          // Atom <entry>
      name === "item" ||           // RSS 2.0 <item>
      name === "media:content" ||  // multiple <media:content> per entry
      name === "media:thumbnail",  // multiple <media:thumbnail> per entry
  });
}

/** Returns true when the body looks like HTML rather than XML. */
function isHtmlBody(contentType, body) {
  if (contentType.includes("text/html")) return true;
  const t = body.trimStart();
  return t.startsWith("<!DOCTYPE") || t.toLowerCase().startsWith("<html");
}

/** Timeout ceiling for external feed requests (8 seconds) */
const RSS_TIMEOUT_MS = 8000;

/**
 * Fetch a feed URL and return raw entry/item objects.
 * Supports Atom (<feed><entry>) and RSS 2.0 (<rss><channel><item>).
 * Returns [] on any failure with a descriptive error log — never silently empty.
 */
async function fetchAtomEntriesRaw(url, logTag) {
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
      headers: {
        "User-Agent": RSS_USER_AGENT,
        Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*;q=0.8",
      },
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      console.warn(`[${logTag}] ⏱️ RSS feed request timed out after ${RSS_TIMEOUT_MS}ms (${url})`);
    } else {
      console.error(`[${logTag}] ❌ Network error fetching feed (${url}):`, err.message);
    }
    return [];
  }

  if (!res.ok) {
    console.error(`[${logTag}] ❌ HTTP ${res.status} ${res.statusText} from feed URL: ${url}`);
    return [];
  }

  let xml;
  try {
    xml = await res.text();
  } catch (err) {
    console.error(`[${logTag}] ❌ Failed to read response body:`, err.message);
    return [];
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (isHtmlBody(contentType, xml)) {
    console.error(
      `[${logTag}] ❌ Feed returned HTML instead of XML (Content-Type: ${contentType}). ` +
      `The URL may have changed, moved behind a login, or a CAPTCHA. URL: ${url}`
    );
    return [];
  }

  let parsed;
  try {
    parsed = createFeedParser().parse(xml);
  } catch (err) {
    console.error(`[${logTag}] ❌ Failed to parse XML:`, err.message);
    return [];
  }

  // Atom: <feed><entry>
  let entries = parsed?.feed?.entry;
  let format = "Atom";
  if (!Array.isArray(entries) || entries.length === 0) {
    // RSS 2.0: <rss><channel><item>
    entries = parsed?.rss?.channel?.item;
    format = "RSS 2.0";
  }
  // Single-entry guard: isArray config should prevent this, but be defensive
  if (entries && !Array.isArray(entries)) entries = [entries];
  entries = entries ?? [];

  if (entries.length === 0) {
    console.warn(
      `[${logTag}] ⚠️ Feed parsed OK but no <entry> (Atom) or <item> (RSS 2.0) found. URL: ${url}`
    );
    return [];
  }

  console.log(`[${logTag}] ✅ Loaded ${entries.length} entries from ${format} feed.`);
  return entries;
}

/** Extract href from Atom <link> field or RSS 2.0 plain text <link> node. */
function extractLink(linkField) {
  if (!linkField) return "";
  // RSS 2.0: <link>https://example.com</link> → plain string
  if (typeof linkField === "string") return linkField;
  // RSS 2.0: text node parsed with textNodeName="#text"
  if (typeof linkField === "object" && "#text" in linkField) return String(linkField["#text"] ?? "");
  // Atom: array of <link> elements — prefer rel="alternate"
  if (Array.isArray(linkField)) {
    const alt = linkField.find((l) => l?.["@_rel"] === "alternate" || !l?.["@_rel"]);
    return alt?.["@_href"] ?? alt?.["#text"] ?? "";
  }
  // Atom: single <link> object
  return linkField?.["@_href"] ?? linkField?.["#text"] ?? "";
}

/** Extract plain text from an Atom/RSS field (handles string | { "#text": "…" }). */
function extractText(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && "#text" in field) return String(field["#text"] ?? "");
  return "";
}

/** title → URL-safe slug with source prefix. */
function toSlugRss(title, prefix) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${prefix}-${base}`;
}

/**
 * Extract image URL from media:content, media:thumbnail, or enclosure.
 * Returns null if none found — caller should fall back to source.fallbackImage.
 */
function extractImage(entry) {
  // media:content
  const mediaContent = entry?.["media:content"];
  if (mediaContent) {
    const items = Array.isArray(mediaContent) ? mediaContent : [mediaContent];
    const img =
      items.find((m) => m?.["@_medium"] === "image" || m?.["@_type"]?.startsWith("image/")) ??
      items.find((m) => m?.["@_url"]);
    if (img?.["@_url"]) return String(img["@_url"]);
  }
  // media:thumbnail
  const mediaThumbnail = entry?.["media:thumbnail"];
  if (mediaThumbnail) {
    const items = Array.isArray(mediaThumbnail) ? mediaThumbnail : [mediaThumbnail];
    const url = items[0]?.["@_url"];
    if (url) return String(url);
  }
  // enclosure (RSS 2.0)
  const enclosure = entry?.enclosure;
  if (enclosure) {
    const items = Array.isArray(enclosure) ? enclosure : [enclosure];
    const imgEnc = items.find((e) => e?.["@_type"]?.startsWith("image/"));
    if (imgEnc?.["@_url"]) return String(imgEnc["@_url"]);
  }
  return null;
}

/** Normalize one raw Atom/RSS 2.0 entry for a given RSSSource DB record. Returns null if unusable. */
function normalizeRssEntry(entry, source) {
  try {
    const headline = extractText(entry?.title);
    if (!headline.trim()) return null;

    // Summary: Atom uses <summary>/<content>, RSS 2.0 uses <description>
    const rawSummary =
      extractText(entry?.summary) ||
      extractText(entry?.description) ||
      extractText(entry?.content) ||
      "";
    const summary = rawSummary.replace(/<[^>]+>/g, "").trim() || "No summary available.";

    // Date: Atom uses <published>/<updated>, RSS 2.0 uses <pubDate>
    const rawDate = entry?.published ?? entry?.updated ?? entry?.pubDate ?? "";

    const sourceUrl = extractLink(entry?.link);
    if (!sourceUrl) return null; // sourceUrl is our duplicate-detection key

    const slug = toSlugRss(headline, source.slugPrefix);

    // Image: try media fields and enclosure; fall back to source.fallbackImage
    const image = extractImage(entry) ?? source.fallbackImage;

    return {
      slug,
      headline,
      summary,
      sourceUrl,
      rawDate,
      image,
      sourceName: source.name,
      rssSourceId: source.id,
      countryId: source.countryId,
      category: source.category,
      slugPrefix: source.slugPrefix,
    };
  } catch (err) {
    console.error(`[RSS normalize] Error:`, err.message);
    return null;
  }
}

// ============================================================
// ADMIN RSS ROUTES
// ============================================================

/**
 * Fetches and normalizes live entries for every enabled RSSSource matching
 * `where`, deduped per-source by sourceUrl. Shared by the RSS preview route
 * and the shadow-mode comparison route so both read the legacy feeds through
 * one code path.
 */
async function fetchLegacyRssItems(where = { enabled: true }) {
  const dbSources = await prisma.rSSSource.findMany({ where });
  if (dbSources.length === 0) return [];

  const feedResults = await Promise.allSettled(
    dbSources.map(async (source) => {
      const entries = await fetchAtomEntriesRaw(source.feedUrl, `RSS Preview ${source.id}`);
      const items = [];
      const seenUrls = new Set();

      for (const entry of entries) {
        const normalized = normalizeRssEntry(entry, source);
        if (!normalized || seenUrls.has(normalized.sourceUrl)) continue;
        seenUrls.add(normalized.sourceUrl);
        items.push(normalized);
      }

      return items;
    })
  );

  const allItems = [];
  for (const result of feedResults) {
    if (result.status === "fulfilled") allItems.push(...result.value);
  }

  allItems.sort((a, b) => {
    const timeA = new Date(a.rawDate || 0).getTime();
    const timeB = new Date(b.rawDate || 0).getTime();
    return timeB - timeA;
  });

  return allItems;
}

/**
 * @route   GET /api/admin/rss/preview
 * @desc    Fetch live RSS items from all enabled sources and annotate
 *          each with whether it has already been imported into the DB.
 * @access  EDITOR, ADMIN, SUPER_ADMIN
 */
app.get("/api/admin/rss/preview", ...requireEditor, async (req, res) => {
  try {
    const allItems = await fetchLegacyRssItems({ enabled: true });

    // Batch check which sourceUrls already exist in DB
    const allSourceUrls = allItems.map((i) => i.sourceUrl).filter(Boolean);
    const existingArticles = await prisma.article.findMany({
      where: { sourceUrl: { in: allSourceUrls } },
      select: { id: true, sourceUrl: true, status: true, slug: true },
    });

    const importedMap = new Map(existingArticles.map((a) => [a.sourceUrl, a]));

    // Annotate each item
    const annotated = allItems.map((item) => {
      const existing = importedMap.get(item.sourceUrl);
      return {
        ...item,
        alreadyImported: !!existing,
        existingArticleId: existing?.id ?? null,
        existingStatus: existing?.status ?? null,
        existingSlug: existing?.slug ?? null,
      };
    });

    return res.status(200).json({ success: true, items: annotated, total: annotated.length });
  } catch (error) {
    console.error("RSS preview error:", error);
    return res.status(500).json({ success: false, message: "Failed to load RSS preview." });
  }
});

const SHADOW_COMPARE_COUNTRY_IDS = { CA: "canada", UK: "uk" };

/**
 * @route   GET /api/admin/shadow-compare?geo=CA|UK
 * @desc    Plan §5 shadow-mode check: diff what the legacy RSS feeds find live
 *          right now against what the new ingestion engine has already
 *          discovered and stored for the same country, by canonical URL.
 * @access  EDITOR, ADMIN, SUPER_ADMIN
 */
app.get("/api/admin/shadow-compare", ...requireEditor, async (req, res) => {
  try {
    const geo = String(req.query.geo || "").toUpperCase();
    const countryId = SHADOW_COMPARE_COUNTRY_IDS[geo];
    if (!countryId) {
      return res.status(400).json({
        success: false,
        message: `geo must be one of: ${Object.keys(SHADOW_COMPARE_COUNTRY_IDS).join(", ")}`,
      });
    }

    const [legacyItems, newItems] = await Promise.all([
      fetchLegacyRssItems({ enabled: true, countryId }),
      prisma.sourceItem.findMany({
        where: { contentSource: { countryId } },
        select: {
          id: true,
          title: true,
          canonicalUrl: true,
          publishedAt: true,
          contentSource: { select: { code: true, name: true } },
        },
      }),
    ]);

    // Canonicalize both sides so an RSS feed's un-normalized link and the
    // pipeline's stored canonicalUrl compare on equal footing. A malformed
    // URL on either side is skipped rather than failing the whole comparison.
    const safeCanonicalize = (rawUrl) => {
      try {
        return canonicalizeUrl(rawUrl);
      } catch {
        return null;
      }
    };
    const legacyByUrl = new Map(
      legacyItems
        .map((item) => [safeCanonicalize(item.sourceUrl), item])
        .filter(([url]) => url !== null)
    );
    const newByUrl = new Map(
      newItems
        .map((item) => [safeCanonicalize(item.canonicalUrl), item])
        .filter(([url]) => url !== null)
    );

    const matched = [];
    const oldOnly = [];
    const newOnly = [];

    for (const [url, legacyItem] of legacyByUrl) {
      const newItem = newByUrl.get(url);
      if (newItem) {
        matched.push({ url, title: legacyItem.headline, publishedAt: legacyItem.rawDate || null });
      } else {
        oldOnly.push({ url, title: legacyItem.headline, publishedAt: legacyItem.rawDate || null });
      }
    }
    for (const [url, newItem] of newByUrl) {
      if (!legacyByUrl.has(url)) {
        newOnly.push({
          url,
          title: newItem.title,
          publishedAt: newItem.publishedAt,
          source: newItem.contentSource?.name,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        geo,
        legacyCount: legacyByUrl.size,
        newCount: newByUrl.size,
        matched,
        oldOnly,
        newOnly,
      },
    });
  } catch (error) {
    console.error("Shadow compare error:", error);
    return res.status(500).json({ success: false, message: "Failed to compute shadow comparison." });
  }
});

/**
 * @route   POST /api/admin/articles/import-rss
 * @desc    Import a single RSS item into the database as a DRAFT article.
 *
 * The client sends only identifiers (rssSourceId + sourceUrl).
 * The server re-fetches the live feed, finds the matching entry,
 * normalizes it, checks for duplicates, then creates the Article + ArticleCountry
 * in a single Prisma transaction.
 * @access  EDITOR, ADMIN, SUPER_ADMIN
 */
app.post(
  "/api/admin/articles/import-rss",
  ...requireEditor,
  adminMutationLimiter,
  validateRequest({ body: RssImportSchema }),
  async (req, res) => {
    try {
      const { rssSourceId, sourceUrl: clientSourceUrl } = res.locals.validated.body;

      // ── 1. Validate inputs ──────────────────────────────────────────────────
      if (!rssSourceId || typeof rssSourceId !== "string") {
        return res.status(400).json({ success: false, message: "rssSourceId is required." });
      }
      if (!clientSourceUrl || typeof clientSourceUrl !== "string") {
        return res.status(400).json({ success: false, message: "sourceUrl is required." });
      }

      // ── 2. Validate RSSSource from DB (do NOT trust arbitrary source data) ──
      const dbSource = await prisma.rSSSource.findUnique({ where: { id: rssSourceId } });
      if (!dbSource) {
        return res.status(404).json({ success: false, message: `Unknown RSS source: ${rssSourceId}` });
      }
      if (!dbSource.enabled) {
        return res.status(400).json({ success: false, message: `RSS source "${dbSource.name}" is disabled.` });
      }
      if (!dbSource.feedUrl) {
        return res.status(400).json({ success: false, message: `RSS source "${dbSource.name}" has no feed URL.` });
      }
      if (!dbSource.countryId) {
        return res.status(400).json({ success: false, message: `RSS source "${dbSource.name}" has no country mapping.` });
      }

      // ── 3. Re-fetch the live feed server-side ───────────────────────────────
      const entries = await fetchAtomEntriesRaw(dbSource.feedUrl, `Import ${rssSourceId}`);
      if (entries.length === 0) {
        return res.status(502).json({ success: false, message: "RSS feed is currently unavailable or empty." });
      }

      // ── 4. Find the matching entry by sourceUrl ─────────────────────────────
      let matchedEntry = null;
      for (const entry of entries) {
        const url = extractLink(entry?.link);
        if (url === clientSourceUrl) {
          matchedEntry = entry;
          break;
        }
      }

      if (!matchedEntry) {
        // Item may have dropped off the feed window; fall back to client-provided data
        // but re-validate the sourceUrl domain matches the known feed domain
        const feedDomain = new URL(dbSource.feedUrl).hostname;
        let clientDomain;
        try { clientDomain = new URL(clientSourceUrl).hostname; } catch {
          return res.status(400).json({ success: false, message: "Invalid sourceUrl provided." });
        }
        if (!clientDomain.includes(feedDomain.split(".").slice(-2).join("."))) {
          return res.status(400).json({
            success: false,
            message: "The provided sourceUrl does not match the expected feed domain.",
          });
        }
        // Entry has aged off feed — cannot re-validate; refuse
        return res.status(404).json({
          success: false,
          message: "This RSS item is no longer available in the feed. It may have aged off. Please refresh the RSS preview.",
        });
      }

      // ── 5. Normalize from authoritative server-side data ───────────────────
      const normalized = normalizeRssEntry(matchedEntry, dbSource);
      if (!normalized) {
        return res.status(422).json({ success: false, message: "Could not normalize this RSS entry (missing title or URL)." });
      }

      // ── 6. Duplicate check by sourceUrl (primary) ──────────────────────────
      const duplicate = await prisma.article.findFirst({
        where: { sourceUrl: normalized.sourceUrl },
        select: { id: true, slug: true, status: true },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          alreadyImported: true,
          message: "This article has already been imported.",
          existingArticleId: duplicate.id,
          existingSlug: duplicate.slug,
          existingStatus: duplicate.status,
        });
      }

      // ── 7. Ensure slug uniqueness ───────────────────────────────────────────
      let finalSlug = normalized.slug;
      const slugExists = await prisma.article.findUnique({ where: { slug: finalSlug } });
      if (slugExists) {
        finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
      }

      // ── 8. Parse publication date safely ───────────────────────────────────
      let publishedAt = new Date();
      if (normalized.rawDate) {
        const parsed = new Date(normalized.rawDate);
        if (!isNaN(parsed.getTime())) publishedAt = parsed;
      }

      // ── 9. Create Article + ArticleCountry in a transaction ─────────────────
      const newArticle = await prisma.$transaction(async (tx) => {
        const article = await tx.article.create({
          data: {
            slug: finalSlug,
            headline: normalized.headline,
            summary: normalized.summary,
            content: null,
            category: normalized.category,
            image: normalized.image,
            readingTime: "3 min read",
            breaking: false,
            featured: false,
            status: "DRAFT",
            isRss: true,
            sourceUrl: normalized.sourceUrl,
            sourceName: normalized.sourceName,
            rssSourceId: normalized.rssSourceId,
            primaryCountryId: normalized.countryId,
            publishedAt,
          },
        });

        // Create ArticleCountry junction row
        await tx.articleCountry.create({
          data: { articleId: article.id, countryId: normalized.countryId },
        });

        return tx.article.findUnique({
          where: { id: article.id },
          include: {
            countries: { include: { country: { select: { id: true, name: true, flag: true } } } },
            primaryCountry: { select: { id: true, name: true, flag: true } },
            rssSource: { select: { id: true, name: true } },
          },
        });
      });

      return res.status(201).json({
        success: true,
        message: `"${newArticle.headline}" imported as DRAFT.`,
        article: newArticle,
      });
    } catch (error) {
      console.error("RSS import error:", error);
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          alreadyImported: true,
          message: "This article has already been imported.",
        });
      }
      return res.status(500).json({ success: false, message: "Failed to import article. Please try again." });
    }
  });

// Health check endpoint

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", database: "PostgreSQL abroad_bulletin", serverTime: new Date() });
});

/**
 * Fail-fast server startup: only listen after database connection is verified
 */
async function startServer() {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.error("Fatal: PostgreSQL database connection failed. Halting server startup.");
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Authentication Backend Server running on http://localhost:${PORT}`);
  });
}

startServer();
