/**
 * France RSS Service — Service-Public (Government of France)
 *
 * Fetches the official Service-Public RSS 2.0 feed and normalises
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

const SOURCE = getSourceById("france-service-public")!;

// ─────────────────────────────────────────────────────────────────────────────
// Entry normalizer (France-specific)
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
    const summary =
      rawSummary
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim() || "No summary available.";

    // Service-Public uses <dc:date> or <pubDate>
    const rawDate =
      extractText(entry?.["dc:date"]) ||
      extractText(entry?.pubDate) ||
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
    console.error("[France RSS] Failed to normalize entry:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns normalized Service-Public France articles.
 * Returns [] when the source is disabled or the feed is unavailable.
 */
export async function getFranceNews(): Promise<NewsArticle[]> {
  if (!SOURCE || !SOURCE.enabled) return [];

  const rawEntries = await fetchFeedEntries(
    SOURCE.feedUrl,
    RSS_REVALIDATE_SECONDS,
    "France RSS"
  );

  const seenSlugs = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const entry of rawEntries) {
    const article = normalizeEntry(entry);
    if (!article || seenSlugs.has(article.slug)) continue;
    seenSlugs.add(article.slug);
    articles.push(article);
  }

  console.log(`[France RSS] Loaded ${articles.length} articles from feed.`);
  return articles;
}
