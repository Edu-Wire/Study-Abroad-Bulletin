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
import { getGermanyNews as getGermanGovNews } from "./germany";
import { getNetherlandsNews as getDutchGovNews } from "./netherlands";
import { getFranceNews as getFrenchGovNews } from "./france";
import { news as mockNews } from "@/data/mock";
import type { NewsArticle } from "@/data/mock";

// ─────────────────────────────────────────────────────────────────────────────
// Per-country exports (used by /countries/[slug] pages)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns ONLY real IRCC RSS articles for Canada.
 * Used by /countries/canada to display live government news.
 */
export async function getCanadaNews(): Promise<NewsArticle[]> {
  return getIRCCNews();
}

/**
 * Returns ONLY real UKVI RSS articles for United Kingdom.
 * Used by /countries/uk to display live government news.
 */
export async function getUKNews(): Promise<NewsArticle[]> {
  return getUKVINews();
}

/**
 * Returns ONLY real German Federal Foreign Office articles for Germany.
 * Used by /countries/germany to display live government news.
 */
export async function getGermanyNews(): Promise<NewsArticle[]> {
  return getGermanGovNews();
}

/**
 * Returns ONLY real Government.nl articles for Netherlands.
 * Used by /countries/netherlands to display live government news.
 */
export async function getNetherlandsNews(): Promise<NewsArticle[]> {
  return getDutchGovNews();
}

/**
 * Returns ONLY real Service-Public articles for France.
 * Used by /countries/france to display live government news.
 */
export async function getFranceNews(): Promise<NewsArticle[]> {
  return getFrenchGovNews();
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
 * Deduplication: slug-based.
 *
 * Failure isolation: uses Promise.allSettled() so any single failed feed
 * never crashes or blocks the other feeds.
 */
export async function getAllNews(): Promise<NewsArticle[]> {
  const [
    canadaResult,
    ukResult,
    germanyResult,
    netherlandsResult,
    franceResult,
  ] = await Promise.allSettled([
    getIRCCNews(),
    getUKVINews(),
    getGermanGovNews(),
    getDutchGovNews(),
    getFrenchGovNews(),
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

  if (germanyResult.status === "fulfilled") {
    rssArticles.push(...germanyResult.value);
  } else {
    console.error("[RSS Aggregator] Germany feed failed:", germanyResult.reason);
  }

  if (netherlandsResult.status === "fulfilled") {
    rssArticles.push(...netherlandsResult.value);
  } else {
    console.error("[RSS Aggregator] Netherlands feed failed:", netherlandsResult.reason);
  }

  if (franceResult.status === "fulfilled") {
    rssArticles.push(...franceResult.value);
  } else {
    console.error("[RSS Aggregator] France feed failed:", franceResult.reason);
  }

  // Merge RSS articles + mock data, deduplicating by slug.
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

