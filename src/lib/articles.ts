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
import { getIRCCNews } from "@/lib/rss/ircc";
import { getUKVINews } from "@/lib/rss/uk";
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

function mapArticleToNewsArticle(
  article: {
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
    publishedAt: Date;
    primaryCountry: { id: string; name: string; flag: string } | null;
  }
): NewsArticle {
  const cat = article.category as string;
  return {
    id:          article.id,
    slug:        article.slug,
    headline:    article.headline,
    summary:     article.summary,
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

// ---------------------------------------------------------------------------
// Core data fetchers
// ---------------------------------------------------------------------------

/**
 * Fetches all PUBLISHED articles from PostgreSQL.
 * Returns [] and logs the real error if the DB is unreachable.
 */
export async function getPublishedArticles(): Promise<NewsArticle[]> {
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
 * Returns all public news: PostgreSQL PUBLISHED articles merged with live RSS.
 * This is the primary function used by /news, /news/[slug], and the homepage.
 *
 * Order: DB articles (newest first) appear before RSS articles.
 * Deduplication: by slug — DB article always wins over an RSS article with the same slug.
 */
export async function getAllNews(): Promise<NewsArticle[]> {
  // Fetch DB and RSS in parallel
  const [dbArticles, canadaResult, ukResult] = await Promise.allSettled([
    getPublishedArticles(),
    getIRCCNews(),
    getUKVINews(),
  ]);

  const db: NewsArticle[] =
    dbArticles.status === "fulfilled" ? dbArticles.value : [];

  const rss: NewsArticle[] = [];
  if (canadaResult.status === "fulfilled") {
    rss.push(...canadaResult.value);
  } else {
    console.error("[articles.ts] Canada RSS feed failed:", canadaResult.reason);
  }
  if (ukResult.status === "fulfilled") {
    rss.push(...ukResult.value);
  } else {
    console.error("[articles.ts] UK RSS feed failed:", ukResult.reason);
  }

  // Merge: DB first (higher priority), then RSS, deduplicate by slug
  const seen = new Set<string>();
  const merged: NewsArticle[] = [];

  for (const article of [...db, ...rss]) {
    if (!seen.has(article.slug)) {
      seen.add(article.slug);
      merged.push(article);
    }
  }

  return merged;
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
  // 1. Try PostgreSQL first
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

    if (row) return mapArticleToNewsArticle(row);
  } catch (error) {
    console.error(
      `[articles.ts] ❌ PostgreSQL lookup failed for slug "${slug}":`,
      error
    );
    // Fall through to RSS check
  }

  // 2. Try RSS articles
  try {
    const allRss = await getAllNews();
    return allRss.find((a) => a.slug === slug) ?? null;
  } catch {
    return null;
  }
}
