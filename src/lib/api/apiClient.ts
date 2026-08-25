/**
 * adminFetch — API client for all admin panel requests.
 *
 * Requests go to the same-origin BFF at `/api/backend/*`, which forwards them
 * to Express server-side. Deliberately absent:
 *  - no backend URL or host (the browser never learns one),
 *  - no Authorization header (there is no browser-readable token),
 *  - no cookie reads (the session cookie is HttpOnly by design).
 *
 * Authentication travels as the HttpOnly session cookie, which the browser
 * attaches automatically to this same-origin path.
 */

const API_BASE_PATH = "/api/backend";

export interface ApiError {
  success: false;
  message: string;
  status?: number;
}

/**
 * Core fetch wrapper for all admin API calls.
 *
 * @param path API path beginning with `/`, e.g. `/admin/articles`
 */
export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE_PATH}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw {
      success: false,
      message: `Server returned non-JSON response (HTTP ${res.status}).`,
      status: res.status,
    } satisfies ApiError;
  }

  if (res.status === 401) {
    throw {
      success: false,
      message: "Session expired or invalid. Please log in again.",
      status: 401,
    } satisfies ApiError;
  }

  if (res.status === 403) {
    throw {
      success: false,
      message: "Access denied: Insufficient permissions.",
      status: 403,
    } satisfies ApiError;
  }

  if (res.status === 429) {
    throw {
      success: false,
      message: "Too many requests. Please slow down and try again shortly.",
      status: 429,
    } satisfies ApiError;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export const adminGet = <T = unknown>(path: string) =>
  adminFetch<T>(path, { method: "GET" });

export const adminPost = <T = unknown>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "POST", body: JSON.stringify(body) });

export const adminPut = <T = unknown>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const adminPatch = <T = unknown>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const adminDelete = <T = unknown>(path: string) =>
  adminFetch<T>(path, { method: "DELETE" });
