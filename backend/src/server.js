import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "./config/db.js";
import { prisma } from "./config/prisma.js";

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || "studyabroadnews_secret_key_2026";

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Connect to Database
connectDB();

/**
 * @route   POST /api/signup
 * @desc    Register a new user in PostgreSQL
 */
app.post("/api/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide first name, last name, email, and password.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

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

    // Generate JWT Token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully in PostgreSQL!",
      token,
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
 * @desc    Authenticate user & return JWT token
 */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Logged in successfully!",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
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
 * @route   GET /api/me
 * @desc    Get current authenticated user info
 */
app.get("/api/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    List all platform users & staff for Admin panel
 */
app.get("/api/admin/users", async (req, res) => {
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
 */
app.post("/api/admin/users/invite", async (req, res) => {
  try {
    const { firstName, lastName, email, role, password } = req.body;

    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide first name, last name, email, and role.",
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

    const initialPassword = password || "Staff@123456";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(initialPassword, salt);

    const newUser = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `User created successfully with role ${role}.`,
      user: newUser,
    });
  } catch (error) {
    console.error("Invite user error:", error);
    return res.status(500).json({ success: false, message: "Failed to create user" });
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
 */
app.get("/api/admin/articles", async (req, res) => {
  try {
    const { status, category, search, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
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
 */
app.post("/api/admin/articles", async (req, res) => {
  try {
    const {
      slug, headline, summary, content, category, image,
      readingTime, breaking, featured, status, primaryCountryId, countryIds,
    } = req.body;

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
    return res.status(500).json({ success: false, message: "Failed to create article." });
  }
});

/**
 * @route   PUT /api/admin/articles/:id
 * @desc    Full update of an existing article with country sync
 */
app.put("/api/admin/articles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slug, headline, summary, content, category, image,
      readingTime, breaking, featured, status, primaryCountryId, countryIds,
    } = req.body;

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
    return res.status(500).json({ success: false, message: "Failed to update article." });
  }
});

/**
 * @route   PATCH /api/admin/articles/:id/status
 * @desc    Change only the status of an article (status transition endpoint)
 */
app.patch("/api/admin/articles/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
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
 */
app.delete("/api/admin/articles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.article.delete({ where: { id } });
    return res.status(200).json({ success: true, message: "Article deleted successfully." });
  } catch (error) {
    console.error("Delete article error:", error);
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Article not found." });
    return res.status(500).json({ success: false, message: "Failed to delete article." });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", database: "PostgreSQL abroad_bulletin", serverTime: new Date() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Authentication Backend Server running on http://localhost:${PORT}`);
});
