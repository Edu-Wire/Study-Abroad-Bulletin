/**
 * AbroadBulletin — HTML Sanitizer & Plaintext Extractor
 *
 * Strips active scripts, dangerous protocols, and unauthorized elements from
 * ingested source documents before editorial display and AI processing.
 */

// Dangerous tags completely removed including their contents
const STRIP_TAGS_WITH_CONTENT = /<(script|style|svg|math|iframe|object|embed|applet|noscript|template)[\s\S]*?<\/\1>/gi;

// Self-closing dangerous tags
const STRIP_STANDALONE_TAGS = /<(script|style|svg|math|iframe|object|embed|applet|meta|link|base)[\s\S]*?\/?>/gi;

// Disallowed inline event handlers (e.g. onload, onclick, onerror)
const EVENT_HANDLER_ATTRS = /\s*on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;

// Dangerous URI schemes in attributes (javascript:, vbscript:, data:)
const DANGEROUS_PROTOCOLS = /\s*(?:href|src|action|formaction)\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|'data:[^']*'|"data:[^"]*"|'vbscript:[^']*'|"vbscript:[^"]*"|[^\s>]+javascript:[^\s>]+)/gi;

/**
 * Sanitizes an HTML string to ensure safe editorial rendering.
 *
 * @param {string} rawHtml
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== "string") {
    return "";
  }

  let sanitized = rawHtml
    .replace(STRIP_TAGS_WITH_CONTENT, "")
    .replace(STRIP_STANDALONE_TAGS, "")
    .replace(EVENT_HANDLER_ATTRS, "")
    .replace(DANGEROUS_PROTOCOLS, "");

  return sanitized.trim();
}

/**
 * Extracts plain text from HTML by removing all tags and unescaping common HTML entities.
 *
 * @param {string} html
 * @returns {string} Clean plain text
 */
export function stripAllHtml(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  return html
    .replace(STRIP_TAGS_WITH_CONTENT, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
