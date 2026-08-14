/**
 * Shared RSS & Atom feed parsing utilities.
 *
 * Used by all country-specific RSS fetchers (ircc.ts, uk.ts, germany.ts, netherlands.ts, france.ts).
 * Centralises XML parsing boilerplate, HTTP fetching, error handling, date formatting,
 * and slug generation.
 *
 * Supported Feed Formats:
 *   - Atom 1.0 (<feed><entry>...</entry></feed>)
 *   - RSS 2.0  (<rss><channel><item>...</item></channel></rss>)
 */

import { XMLParser } from "fast-xml-parser";

/** How long Next.js caches each feed response before re-fetching (seconds). */
export const RSS_REVALIDATE_SECONDS = 3600; // 1 hour

// ─────────────────────────────────────────────────────────────────────────────
// XML parser factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an XMLParser configured consistently for both Atom and RSS 2.0 feeds.
 * - Parses attributes (@_href, @_rel, etc.)
 * - Normalises text nodes ({ "#text": "…" })
 * - Ensures <entry> and <item> are always treated as arrays even when single
 */
function createXmlParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    isArray: (name) => name === "entry" || name === "item",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public fetch helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches an Atom or RSS 2.0 feed URL, parses the XML, and returns the raw array
 * of <entry> (Atom) or <item> (RSS 2.0) objects.
 *
 * Returns [] on any failure (network error, non-OK status, invalid XML).
 * All failures are logged with logTag for easy debugging.
 *
 * @param url        The Atom or RSS feed URL to fetch.
 * @param revalidate Next.js revalidation interval in seconds.
 * @param logTag     Short label for console messages, e.g. "Germany RSS".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchFeedEntries(
  url: string,
  revalidate: number,
  logTag: string
): Promise<any[]> {
  // 1. Fetch with appropriate User-Agent & Accept headers for government APIs
  let xml: string;
  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 StudyAbroadNews/1.0",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      console.error(`[${logTag}] HTTP error: ${res.status} ${res.statusText}`);
      return [];
    }
    xml = await res.text();
  } catch (err) {
    console.error(`[${logTag}] Network error while fetching feed:`, err);
    return [];
  }

  // 2. Parse XML (supports Atom and RSS 2.0)
  try {
    const parser = createXmlParser();
    const parsed = parser.parse(xml);

    // Atom entries: parsed.feed.entry
    // RSS 2.0 items: parsed.rss.channel.item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] =
      parsed?.feed?.entry ?? parsed?.rss?.channel?.item ?? [];

    if (entries.length === 0) {
      console.warn(
        `[${logTag}] Feed parsed successfully but contained no entries.`
      );
    }
    return entries;
  } catch (err) {
    console.error(`[${logTag}] Failed to parse XML:`, err);
    return [];
  }
}

/**
 * Backwards compatibility alias for fetchFeedEntries.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAtomEntries(
  url: string,
  revalidate: number,
  logTag: string
): Promise<any[]> {
  return fetchFeedEntries(url, revalidate, logTag);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared normalisation helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an article title into a URL-safe slug with a unique source prefix.
 *
 * Example: toSlug("New Student Visa Rules", "deaa")
 *          -> "deaa-new-student-visa-rules"
 */
export function toSlug(title: string, prefix: string): string {
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
 * Formats ISO 8601 or RFC 822/2822 date strings into "14 August 2026".
 * Returns "Unknown date" if input is unparseable so one bad date never crashes a feed.
 */
export function formatDate(rawDate: string | undefined): string {
  if (!rawDate) return "Unknown date";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

/**
 * Extracts the href URL from an Atom <link> object/array or RSS <link> text.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractLink(linkField: any): string {
  if (!linkField) return "";
  if (typeof linkField === "string") return linkField.trim();
  if (Array.isArray(linkField)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alt = linkField.find(
      (l: any) => l?.["@_rel"] === "alternate" || !l?.["@_rel"]
    );
    if (typeof alt === "string") return alt.trim();
    return (alt?.["@_href"] ?? alt?.["#text"] ?? "").trim();
  }
  return (linkField?.["@_href"] ?? linkField?.["#text"] ?? "").trim();
}

/**
 * Extracts a plain text string from any XML field (plain string or { "#text": "…" }).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractText(field: any): string {
  if (!field) return "";
  if (typeof field === "string") return field.trim();
  if (typeof field === "number") return String(field);
  if (typeof field === "object" && "#text" in field) {
    return String(field["#text"] ?? "").trim();
  }
  return "";
}

