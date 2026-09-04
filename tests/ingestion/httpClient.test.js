import test from "node:test";
import assert from "node:assert/strict";
import {
  safeFetch,
  isPrivateOrReservedHost,
  isPrivateOrReservedIp,
  parseRetryAfter,
  calculateBackoffWithJitter,
} from "../../backend/src/modules/ingestion/utils/httpClient.js";

test("HTTP Client: detects and blocks private / loopback IP addresses (SSRF)", () => {
  assert.equal(isPrivateOrReservedHost("localhost"), true);
  assert.equal(isPrivateOrReservedHost("127.0.0.1"), true);
  assert.equal(isPrivateOrReservedHost("10.0.1.5"), true);
  assert.equal(isPrivateOrReservedHost("192.168.1.1"), true);
  assert.equal(isPrivateOrReservedHost("169.254.169.254"), true);
  assert.equal(isPrivateOrReservedHost("::1"), true);
  assert.equal(isPrivateOrReservedHost("gov.uk"), false);
  assert.equal(isPrivateOrReservedHost("canada.ca"), false);
});

test("HTTP Client: detects private/reserved resolved IPs (DNS rebinding guard)", () => {
  assert.equal(isPrivateOrReservedIp("127.0.0.1", "IPv4"), true);
  assert.equal(isPrivateOrReservedIp("169.254.169.254", "IPv4"), true);
  assert.equal(isPrivateOrReservedIp("8.8.8.8", "IPv4"), false);
  assert.equal(isPrivateOrReservedIp("::1", "IPv6"), true);
  assert.equal(isPrivateOrReservedIp("fd00::1", "IPv6"), true);
  assert.equal(isPrivateOrReservedIp("::ffff:127.0.0.1", "IPv6"), true);
  assert.equal(isPrivateOrReservedIp("2001:4860:4860::8888", "IPv6"), false);
});

test("HTTP Client: parses Retry-After seconds and HTTP dates", () => {
  assert.equal(parseRetryAfter("5", 1000), 5000);
  assert.equal(parseRetryAfter("0", 1000), 0);
  assert.equal(parseRetryAfter(null, 1000), 1000);
});

test("HTTP Client: calculates jittered exponential backoff", () => {
  const backoff1 = calculateBackoffWithJitter(1, 500, 10000);
  const backoff2 = calculateBackoffWithJitter(2, 500, 10000);
  assert.ok(backoff1 >= 375 && backoff1 <= 625);
  assert.ok(backoff2 >= 750 && backoff2 <= 1250);
});

test("HTTP Client: retries on retryable 500 errors and succeeds on recovery", async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    if (callCount === 1) {
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Map([["retry-after", "0"]]),
        text: async () => "Error",
      };
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Map([["content-type", "application/json"]]),
      text: async () => JSON.stringify({ success: true, count: 42 }),
    };
  };

  const response = await safeFetch("https://example.com/api/data", {
    fetchFn: mockFetch,
    maxRetries: 2,
    allowPrivateIps: true,
  });

  assert.equal(callCount, 2);
  assert.equal(response.ok, true);
  assert.equal(response.status, 200);
  assert.ok(response.text.includes("count"));
});

test("HTTP Client: handles 304 Not Modified when ETag matches", async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 304,
    statusText: "Not Modified",
    headers: new Map([["etag", '"abc123xyz"']]),
    text: async () => "",
  });

  const response = await safeFetch("https://example.com/feed.atom", {
    fetchFn: mockFetch,
    etag: '"abc123xyz"',
    allowPrivateIps: true,
  });

  assert.equal(response.status, 304);
  assert.equal(response.notModified, true);
  assert.equal(response.etag, '"abc123xyz"');
});

test("HTTP Client: enforces max redirect limit and detects redirect loops", async () => {
  const mockFetch = async (url) => ({
    ok: false,
    status: 301,
    statusText: "Moved Permanently",
    headers: new Map([["location", url === "https://example.com/a" ? "https://example.com/b" : "https://example.com/a"]]),
    text: async () => "",
  });

  await assert.rejects(
    async () => {
      await safeFetch("https://example.com/a", {
        fetchFn: mockFetch,
        maxRedirects: 3,
        allowPrivateIps: true,
      });
    },
    /Redirect loop detected/
  );
});

test("HTTP Client: enforces payload size cap", async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Map(),
    text: async () => "A".repeat(2000),
  });

  await assert.rejects(
    async () => {
      await safeFetch("https://example.com/huge", {
        fetchFn: mockFetch,
        maxPayloadBytes: 1000,
        allowPrivateIps: true,
      });
    },
    /Response payload size .* exceeded maximum allowed cap/
  );
});
