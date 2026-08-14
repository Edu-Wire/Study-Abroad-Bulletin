/**
 * UKVI RSS Service — United Kingdom
 *
 * Fetches the official GOV.UK / UK Visas and Immigration Atom feed and
 * normalizes each entry into our NewsArticle type.
 *
 * Server-side only. Never import this in a Client Component.
 *
 * Feed URL, slug prefix, fallback image, and country/category metadata
 * all come from src/data/rssSources.ts.
 *
 * Feed verified live on 2026-08-13:
 *   https://www.gov.uk/search/news-and-communications.atom?organisations[]=uk-visas-and-immigration
 *
 * GOV.UK Atom structure notes:
 *   - Uses <updated> for the entry timestamp (no separate <published>)
 *   - <link> is a single object with rel="alternate" and type="text/html"
 *   - <summary> is a typed text object { "#text": "…", "@_type": "html" }
 *   - <title> is a plain string
 * All of these are handled correctly by the shared parser utilities.
 */

import type { NewsArticle } from "@/data/mock";
import { getSourceById } from "@/data/rssSources";
import {
  fetchAtomEntries,
  toSlug,
  formatDate,
  extractLink,
  extractText,
  RSS_REVALIDATE_SECONDS,
} from "./parser";

const SOURCE = getSourceById("ukvi")!;

// ─────────────────────────────────────────────────────────────────────────────
// Entry normalizer (UK-specific)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts one raw Atom entry into a NewsArticle.
 * Returns null if the entry has no usable title.
 * Wrapped in try/catch so one bad entry never breaks the rest of the feed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(entry: any): NewsArticle | null {
  try {
    const headline = extractText(entry?.title);
    if (!headline.trim()) return null;

    const rawSummary =
      extractText(entry?.summary) || extractText(entry?.content) || "";
    const summary = rawSummary.replace(/<[^>]+>/g, "").trim() || "No summary available.";

    // GOV.UK Atom entries use <updated> rather than <published>
    const date = formatDate(entry?.updated ?? entry?.published ?? "");
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
    console.error("[UKVI RSS] Failed to normalize entry:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns normalized UKVI articles.
 * Returns [] when the source is disabled or the feed is unavailable.
 */
export async function getUKVINews(): Promise<NewsArticle[]> {
  if (!SOURCE.enabled) return [];

  const rawEntries = await fetchAtomEntries(
    SOURCE.feedUrl,
    RSS_REVALIDATE_SECONDS,
    "UKVI RSS"
  );

  const seenSlugs = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const entry of rawEntries) {
    const article = normalizeEntry(entry);
    if (!article || seenSlugs.has(article.slug)) continue;
    seenSlugs.add(article.slug);
    articles.push(article);
  }

  console.log(`[UKVI RSS] Loaded ${articles.length} articles from feed.`);
  return articles;
}
