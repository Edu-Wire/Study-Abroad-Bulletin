/**
 * RSS Aggregator — central entry point for all RSS data.
 *
 * The UI and page components import ONLY from this file.
 * They never import directly from ircc.ts, uk.ts, or any other
 * country-specific fetcher.
 *
 * How to add a new country later:
 *   1. Add a source entry in src/data/rssSources.ts.
 *   2. Create src/lib/rss/<country>.ts following the uk.ts pattern.
 *   3. Import its function here and add it to the Promise.allSettled call
 *      inside getAllNews().
 *   4. Add a named export like getCanadaNews / getUKNews if the country
 *      page needs its own isolated feed.
 *   Nothing else needs to change.
 *
 * Failure isolation:
 *   getAllNews() uses Promise.allSettled() so a single failed feed
 *   (network timeout, bad XML, etc.) never crashes or blocks the others.
 *   Each source fails independently and logs its own error.
 */

import { getIRCCNews } from "./ircc";
import { getUKVINews } from "./uk";
import { news as mockNews } from "@/data/mock";
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
// Merged feed (used by /news and /news/[slug])
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all enabled RSS feeds in parallel and merges the results with
 * the existing mock articles into a single NewsArticle[].
 *
 * Order: RSS articles appear first (newest government news at the top),
 * followed by mock articles for all other content.
 *
 * Deduplication: slug-based. If two sources ever produce the same slug
 * (very unlikely given the source prefixes), the first one wins.
 *
 * Fallback: if ALL RSS sources fail, the function still returns the full
 * mock dataset — the site never goes empty.
 */
export async function getAllNews(): Promise<NewsArticle[]> {
  // Fetch all sources in parallel. allSettled means one failure does NOT
  // reject the whole promise — we get a result (fulfilled or rejected) for each.
  const [canadaResult, ukResult] = await Promise.allSettled([
    getIRCCNews(),
    getUKVINews(),
  ]);

  // Collect articles from whichever sources succeeded
  const rssArticles: NewsArticle[] = [];

  if (canadaResult.status === "fulfilled") {
    rssArticles.push(...canadaResult.value);
  } else {
    console.error("[RSS Aggregator] Canada (IRCC) feed failed:", canadaResult.reason);
  }

  if (ukResult.status === "fulfilled") {
    rssArticles.push(...ukResult.value);
  } else {
    console.error("[RSS Aggregator] UK (UKVI) feed failed:", ukResult.reason);
  }

  // Merge RSS articles + mock data, deduplicating by slug.
  // RSS articles go first so real news appears at the top of /news.
  // Mock articles act as a fallback for all content not yet covered by RSS.
  const seenSlugs = new Set<string>();
  const merged: NewsArticle[] = [];

  for (const article of [...rssArticles, ...mockNews]) {
    if (!seenSlugs.has(article.slug)) {
      seenSlugs.add(article.slug);
      merged.push(article);
    }
  }

  return merged;
}
