/**
 * Central Public Article Data Layer
 *
 * This is the single source of truth for all public-facing article data.
 *
 * Data sources (merged in priority order):
 *   1. PostgreSQL `article` table — admin-curated editorial content (status = PUBLISHED)
 *   2. Live external RSS/Atom feeds — IRCC Canada, UKVI UK
 *
 * All sources are normalized to the shared `NewsArticle` frontend type.
 * Deduplication is by `slug`.
 *
 * FAILURE POLICY:
 *   - If PostgreSQL is unreachable, an error is logged and DB articles are []
 *   - If an RSS feed fails, that feed is [] (existing RSS behaviour preserved)
 *   - We do NOT silently fall back to mock.ts for news articles
 *
 * Consumers: src/app/page.tsx, src/app/news/page.tsx, src/app/news/[slug]/page.tsx,
 *            src/lib/rss/index.ts, src/components/home/*, src/app/countries/[slug]/page.tsx
 */

import prisma from "@/lib/prisma";
import type { NewsArticle, NewsCategory } from "@/data/mock";

// ---------------------------------------------------------------------------
// Category mapping: Prisma enum → frontend display string
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, NewsCategory> = {
  UNIVERSITIES: "Universities",
  ADMISSIONS:   "Admissions",
  SCHOLARSHIPS: "Scholarships",
  VISA:         "Visa",
  STUDENT_LIFE: "Student Life",
  CAREER:       "Career",
};

// Safe fallback image per category so no article ever renders a broken image
const CATEGORY_IMAGE: Record<string, string> = {
  UNIVERSITIES: "/images/news-library.jpg",
  ADMISSIONS:   "/images/news-library.jpg",
  SCHOLARSHIPS: "/images/news-scholarship.jpg",
  VISA:         "/images/news-canada-hero.jpg",
  STUDENT_LIFE: "/images/news-australia.jpg",
  CAREER:       "/images/news-library.jpg",
};

// ---------------------------------------------------------------------------
// Date formatting — reuses the same locale as the RSS parser for consistency
// ---------------------------------------------------------------------------

function formatPublishedDate(date: Date | string): string {
  try {
    return new Date(date).toLocaleDateString("en-GB", {
      day:   "numeric",
      month: "long",
      year:  "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

// ---------------------------------------------------------------------------
// Mapper: Prisma Article row → NewsArticle (frontend type)
// ---------------------------------------------------------------------------

type ArticleRecord = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content: string | null;
  category: string;
  readingTime: string;
  image: string | null;
  breaking: boolean;
  featured: boolean;
  isRss: boolean;
  sourceUrl: string | null;
  sourceName: string | null;
  publishedAt: Date | string;
  primaryCountry: { id: string; name: string; flag: string } | null;
};

type ArticlesApiResponse = {
  success: boolean;
  articles: ArticleRecord[];
};

function mapArticleToNewsArticle(article: ArticleRecord): NewsArticle {
  const cat = article.category as string;
  return {
    id:          article.id,
    slug:        article.slug,
    headline:    article.headline,
    summary:     article.summary,
    content:     article.content,
    category:    CATEGORY_MAP[cat] ?? "Universities",
    country:     article.primaryCountry?.name ?? "Global",
    date:        formatPublishedDate(article.publishedAt),
    readingTime: article.readingTime,
    image:       article.image || CATEGORY_IMAGE[cat] || "/images/news-library.jpg",
    breaking:    article.breaking,
    isRss:       article.isRss,
    sourceUrl:   article.sourceUrl ?? undefined,
    sourceName:  article.sourceName ?? undefined,
  };
}

const productionBackendUrl = "https://13-233-198-182.sslip.io";

function getApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production" ? productionBackendUrl : "");
  if (!raw) return null;
  const normalized = raw.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

async function getPublishedArticlesFromApi(): Promise<NewsArticle[] | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  try {
    const res = await fetch(
      `${apiBaseUrl}/admin/articles?status=PUBLISHED&limit=100`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as Partial<ArticlesApiResponse>;
    if (!data?.success || !Array.isArray(data.articles)) {
      throw new Error("Invalid articles response");
    }

    return data.articles.map(mapArticleToNewsArticle);
  } catch (error) {
    console.error(
      "[articles.ts] Failed to fetch published articles from backend API:",
      error
    );
    return null;
  }
}

async function getArticleBySlugFromApi(slug: string): Promise<NewsArticle | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return null;

  try {
    const res = await fetch(
      `${apiBaseUrl}/admin/articles?status=PUBLISHED&limit=100`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as Partial<ArticlesApiResponse>;
    if (!data?.success || !Array.isArray(data.articles)) {
      throw new Error("Invalid articles response");
    }

    const article = data.articles.find((item) => item.slug === slug);
    return article ? mapArticleToNewsArticle(article) : null;
  } catch (error) {
    console.error(
      `[articles.ts] Failed to fetch article "${slug}" from backend API:`,
      error
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core data fetchers
// ---------------------------------------------------------------------------

/**
 * Fetches all PUBLISHED articles from PostgreSQL.
 * Returns [] and logs the real error if the DB is unreachable.
 */
export async function getPublishedArticles(): Promise<NewsArticle[]> {
  const apiArticles = await getPublishedArticlesFromApi();
  if (apiArticles) return apiArticles;

  try {
    const rows = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        primaryCountry: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    return rows.map(mapArticleToNewsArticle);
  } catch (error) {
    // Log the real error so developers can see what went wrong in the terminal.
    // Do NOT silently swallow this error or return mock articles.
    console.error(
      "[articles.ts] ❌ Failed to fetch published articles from PostgreSQL:",
      error
    );
    return [];
  }
}

/**
 * Returns all public news: strictly PostgreSQL PUBLISHED articles (editorial + admin-approved RSS imports).
 * Un-imported raw RSS feeds remain in the Admin Panel and are never displayed publicly without admin approval.
 */
export async function getAllNews(): Promise<NewsArticle[]> {
  return getPublishedArticles();
}

/**
 * Returns the single most-recently-updated article where breaking = true and status = PUBLISHED.
 * Used by the BreakingStrip homepage component.
 * Returns null if no breaking article exists in the DB.
 */
export async function getBreakingArticle(): Promise<NewsArticle | null> {
  try {
    const row = await prisma.article.findFirst({
      where: {
        status:   "PUBLISHED",
        breaking: true,
      },
      include: {
        primaryCountry: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!row) return null;
    return mapArticleToNewsArticle(row);
  } catch (error) {
    console.error(
      "[articles.ts] ❌ Failed to fetch breaking article from PostgreSQL:",
      error
    );
    return null;
  }
}

/**
 * Returns a single article by slug.
 *
 * Priority:
 *   1. PostgreSQL PUBLISHED article (admin-authored content)
 *   2. RSS article from the merged feed
 *
 * Returns null if the article is not found in either source.
 */
export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const apiArticle = await getArticleBySlugFromApi(slug);
  if (apiArticle) return apiArticle;

  try {
    const row = await prisma.article.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
      },
      include: {
        primaryCountry: true,
      },
    });

    if (!row) return null;
    return mapArticleToNewsArticle(row);
  } catch (error) {
    console.error(
      `[articles.ts] ❌ PostgreSQL lookup failed for slug "${slug}":`,
      error
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin preview fetcher — returns any status article with full raw fields
// ---------------------------------------------------------------------------

export interface AdminArticleRaw {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content: string | null;
  category: string;
  image: string | null;
  readingTime: string;
  breaking: boolean;
  featured: boolean;
  isRss: boolean;
  status: string;
  sourceUrl: string | null;
  sourceName: string | null;
  publishedAt: Date;
  primaryCountryId: string | null;
  primaryCountry: { id: string; name: string; flag: string } | null;
  countries: { country: { id: string; name: string; flag: string } }[];
}

/**
 * Admin-only fetcher: returns a full article record for any status (DRAFT, PUBLISHED,
 * ARCHIVED, PENDING_REVIEW, REJECTED). Used by the Live Editor preview page so editors
 * can view and edit articles before they are published.
 */
export async function getArticleBySlugForAdmin(slug: string): Promise<AdminArticleRaw | null> {
  try {
    const row = await prisma.article.findFirst({
      where: { slug },
      include: {
        primaryCountry: true,
        countries: { include: { country: true } },
      },
    });
    if (!row) return null;
    return row as AdminArticleRaw;
  } catch (error) {
    console.error(
      `[articles.ts] ❌ Admin lookup failed for slug "${slug}":`,
      error
    );
    return null;
  }
}
