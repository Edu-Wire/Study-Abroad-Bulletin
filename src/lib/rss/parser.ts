/**
 * Shared Atom feed parsing utilities.
 *
 * Used by every country-specific RSS fetcher (ircc.ts, uk.ts, …).
 * The goal is to avoid copy-pasting the same XML parsing boilerplate
 * into each fetcher file.
 *
 * What lives here:
 *   - fetchAtomEntries()  fetch a URL, parse the XML, return raw entries
 *   - toSlug()            title -> URL-safe slug with a source prefix
 *   - formatDate()        ISO date string -> human-readable date
 *   - extractLink()       Atom <link> element -> href string
 *   - extractText()       Atom text field -> plain string
 *
 * What does NOT live here:
 *   - normalizeEntry()    that is source-specific (country, name, image differ)
 *   - getXxxNews()        those are the public API in each country file
 */

import { XMLParser } from "fast-xml-parser";

/** How long Next.js caches each feed response before re-fetching (seconds). */
export const RSS_REVALIDATE_SECONDS = 3600; // 1 hour

// ─────────────────────────────────────────────────────────────────────────────
// XML parser factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an XMLParser configured consistently for all Atom feeds we consume.
 * Centralised here so every fetcher uses identical parser settings.
 */
function createAtomParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,   // We need @href, @rel from <link> elements
    attributeNamePrefix: "@_", // Attributes become @_href, @_rel, etc.
    textNodeName: "#text",     // Mixed-content nodes become { "#text": "…" }
    isArray: (name) => name === "entry", // <entry> is always an array, even if only one
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public fetch helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches an Atom feed URL, parses the XML, and returns the raw array of
 * <entry> objects exactly as fast-xml-parser produced them.
 *
 * Returns [] on any failure (network error, non-OK status, bad XML).
 * All failures are logged to the server console using the provided logTag
 * so each source can be identified independently in logs.
 *
 * The caller (normalizeEntry in each country file) is responsible for
 * turning raw entries into typed NewsArticle objects.
 *
 * @param url        The Atom feed URL to fetch.
 * @param revalidate Next.js revalidation interval in seconds.
 * @param logTag     Short label used in console messages, e.g. "IRCC RSS".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAtomEntries(url: string, revalidate: number, logTag: string): Promise<any[]> {
  // 1. Fetch
  let xml: string;
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) {
      console.error(`[${logTag}] HTTP error: ${res.status} ${res.statusText}`);
      return [];
    }
    xml = await res.text();
  } catch (err) {
    console.error(`[${logTag}] Network error while fetching feed:`, err);
    return [];
  }

  // 2. Parse
  try {
    const parser = createAtomParser();
    const parsed = parser.parse(xml);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = parsed?.feed?.entry ?? [];
    if (entries.length === 0) {
      console.warn(`[${logTag}] Feed parsed successfully but contained no entries.`);
    }
    return entries;
  } catch (err) {
    console.error(`[${logTag}] Failed to parse XML:`, err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared normalisation helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an article title into a URL-safe slug.
 * The prefix (e.g. "ircc", "ukvi") ensures slugs from different sources
 * never collide even if two sources publish identically-titled articles.
 *
 * Example: toSlug("Canada expands passport renewal", "ircc")
 *          -> "ircc-canada-expands-passport-renewal"
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
 * Formats an ISO 8601 date string into a human-readable date.
 * Returns "Unknown date" if the input is missing or unparseable
 * so one bad date never crashes the entire feed.
 */
export function formatDate(rawDate: string | undefined): string {
  if (!rawDate) return "Unknown date";
  try {
    return new Date(rawDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

/**
 * Extracts the href URL from an Atom <link> element.
 *
 * fast-xml-parser can represent an Atom <link> in three different shapes
 * depending on how many <link> elements the entry has and whether they have
 * attributes:
 *   - Plain string (rare)
 *   - Single object: { "@_href": "…", "@_rel": "alternate" }
 *   - Array of objects (when multiple <link> elements exist)
 *
 * This function handles all three cases and prefers rel="alternate".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractLink(linkField: any): string {
  if (!linkField) return "";
  if (typeof linkField === "string") return linkField;
  if (Array.isArray(linkField)) {
    // Prefer rel="alternate"; fall back to the first entry in the array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alt = linkField.find((l: any) => l?.["@_rel"] === "alternate" || !l?.["@_rel"]);
    return alt?.["@_href"] ?? "";
  }
  // Single link object: { "@_href": "…", "@_rel": "alternate" }
  return linkField?.["@_href"] ?? "";
}

/**
 * Extracts a plain text string from an Atom field that may be:
 *   - A plain string: "Some title"
 *   - A typed text object: { "#text": "Some title", "@_type": "html" }
 *
 * Returns "" rather than throwing if the field is missing or unrecognised.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractText(field: any): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && "#text" in field) {
    return String(field["#text"] ?? "");
  }
  return "";
}
