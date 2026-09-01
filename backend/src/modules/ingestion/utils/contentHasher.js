import crypto from "node:crypto";

/**
 * Normalizes text content by collapsing consecutive whitespace, trimming edges,
 * and standardizing line breaks.
 *
 * @param {string} content
 * @returns {string} Normalized string
 */
export function normalizeContentWhitespace(content) {
  if (!content || typeof content !== "string") {
    return "";
  }
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Computes a SHA-256 content hash of normalized text or HTML.
 * Used for immutable SourceDocumentVersion deduplication.
 *
 * @param {string} rawContent
 * @returns {string} SHA-256 hex string (64 characters)
 */
export function hashContent(rawContent) {
  const normalized = normalizeContentWhitespace(rawContent);
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}
