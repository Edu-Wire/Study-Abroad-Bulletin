import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeUrl, hashCanonicalUrl } from "../../backend/src/modules/ingestion/utils/urlCanonicalizer.js";

test("URL Canonicalizer: normalizes case, ports, and trailing slashes", () => {
  const input = "HTTPS://WWW.Example.COM:443/news/updates/?utm_source=twitter&a=1&b=2#heading";
  const expected = "https://www.example.com/news/updates?a=1&b=2";
  const canonical = canonicalizeUrl(input);
  assert.equal(canonical, expected);
});

test("URL Canonicalizer: strips marketing and analytics tracking parameters", () => {
  const input = "https://example.com/article?fbclid=xyz&utm_campaign=summer&utm_medium=cpc&id=12345&ref=homepage";
  const expected = "https://example.com/article?id=12345";
  const canonical = canonicalizeUrl(input);
  assert.equal(canonical, expected);
});

test("URL Canonicalizer: deterministically sorts query parameters", () => {
  const url1 = "https://example.com/search?z=9&a=1&m=5";
  const url2 = "https://example.com/search?a=1&m=5&z=9";
  assert.equal(canonicalizeUrl(url1), canonicalizeUrl(url2));
  assert.equal(canonicalizeUrl(url1), "https://example.com/search?a=1&m=5&z=9");
});

test("URL Canonicalizer: generates stable 64-character SHA-256 hash", () => {
  const canonical = "https://example.com/news/entry-1";
  const hash1 = hashCanonicalUrl(canonical);
  const hash2 = hashCanonicalUrl(canonical);
  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
});

test("URL Canonicalizer: throws on invalid or unsupported protocols", () => {
  assert.throws(() => canonicalizeUrl("ftp://example.com/file"), /Unsupported protocol/);
  assert.throws(() => canonicalizeUrl("not-a-url"), /Invalid URL/);
  assert.throws(() => canonicalizeUrl(""), /Invalid URL/);
});
