import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { XMLParser } from "fast-xml-parser";
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

/**
 * @route   PATCH /api/admin/users/:id
 * @desc    Update user profile, role, status, and/or reset password with Bcrypt hashing
 */
app.patch("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, status, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const updateData = {};
    if (firstName !== undefined && firstName.trim()) updateData.firstName = firstName.trim();
    if (lastName !== undefined && lastName.trim()) updateData.lastName = lastName.trim();
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    // Safely hash password with bcrypt if provided
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password.trim(), salt);
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
        lastLogin: true,
        createdAt: true,
      },
    });

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
 */
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

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

/**
 * Fetch a feed URL and return raw entry/item objects.
 * Supports Atom (<feed><entry>) and RSS 2.0 (<rss><channel><item>).
 * Returns [] on any failure with a descriptive error log — never silently empty.
 */
async function fetchAtomEntriesRaw(url, logTag) {
  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": RSS_USER_AGENT,
        Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*;q=0.8",
      },
    });
  } catch (err) {
    console.error(`[${logTag}] ❌ Network error fetching feed (${url}):`, err.message);
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
 * @route   GET /api/admin/rss/preview
 * @desc    Fetch live RSS items from all enabled sources and annotate
 *          each with whether it has already been imported into the DB.
 */
app.get("/api/admin/rss/preview", async (req, res) => {
  try {
    // Load all enabled RSSSource records from DB
    const dbSources = await prisma.rSSSource.findMany({
      where: { enabled: true },
    });

    if (dbSources.length === 0) {
      return res.status(200).json({ success: true, items: [] });
    }

    // Fetch all feeds in parallel
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

    // Flatten all items
    const allItems = [];
    for (const result of feedResults) {
      if (result.status === "fulfilled") allItems.push(...result.value);
    }

    // Sort newest to oldest by publication date
    allItems.sort((a, b) => {
      const timeA = new Date(a.rawDate || 0).getTime();
      const timeB = new Date(b.rawDate || 0).getTime();
      return timeB - timeA;
    });

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

/**
 * @route   POST /api/admin/articles/import-rss
 * @desc    Import a single RSS item into the database as a DRAFT article.
 *
 * The client sends only identifiers (rssSourceId + sourceUrl).
 * The server re-fetches the live feed, finds the matching entry,
 * normalizes it, checks for duplicates, then creates the Article + ArticleCountry
 * in a single Prisma transaction.
 */
app.post("/api/admin/articles/import-rss", async (req, res) => {
  try {
    const { rssSourceId, sourceUrl: clientSourceUrl } = req.body;

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
    return res.status(500).json({ success: false, message: "Failed to import article. Please try again." });
  }
});

// Health check endpoint

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", database: "PostgreSQL abroad_bulletin", serverTime: new Date() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Authentication Backend Server running on http://localhost:${PORT}`);
});
