/**
 * Same-origin Backend-For-Frontend.
 *
 * Every browser API request goes to `/api/backend/*` on this origin. This
 * handler forwards it to the Express API server-side, so the browser never
 * learns the backend host and never holds a token it could leak.
 *
 * What this route is and is not:
 *  - It is a transport boundary. It attaches the session cookie and the BFF
 *    shared secret, and enforces origin/CSRF checks on state-changing requests.
 *  - It is NOT the authorization decision. Express re-reads the session and the
 *    user record on every request and remains the sole authority on session
 *    validity, account status, and roles. A request that slips past this layer
 *    still gets rejected there.
 */

import type { NextRequest } from "next/server";
import { getBackendUrl, getBffSharedSecret } from "@/lib/server/backendConfig";
import { resolveClientAddress } from "@/lib/server/clientAddress";

/** Never cache proxied API traffic. */
export const dynamic = "force-dynamic";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Request headers safe to forward upstream.
 *
 * An allowlist rather than a blocklist: `host`, `connection`, and anything
 * hop-by-hop must not be relayed, and neither should a client-supplied
 * `x-bff-secret` or `authorization`, which this route sets itself.
 */
const FORWARDABLE_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
];

/** Response headers safe to relay back to the browser. */
const FORWARDABLE_RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "ratelimit",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
  "ratelimit-policy",
  "retry-after",
];

function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return Response.json({ success: false, message, ...extra }, { status });
}

/**
 * Reject state-changing requests that did not originate from this site.
 *
 * With a SameSite=Lax cookie the browser already withholds the session from
 * cross-site POSTs, so this is the second of two independent barriers. Origin
 * is checked against the request's own host rather than a configured URL, which
 * keeps the check correct across environments without naming any host.
 */
function originIsTrusted(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  // Same-origin fetches from our own client code always send Origin.
  if (!origin) {
    // No Origin: allow only if a same-origin Referer is present, otherwise deny.
    const referer = request.headers.get("referer");
    if (!referer) return false;
    try {
      return new URL(referer).host === request.headers.get("host");
    } catch {
      return false;
    }
  }

  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
  let backendUrl: string;
  let sharedSecret: string;
  try {
    backendUrl = getBackendUrl();
    sharedSecret = getBffSharedSecret();
  } catch (error) {
    // Misconfiguration is an operator problem; do not leak details downstream.
    console.error("[bff] configuration error:", error);
    return jsonError(500, "The API gateway is not configured correctly.");
  }

  const { path } = await context.params;
  const segments = path ?? [];

  if (segments.length === 0) {
    return jsonError(404, "No API path supplied.");
  }

  // Guard against path traversal out of /api.
  if (segments.some((segment) => segment === ".." || segment.includes("\\"))) {
    return jsonError(400, "Invalid API path.");
  }

  if (STATE_CHANGING_METHODS.has(request.method) && !originIsTrusted(request)) {
    return jsonError(403, "Cross-origin request rejected.");
  }

  const search = request.nextUrl.search;
  const targetUrl = `${backendUrl}/api/${segments.map(encodeURIComponent).join("/")}${search}`;

  const headers = new Headers();
  for (const name of FORWARDABLE_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Prove to Express that this request came through the trusted BFF.
  headers.set("x-bff-secret", sharedSecret);

  // Relay the session cookie server-side. The browser sent it to this origin;
  // it never travels to the backend host by way of the browser.
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  // Tell Express who the real caller is, so its rate limiters bucket per user
  // rather than lumping every request under the BFF's own address.
  //
  // This is a distinct header, NOT a relayed x-forwarded-for: Express trusts it
  // only because X-BFF-Secret validated on the same request. Forwarding the
  // client's own x-forwarded-for would let any caller forge an address.
  const clientAddress = resolveClientAddress(request.headers);
  if (clientAddress) {
    headers.set("x-bff-client-address", clientAddress);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error) {
    console.error("[bff] upstream request failed:", error);
    return jsonError(502, "The API is unreachable. Please try again.");
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDABLE_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  // Relay Set-Cookie so login, logout, and session refresh reach the browser.
  // getSetCookie preserves multiple cookies, which a plain get() would collapse.
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const value of setCookies) {
    responseHeaders.append("set-cookie", value);
  }

  responseHeaders.set("cache-control", responseHeaders.get("cache-control") ?? "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
