/**
 * Feed entry mapping - one shape for Atom 1.0 and RSS 2.0.
 *
 * Operates on the object tree returned by `ctx.xml.parse` (Developer A's
 * XXE-safe parser). It never parses XML itself, so the security posture in
 * Blueprint 9.1 / [R26] stays in one place.
 */

export interface FeedEntry {
  /** Atom `<id>`. Strongest identity available in a feed. */
  id?: string;
  /** RSS `<guid>`. */
  guid?: string;
  title?: string;
  link?: string;
  published?: string;
  updated?: string;
  /** The synopsis. Never the article body unless the source says otherwise. */
  summary?: string;
  /** `content:encoded` / Atom `<content>`; still only a candidate body. */
  content?: string;
  categories?: string[];
}

type XmlNode = Record<string, unknown>;

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Node text. Parsers differ on how they surface a text node - a bare string, or
 * an object with `#text` - so both are handled.
 */
function text(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const node = value as XmlNode;
    const inner = node["#text"];
    if (typeof inner === "string") return inner.trim() || undefined;
  }
  return undefined;
}

function attr(value: unknown, name: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const node = value as XmlNode;
  const direct = node[`@_${name}`] ?? node[`@${name}`] ?? node[name];
  return typeof direct === "string" ? direct : undefined;
}

/**
 * Atom `<link>` is an element with an `href`; RSS `<link>` is text. Atom feeds
 * often carry several links, so the `alternate` relation is preferred and a
 * `self`/`edit` link is never mistaken for the article.
 */
function pickLink(raw: unknown): string | undefined {
  const candidates = asArray(raw);

  for (const candidate of candidates) {
    const rel = attr(candidate, "rel");
    const href = attr(candidate, "href");
    if (href && (!rel || rel === "alternate")) return href;
  }
  for (const candidate of candidates) {
    const href = attr(candidate, "href") ?? text(candidate);
    if (href && !/^(self|edit|hub)$/i.test(attr(candidate, "rel") ?? "")) return href;
  }
  return undefined;
}

function pickCategories(node: XmlNode): string[] {
  const raw = node.category ?? node.categories ?? node["dc:subject"];
  const values = asArray(raw)
    .map((entry) => attr(entry, "term") ?? text(entry))
    .filter((value): value is string => Boolean(value));
  return [...new Set(values)];
}

/** Locate the entry array in either dialect, however the parser nested it. */
function findEntryNodes(parsed: unknown): XmlNode[] {
  if (!parsed || typeof parsed !== "object") return [];
  const root = parsed as XmlNode;

  const feed = root.feed as XmlNode | undefined;
  if (feed) return asArray(feed.entry) as XmlNode[];

  const rss = root.rss as XmlNode | undefined;
  const channel = (rss?.channel ?? root.channel) as XmlNode | undefined;
  if (channel) return asArray(channel.item) as XmlNode[];

  // Some parsers hand back the channel/feed contents unwrapped.
  if (root.entry) return asArray(root.entry) as XmlNode[];
  if (root.item) return asArray(root.item) as XmlNode[];
  return [];
}

export function parseFeedEntries(parsed: unknown): FeedEntry[] {
  return findEntryNodes(parsed).map((node) => ({
    id: text(node.id),
    guid: text(node.guid),
    title: text(node.title),
    link: pickLink(node.link) ?? text(node.link),
    published: text(node.published) ?? text(node.pubDate) ?? text(node["dc:date"]),
    updated: text(node.updated) ?? text(node.lastBuildDate),
    summary: text(node.summary) ?? text(node.description),
    content: text(node["content:encoded"]) ?? text(node.content),
    categories: pickCategories(node),
  }));
}
