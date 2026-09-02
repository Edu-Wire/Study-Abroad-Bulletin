/**
 * Dependency-free HTML extraction helpers.
 *
 * No `cheerio` in `package.json` and a lockfile change mid-sprint is a merge
 * conflict with Developer A, so this is a deliberately small regex/JSON-LD
 * extractor rather than a DOM parser. It is sufficient for government pages,
 * which are overwhelmingly server-rendered and semantically marked up.
 *
 * Extraction follows Blueprint 9.2 precedence:
 *   1. JSON-LD / embedded structured data
 *   2. server-rendered semantic elements (<article>, <main>, [role=main])
 *   3. the source's configured selector
 *   4. readable-text fallback
 *
 * Everything here is pure. Nothing fetches.
 */

/** Elements whose contents are never article body. */
const NOISE_BLOCKS =
  /<(script|style|noscript|nav|header|footer|aside|form|iframe|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Chrome that survives tag stripping: cookie banners, share bars, breadcrumbs. */
const NOISE_CLASS_BLOCK =
  /<(div|section|ul|p)\b[^>]*\b(class|id)\s*=\s*["'][^"']*\b(cookie|consent|breadcrumb|share|social|skip-link|site-header|site-footer|banner|newsletter|related-links|pagination|back-to-top)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi;

const BLOCK_BOUNDARY = /<\/(p|div|section|article|li|h[1-6]|tr|blockquote)\s*>/gi;

/** Remove scripts, chrome and comments. Keeps inline markup for the HTML copy. */
export function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(NOISE_BLOCKS, " ")
    .replace(NOISE_CLASS_BLOCK, " ");
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  rsquo: "'",
  lsquo: "'",
  ldquo: '"',
  rdquo: '"',
  hellip: "...",
  pound: "£",
  euro: "€",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

/** HTML -> readable text, preserving block structure as newlines. */
export function htmlToText(html: string): string {
  return decodeEntities(
    stripNoise(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(BLOCK_BOUNDARY, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/** Inner HTML of the first matching element, brace-counted by tag depth. */
export function extractElement(html: string, tag: string, attrPattern?: RegExp): string | null {
  const opener = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  let match: RegExpExecArray | null;

  while ((match = opener.exec(html)) !== null) {
    if (attrPattern && !attrPattern.test(match[0])) continue;

    // Walk forward counting nested opens/closes of the same tag.
    const scanner = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, "gi");
    scanner.lastIndex = match.index;
    let depth = 0;
    let token: RegExpExecArray | null;

    while ((token = scanner.exec(html)) !== null) {
      depth += token[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        return html.slice(match.index + match[0].length, token.index);
      }
    }
  }
  return null;
}

/** All JSON-LD blocks on the page, parsed; unparseable blocks are skipped. */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    try {
      const parsed: unknown = JSON.parse(decodeEntities(match[1].trim()));
      const graph =
        parsed && typeof parsed === "object" && "@graph" in parsed
          ? (parsed as { "@graph": unknown })["@graph"]
          : parsed;
      for (const node of Array.isArray(graph) ? graph : [graph]) {
        if (node && typeof node === "object") blocks.push(node as Record<string, unknown>);
      }
    } catch {
      // A malformed JSON-LD block is not a page failure; fall through to HTML.
    }
  }
  return blocks;
}

/** JSON-LD article body, when the page publishes one. Highest-fidelity source. */
export function jsonLdArticleBody(html: string): { body: string; datePublished?: string } | null {
  for (const node of extractJsonLd(html)) {
    const type = String(node["@type"] ?? "");
    if (!/Article|NewsArticle|Report|WebPage|GovernmentService/i.test(type)) continue;
    const body = node.articleBody ?? node.text;
    if (typeof body === "string" && body.trim().length > 200) {
      const published = node.datePublished ?? node.dateModified;
      return {
        body: decodeEntities(body).trim(),
        datePublished: typeof published === "string" ? published : undefined,
      };
    }
  }
  return null;
}

export interface ContentRegion {
  html: string;
  text: string;
  /** Which rung of the 9.2 ladder produced this. */
  strategy: "JSON_LD" | "SEMANTIC" | "CONFIGURED_SELECTOR" | "READABLE_FALLBACK";
}

/**
 * A page's meaningful content region, per the 9.2 fallback order.
 *
 * `configuredSelectors` accepts the simple forms the registry uses - `main`,
 * `article`, `.class`, `#id`, `[role=main]` - not full CSS.
 */
export function extractContentRegion(
  html: string,
  configuredSelectors: string[] = []
): ContentRegion | null {
  const jsonLd = jsonLdArticleBody(html);
  if (jsonLd) {
    return { html: jsonLd.body, text: jsonLd.body, strategy: "JSON_LD" };
  }

  for (const tag of ["article", "main"]) {
    const found = extractElement(html, tag);
    if (found && htmlToText(found).length > 200) {
      return { html: stripNoise(found), text: htmlToText(found), strategy: "SEMANTIC" };
    }
  }

  const roleMain = extractElement(html, "div", /\brole\s*=\s*["']main["']/i);
  if (roleMain && htmlToText(roleMain).length > 200) {
    return { html: stripNoise(roleMain), text: htmlToText(roleMain), strategy: "SEMANTIC" };
  }

  for (const selector of configuredSelectors) {
    const found = matchSimpleSelector(html, selector);
    if (found && htmlToText(found).length > 120) {
      return {
        html: stripNoise(found),
        text: htmlToText(found),
        strategy: "CONFIGURED_SELECTOR",
      };
    }
  }

  const body = extractElement(html, "body") ?? html;
  const text = htmlToText(body);
  if (text.length > 200) {
    return { html: stripNoise(body), text, strategy: "READABLE_FALLBACK" };
  }
  return null;
}

/** `main` | `.class` | `#id` | `[role=main]` | `tag.class` - nothing fancier. */
export function matchSimpleSelector(html: string, selector: string): string | null {
  const trimmed = selector.trim();

  const attr = /^\[([a-z-]+)=["']?([^\]"']+)["']?\]$/i.exec(trimmed);
  if (attr) {
    const pattern = new RegExp(`\\b${attr[1]}\\s*=\\s*["']${escapeRegExp(attr[2])}["']`, "i");
    return extractElement(html, "div", pattern) ?? extractElement(html, "section", pattern);
  }

  const classOrId = /^([a-z0-9]+)?([.#])([\w-]+)$/i.exec(trimmed);
  if (classOrId) {
    const [, tag = "div", kind, name] = classOrId;
    const pattern =
      kind === "."
        ? new RegExp(`\\bclass\\s*=\\s*["'][^"']*\\b${escapeRegExp(name)}\\b`, "i")
        : new RegExp(`\\bid\\s*=\\s*["']${escapeRegExp(name)}["']`, "i");
    return (
      extractElement(html, tag, pattern) ??
      extractElement(html, "div", pattern) ??
      extractElement(html, "section", pattern)
    );
  }

  return /^[a-z0-9]+$/i.test(trimmed) ? extractElement(html, trimmed) : null;
}

/**
 * A page that returned only a JS shell. Blueprint 6.2/9.2: find the underlying
 * JSON endpoint rather than reaching for a headless browser - so detection is a
 * reported failure reason, not a silent empty body.
 */
export function looksLikeJsShell(html: string, extractedTextLength: number): boolean {
  if (extractedTextLength > 400) return false;
  const hasAppRoot = /<div\b[^>]*\bid\s*=\s*["'](root|app|__next)["']/i.test(html);
  const scriptCount = (html.match(/<script\b/gi) ?? []).length;
  return hasAppRoot || (scriptCount > 3 && extractedTextLength < 200);
}

export interface ListingLink {
  href: string;
  text: string;
  html: string;
}

/** Anchors inside a region, in document order, with their inner text. */
export function extractLinks(html: string): ListingLink[] {
  const links: ListingLink[] = [];
  const pattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const text = htmlToText(match[2]);
    if (text) links.push({ href: decodeEntities(match[1]), text, html: match[0] });
  }
  return links;
}

/** `<time datetime="...">` or the first ISO-ish date in a listing row. */
export function extractDate(html: string): string | undefined {
  const timeAttr = /<time\b[^>]*\bdatetime\s*=\s*["']([^"']+)["']/i.exec(html);
  if (timeAttr) return timeAttr[1];

  const text = htmlToText(html);
  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
  if (iso) return iso[1];

  const longForm =
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i.exec(
      text
    );
  return longForm?.[1];
}

/** `<meta property="og:...">` / `<meta name="...">` lookup. */
export function extractMeta(html: string, name: string): string | undefined {
  const pattern = new RegExp(
    `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${escapeRegExp(name)}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
    "i"
  );
  const match = pattern.exec(html);
  return match ? decodeEntities(match[1]) : undefined;
}

/** `<link rel="canonical">`, the strongest URL identity a page can state. */
export function extractCanonicalLink(html: string): string | undefined {
  const match = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i.exec(html);
  return match ? decodeEntities(match[1]) : undefined;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
