/**
 * Germany RSS Service — German Federal Foreign Office (Auswärtiges Amt)
 *
 * Fetches the official Federal Foreign Office RSS 2.0 feed and normalises
 * each item into our NewsArticle type.
 *
 * Server-side only. Never import this in a Client Component.
 *
 * Feed URL, slug prefix, fallback image, and country/category metadata
 * all come from src/data/rssSources.ts.
 */

import type { NewsArticle } from "@/data/mock";
import { getSourceById } from "@/data/rssSources";
import {
  fetchFeedEntries,
  toSlug,
  formatDate,
  extractLink,
  extractText,
  RSS_REVALIDATE_SECONDS,
} from "./parser";

const SOURCE = getSourceById("germany-aa")!;

// ─────────────────────────────────────────────────────────────────────────────
// Entry normalizer (Germany-specific)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts one raw RSS 2.0 <item> into a NewsArticle.
 * Returns null if the item has no usable title.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(entry: any): NewsArticle | null {
  try {
    const headline = extractText(entry?.title);
    if (!headline.trim()) return null;

    const rawSummary =
      extractText(entry?.description) ||
      extractText(entry?.summary) ||
      extractText(entry?.content) ||
      "";
    // Strip HTML and unescape HTML entities like &nbsp;
    const summary =
      rawSummary
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim() || "No summary available.";

    const rawDate =
      extractText(entry?.pubDate) ||
      extractText(entry?.["dc:date"]) ||
      extractText(entry?.published) ||
      extractText(entry?.updated) ||
      "";
    const date = formatDate(rawDate);
    const sourceUrl = extractLink(entry?.link);
    const slug = toSlug(headline, SOURCE.slugPrefix);

    return {
      id: slug,
      slug,
      headline,
      summary,
      date,
      category: SOURCE.category,
      country: SOURCE.country,
      image: SOURCE.fallbackImage,
      readingTime: "3 min read",
      isRss: true,
      sourceUrl: sourceUrl || undefined,
      sourceName: SOURCE.name,
    };
  } catch (err) {
    console.error("[Germany RSS] Failed to normalize entry:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns normalized German Federal Foreign Office articles.
 * Returns [] when the source is disabled or the feed is unavailable.
 */
export async function getGermanyNews(): Promise<NewsArticle[]> {
  if (!SOURCE || !SOURCE.enabled) return [];

  const rawEntries = await fetchFeedEntries(
    SOURCE.feedUrl,
    RSS_REVALIDATE_SECONDS,
    "Germany RSS"
  );

  const seenSlugs = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const entry of rawEntries) {
    const article = normalizeEntry(entry);
    if (!article || seenSlugs.has(article.slug)) continue;
    seenSlugs.add(article.slug);
    articles.push(article);
  }

  console.log(`[Germany RSS] Loaded ${articles.length} articles from feed.`);
  return articles;
}
