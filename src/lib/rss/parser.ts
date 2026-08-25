/**
 * Shared Atom/RSS 2.0 feed parsing utilities.
 *
 * Supports BOTH feed formats:
 *   - Atom:    <feed><entry>…</entry></feed>
 *   - RSS 2.0: <rss><channel><item>…</item></channel></rss>
 *
 * Used by every country-specific RSS fetcher (ircc.ts, uk.ts, …).
 *
 * Public exports:
 *   - fetchAtomEntries()  fetch a URL, detect format, parse XML, return raw entries
 *   - extractImage()      extract image URL from media:content / media:thumbnail / enclosure
 *   - toSlug()            title → URL-safe slug with a source prefix
 *   - formatDate()        ISO / RFC 822 date string → human-readable date
 *   - extractLink()       Atom <link> or RSS 2.0 <link> text node → href string
 *   - extractText()       Atom typed text / RSS 2.0 text node → plain string
 *
 * What does NOT live here:
 *   - normalizeEntry()    source-specific (country, name, fallbackImage differ per source)
 *   - getXxxNews()        public API in each per-country file
 */

import { XMLParser } from "fast-xml-parser";

/** How long Next.js caches each feed response before re-fetching (seconds). */
export const RSS_REVALIDATE_SECONDS = 3600; // 1 hour
export const RSS_FETCH_TIMEOUT_MS = 8000; // 8 seconds timeout ceiling

/**
 * Sent with every outgoing RSS/Atom HTTP request.
 * A descriptive bot string helps avoid 403 responses from servers
 * that block bare Node.js fetch calls with no User-Agent.
 */
const RSS_USER_AGENT =
  "Mozilla/5.0 (compatible; AbroadBulletinBot/1.0; +https://abroadbulletin.com)";

// ─────────────────────────────────────────────────────────────────────────────
// XML parser factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an XMLParser configured for both Atom and RSS 2.0 feeds.
 *
 * Both <entry> (Atom) and <item> (RSS 2.0) are listed in isArray so a feed
 * containing exactly one entry is never returned as a plain object instead of
 * a 1-element array.
 */
function createFeedParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,          // We need @href, @rel, @url from <link>, <media:content>
    attributeNamePrefix: "@_",        // Attributes become @_href, @_rel, @_url, etc.
    textNodeName: "#text",            // Mixed-content nodes become { "#text": "…" }
    isArray: (name) =>
      name === "entry" ||             // Atom <entry>
      name === "item" ||              // RSS 2.0 <item>
      name === "media:content" ||     // multiple <media:content> per entry
      name === "media:thumbnail",     // multiple <media:thumbnail> per entry
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when the response body appears to be HTML rather than XML.
 * Used to produce a clear, actionable error instead of silently returning [].
 */
function isHtmlResponse(contentType: string, body: string): boolean {
  if (contentType.includes("text/html")) return true;
  const trimmed = body.trimStart();
  return trimmed.startsWith("<!DOCTYPE") || trimmed.toLowerCase().startsWith("<html");
}

/**
 * Extracts the usable entry/item array from a parsed XML document.
 * Tries the Atom path first, then RSS 2.0.
 * Guards the edge case where fast-xml-parser returns a single entry as a plain
 * object (shouldn't happen with the isArray config, but handled defensively).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEntries(
  parsed: any,
  logTag: string
): { entries: any[]; format: "Atom" | "RSS 2.0" | "unknown" } {
  // Atom: <feed><entry>
  const atomEntries = parsed?.feed?.entry;
  if (Array.isArray(atomEntries) && atomEntries.length > 0) {
    return { entries: atomEntries, format: "Atom" };
  }
  // Single Atom entry as object (edge-case guard)
  if (atomEntries && !Array.isArray(atomEntries)) {
    console.warn(
      `[${logTag}] ⚠️ Atom feed returned a single <entry> as an object — wrapping into array.`
    );
    return { entries: [atomEntries], format: "Atom" };
  }

  // RSS 2.0: <rss><channel><item>
  const rssItems = parsed?.rss?.channel?.item;
  if (Array.isArray(rssItems) && rssItems.length > 0) {
    return { entries: rssItems, format: "RSS 2.0" };
  }
  // Single RSS 2.0 item as object (edge-case guard)
  if (rssItems && !Array.isArray(rssItems)) {
    console.warn(
      `[${logTag}] ⚠️ RSS 2.0 feed returned a single <item> as an object — wrapping into array.`
    );
    return { entries: [rssItems], format: "RSS 2.0" };
  }

  return { entries: [], format: "unknown" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public fetch helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a feed URL, detects whether it is Atom or RSS 2.0, parses the XML,
 * and returns the raw array of <entry> / <item> objects.
 *
 * FAILURE HANDLING (all produce explicit logs — never silent []):
 *   - Network / DNS error              → console.error + return []
 *   - Non-2xx HTTP status              → console.error + return []
 *   - HTML response instead of XML     → console.error + return []
 *   - Invalid / unparseable XML        → console.error + return []
 *   - Zero usable entries after parse  → console.warn  + return []
 *
 * The fetchAtomEntries name and signature are preserved so ircc.ts and uk.ts
 * require zero changes.
 *
 * @param url        The Atom or RSS 2.0 feed URL to fetch.
 * @param revalidate Next.js revalidation interval in seconds.
 * @param logTag     Short label used in console messages, e.g. "IRCC RSS".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAtomEntries(
  url: string,
  revalidate: number,
  logTag: string
): Promise<any[]> {
  // ── 1. HTTP fetch ──────────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS),
      next: { revalidate },
      headers: {
        "User-Agent": RSS_USER_AGENT,
        Accept:
          "application/atom+xml, application/rss+xml, application/xml, text/xml, */*;q=0.8",
      },
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      console.warn(`[${logTag}] ⏱️ RSS fetch timed out after ${RSS_FETCH_TIMEOUT_MS}ms (${url})`);
    } else {
      console.error(`[${logTag}] ❌ Network error fetching feed (${url}):`, err);
    }
    return [];
  }

  if (!response.ok) {
    console.error(
      `[${logTag}] ❌ HTTP ${response.status} ${response.statusText} from feed URL: ${url}`
    );
    return [];
  }

  // ── 2. Read body ───────────────────────────────────────────────────────────
  let body: string;
  try {
    body = await response.text();
  } catch (err) {
    console.error(`[${logTag}] ❌ Failed to read response body from ${url}:`, err);
    return [];
  }

  // ── 3. HTML guard ──────────────────────────────────────────────────────────
  const contentType = response.headers.get("content-type") ?? "";
  if (isHtmlResponse(contentType, body)) {
    console.error(
      `[${logTag}] ❌ Feed returned HTML instead of XML ` +
        `(Content-Type: "${contentType}"). ` +
        `The URL may have changed, moved behind a login, or require a CAPTCHA. ` +
        `URL: ${url}`
    );
    return [];
  }

  // ── 4. Parse XML ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    const parser = createFeedParser();
    parsed = parser.parse(body);
  } catch (err) {
    console.error(`[${logTag}] ❌ Failed to parse XML from ${url}:`, err);
    return [];
  }

  // ── 5. Extract entries (Atom or RSS 2.0) ───────────────────────────────────
  const { entries, format } = extractEntries(parsed, logTag);

  if (entries.length === 0) {
    console.warn(
      `[${logTag}] ⚠️ Feed parsed successfully but contained zero usable entries. ` +
        `Checked Atom <feed><entry> and RSS 2.0 <rss><channel><item>. URL: ${url}`
    );
    return [];
  }

  console.log(`[${logTag}] ✅ Loaded ${entries.length} entries from ${format} feed.`);
  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Image extraction helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to extract an image URL from a raw RSS/Atom entry.
 *
 * Checks, in priority order:
 *   1. <media:content url="…">            — used by many modern RSS 2.0 feeds
 *   2. <media:thumbnail url="…">          — common in news / photo feeds
 *   3. <enclosure url="…" type="image/…"> — RSS 2.0 enclosure element
 *
 * Returns null when no image is found.
 * The caller should fall back to source.fallbackImage when null is returned.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractImage(entry: any): string | null {
  // ── 1. media:content ──────────────────────────────────────────────────────
  const mediaContent = entry?.["media:content"];
  if (mediaContent) {
    const items = Array.isArray(mediaContent) ? mediaContent : [mediaContent];
    const imageItem =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.find((m: any) => m?.["@_medium"] === "image" || m?.["@_type"]?.startsWith("image/")) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items.find((m: any) => m?.["@_url"]);
    const url = imageItem?.["@_url"];
    if (url && typeof url === "string") return url;
  }

  // ── 2. media:thumbnail ────────────────────────────────────────────────────
  const mediaThumbnail = entry?.["media:thumbnail"];
  if (mediaThumbnail) {
    const items = Array.isArray(mediaThumbnail) ? mediaThumbnail : [mediaThumbnail];
    const url = items[0]?.["@_url"];
    if (url && typeof url === "string") return url;
  }

  // ── 3. enclosure (RSS 2.0) ────────────────────────────────────────────────
  const enclosure = entry?.enclosure;
  if (enclosure) {
    const items = Array.isArray(enclosure) ? enclosure : [enclosure];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageEnclosure = items.find((e: any) => e?.["@_type"]?.startsWith("image/"));
    const url = imageEnclosure?.["@_url"];
    if (url && typeof url === "string") return url;
  }

  return null;
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
 * Extracts the href URL from an Atom <link> element or an RSS 2.0 <link> text node.
 *
 * fast-xml-parser can represent a <link> in several shapes:
 *   - Plain string (RSS 2.0 text-only <link>)
 *   - Object with "#text" (RSS 2.0 text node when textNodeName is set)
 *   - Single Atom object: { "@_href": "…", "@_rel": "alternate" }
 *   - Array of Atom objects (when multiple <link> elements exist)
 *
 * Handles all four cases and prefers rel="alternate".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractLink(linkField: any): string {
  if (!linkField) return "";
  // RSS 2.0: <link>https://example.com</link> → plain string
  if (typeof linkField === "string") return linkField;
  // RSS 2.0: text node parsed with textNodeName="#text"
  if (typeof linkField === "object" && "#text" in linkField)
    return String(linkField["#text"] ?? "");
  // Atom: array of <link> elements — prefer rel="alternate"
  if (Array.isArray(linkField)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alt = linkField.find((l: any) => l?.["@_rel"] === "alternate" || !l?.["@_rel"]);
    return alt?.["@_href"] ?? alt?.["#text"] ?? "";
  }
  // Atom: single <link> object: { "@_href": "…", "@_rel": "alternate" }
  return linkField?.["@_href"] ?? linkField?.["#text"] ?? "";
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
