/**
 * IRCC RSS Service — Canada
 *
 * Fetches the official Immigration, Refugees and Citizenship Canada (IRCC)
 * Atom feed and normalizes each entry into our NewsArticle type.
 *
 * Server-side only. Never import this in a Client Component.
 *
 * Feed URL, slug prefix, fallback image, and country/category metadata
 * all come from src/data/rssSources.ts — not hardcoded here.
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

// Looked up once at module load. The non-null assertion is safe because
// "ircc-canada" is always present in rssSources.ts.
const SOURCE = getSourceById("ircc-canada")!;

// ─────────────────────────────────────────────────────────────────────────────
// Entry normalizer (Canada-specific)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts one raw Atom entry (as parsed by fast-xml-parser) into a
 * NewsArticle. Returns null if the entry is too malformed to use (no title).
 * Wrapped in try/catch so one bad entry never breaks the rest of the feed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(entry: any): NewsArticle | null {
  try {
    const headline = extractText(entry?.title);
    if (!headline.trim()) return null;

    const rawSummary =
      extractText(entry?.summary) || extractText(entry?.content) || "";
    // Strip any HTML tags that Atom summaries sometimes contain
    const summary = rawSummary.replace(/<[^>]+>/g, "").trim() || "No summary available.";

    // IRCC feed uses <published>; fall back to <updated> if missing
    const date = formatDate(entry?.published ?? entry?.updated ?? "");
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
    console.error("[IRCC RSS] Failed to normalize entry:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns normalized IRCC articles.
 * Returns [] when the source is disabled or the feed is unavailable.
 */
export async function getIRCCNews(): Promise<NewsArticle[]> {
  if (!SOURCE.enabled) return [];

  const rawEntries = await fetchAtomEntries(
    SOURCE.feedUrl,
    RSS_REVALIDATE_SECONDS,
    "IRCC RSS"
  );

  const seenSlugs = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const entry of rawEntries) {
    const article = normalizeEntry(entry);
    if (!article || seenSlugs.has(article.slug)) continue;
    seenSlugs.add(article.slug);
    articles.push(article);
  }

  console.log(`[IRCC RSS] Loaded ${articles.length} articles from feed.`);
  return articles;
}
