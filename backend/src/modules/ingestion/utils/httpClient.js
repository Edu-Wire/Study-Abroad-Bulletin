/**
 * AbroadBulletin — Resilient Generic HTTP Client
 *
 * Provides safe HTTP fetching with:
 * - Exponential backoff + jitter retry on network errors, 429, and 5xx
 * - Respect for `Retry-After` headers
 * - Conditional GET passthrough (ETag / Last-Modified -> 304 Not Modified)
 * - Maximum redirect limits with loop detection
 * - Payload size caps to prevent memory exhaustion
 * - SSRF protection against private / loopback IP ranges
 */

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 500;
const DEFAULT_MAX_BACKOFF_MS = 10000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const DEFAULT_USER_AGENT =
  "AbroadBulletin-IngestionBot/1.0 (+https://abroadbulletin.com/bot; bot@abroadbulletin.com)";

/**
 * Checks if a hostname or IP points to a private, loopback, or cloud-metadata address.
 *
 * @param {string} hostname
 * @returns {boolean}
 */
export function isPrivateOrReservedHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase().trim();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  // IPv4 private ranges
  // 10.0.0.0/8
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  // 192.168.0.0/16
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  // 169.254.0.0/16 (Link-local / AWS instance metadata)
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  return false;
}

/**
 * Parses Retry-After header value into milliseconds.
 *
 * @param {string|null} retryAfterHeader
 * @param {number} defaultDelayMs
 * @param {number} maxDelayMs
 * @returns {number} Delay in milliseconds
 */
export function parseRetryAfter(retryAfterHeader, defaultDelayMs, maxDelayMs = 60000) {
  if (!retryAfterHeader) return defaultDelayMs;

  const seconds = Number.parseInt(retryAfterHeader, 10);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, maxDelayMs);
  }

  const dateParsed = Date.parse(retryAfterHeader);
  if (!Number.isNaN(dateParsed)) {
    const diff = dateParsed - Date.now();
    return diff > 0 ? Math.min(diff, maxDelayMs) : defaultDelayMs;
  }

  return defaultDelayMs;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff with full jitter.
 *
 * @param {number} attempt 1-indexed attempt number
 * @param {number} baseMs
 * @param {number} maxMs
 * @returns {number}
 */
export function calculateBackoffWithJitter(attempt, baseMs = 500, maxMs = 10000) {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));
  // Apply jitter between 0.75 and 1.25
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.round(exponential * jitter);
}

/**
 * Performs a resilient HTTP request tailored for source ingestion.
 *
 * @param {string} url Target URL
 * @param {object} [options={}]
 * @param {string} [options.method="GET"]
 * @param {Record<string, string>} [options.headers={}]
 * @param {string} [options.etag]
 * @param {string} [options.lastModified]
 * @param {number} [options.timeoutMs=15000]
 * @param {number} [options.maxRetries=3]
 * @param {number} [options.maxRedirects=5]
 * @param {number} [options.maxPayloadBytes=10485760]
 * @param {boolean} [options.allowPrivateIps=false]
 * @param {Function} [options.fetchFn=globalThis.fetch]
 * @returns {Promise<{
 *   ok: boolean,
 *   status: number,
 *   statusText: string,
 *   text: string,
 *   headers: Record<string, string>,
 *   etag: string | null,
 *   lastModified: string | null,
 *   notModified: boolean,
 *   durationMs: number
 * }>}
 */
export async function safeFetch(url, options = {}) {
  const {
    method = "GET",
    headers = {},
    etag,
    lastModified,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxPayloadBytes = DEFAULT_MAX_PAYLOAD_BYTES,
    allowPrivateIps = false,
    fetchFn = globalThis.fetch,
  } = options;

  let currentUrl = url;
  let redirectCount = 0;
  const visitedUrls = new Set([currentUrl]);

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const startTime = Date.now();
    try {
      const parsedUrl = new URL(currentUrl);

      if (!allowPrivateIps && isPrivateOrReservedHost(parsedUrl.hostname)) {
        throw new Error(
          `SSRF Security Violation: Access to private or loopback host "${parsedUrl.hostname}" is denied.`
        );
      }

      // Build request headers
      const requestHeaders = {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
        ...headers,
      };

      if (etag) {
        requestHeaders["If-None-Match"] = etag;
      }
      if (lastModified) {
        requestHeaders["If-Modified-Since"] = lastModified;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetchFn(currentUrl, {
          method,
          headers: requestHeaders,
          redirect: "manual", // Handle redirects manually for safety and counting
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const responseHeaders = {};
      if (response.headers && typeof response.headers.forEach === "function") {
        response.headers.forEach((val, key) => {
          responseHeaders[key.toLowerCase()] = val;
        });
      }

      const durationMs = Date.now() - startTime;
      const resEtag = responseHeaders["etag"] || null;
      const resLastModified = responseHeaders["last-modified"] || null;

      // Handle 304 Not Modified
      if (response.status === 304) {
        return {
          ok: true,
          status: 304,
          statusText: "Not Modified",
          text: "",
          headers: responseHeaders,
          etag: resEtag || etag || null,
          lastModified: resLastModified || lastModified || null,
          notModified: true,
          durationMs,
        };
      }

      // Handle redirects (301, 302, 303, 307, 308)
      if (
        response.status >= 300 &&
        response.status < 400 &&
        responseHeaders["location"]
      ) {
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new Error(
            `Too many redirects (${redirectCount} > ${maxRedirects}) while requesting ${url}`
          );
        }

        const nextLocation = new URL(responseHeaders["location"], currentUrl).toString();
        if (visitedUrls.has(nextLocation)) {
          throw new Error(`Redirect loop detected: ${nextLocation} visited multiple times.`);
        }

        visitedUrls.add(nextLocation);
        currentUrl = nextLocation;
        // Continue loop without counting as a retry attempt
        continue;
      }

      // Handle retryable status codes (429, 500, 502, 503, 504)
      const isRetryable =
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;

      if (isRetryable && attempt <= maxRetries) {
        const retryAfter = responseHeaders["retry-after"];
        const delayMs = parseRetryAfter(
          retryAfter,
          calculateBackoffWithJitter(attempt, DEFAULT_BACKOFF_BASE_MS, DEFAULT_MAX_BACKOFF_MS)
        );
        await sleep(delayMs);
        continue;
      }

      // Read response body with size cap
      const bodyText = await response.text();
      const bodyBytes = Buffer.byteLength(bodyText, "utf8");
      if (bodyBytes > maxPayloadBytes) {
        throw new Error(
          `Response payload size (${bodyBytes} bytes) exceeded maximum allowed cap of ${maxPayloadBytes} bytes.`
        );
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        text: bodyText,
        headers: responseHeaders,
        etag: resEtag,
        lastModified: resLastModified,
        notModified: false,
        durationMs,
      };
    } catch (err) {
      const isFatal =
        err.name === "AbortError" ||
        err.message.includes("SSRF") ||
        err.message.includes("redirect") ||
        err.message.includes("Redirect");

      if (attempt <= maxRetries && !isFatal) {
        const delayMs = calculateBackoffWithJitter(
          attempt,
          DEFAULT_BACKOFF_BASE_MS,
          DEFAULT_MAX_BACKOFF_MS
        );
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Failed to complete HTTP request to ${url} after ${maxRetries + 1} attempts.`);
}
