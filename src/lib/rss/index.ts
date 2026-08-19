/**
 * RSS Aggregator — central entry point for all RSS data (public re-export).
 *
 * As of Phase 2 (PostgreSQL integration), the primary merged feed is served
 * by src/lib/articles.ts which combines PostgreSQL PUBLISHED articles with
 * live RSS. This file now re-exports from articles.ts so all existing callers
 * (news/page.tsx, news/[slug]/page.tsx) continue to work without change.
 *
 * Country-specific feeds (getCanadaNews, getUKNews) remain unchanged and are
 * still used directly by /countries/[slug]/page.tsx for live government feeds.
 *
 * How to add a new country later:
 *   1. Add a source entry in src/data/rssSources.ts.
 *   2. Create src/lib/rss/<country>.ts following the uk.ts pattern.
 *   3. Import and call it inside getPublishedArticles() in src/lib/articles.ts.
 *   4. Add a named export here if the country page needs an isolated feed.
 *   Nothing else needs to change.
 *
 * Failure isolation:
 *   getAllNews() in articles.ts uses Promise.allSettled() so a single failed
 *   feed never crashes or blocks the others.
 */

import { getIRCCNews } from "./ircc";
import { getUKVINews } from "./uk";
import type { NewsArticle } from "@/data/mock";

// ─────────────────────────────────────────────────────────────────────────────
// Per-country exports (used by /countries/[slug] pages)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns ONLY real IRCC RSS articles for Canada.
 * Used by /countries/canada to display live government news.
 * If the feed fails, returns [] — the page shows an appropriate empty state.
 */
export async function getCanadaNews(): Promise<NewsArticle[]> {
  return getIRCCNews();
}

/**
 * Returns ONLY real UKVI RSS articles for United Kingdom.
 * Used by /countries/uk to display live government news.
 * If the feed fails, returns [] — the page shows an appropriate empty state.
 */
export async function getUKNews(): Promise<NewsArticle[]> {
  return getUKVINews();
}

// ─────────────────────────────────────────────────────────────────────────────
// Merged feed — now powered by PostgreSQL + RSS via articles.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all public news: PostgreSQL PUBLISHED articles + live RSS feeds.
 *
 * Delegates to src/lib/articles.ts which is the single source of truth.
 * DB articles appear first (newest published at top), then RSS articles.
 * Deduplication is by slug; DB articles win over RSS duplicates.
 */
export async function getAllNews(): Promise<NewsArticle[]> {
  // Dynamic import to avoid circular dependency (articles.ts imports rss/ircc & rss/uk)
  const { getAllNews: getAll } = await import("@/lib/articles");
  return getAll();
}
