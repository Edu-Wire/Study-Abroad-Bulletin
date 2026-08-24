/**
 * adminFetch — Authenticated API client for all admin panel requests.
 *
 * Automatically:
 *  - Resolves the API base URL from NEXT_PUBLIC_API_URL env var.
 *  - Attaches Authorization: Bearer <token> from localStorage / cookies.
 *  - Sets Content-Type: application/json for mutation requests.
 *  - Returns parsed JSON responses.
 *  - Throws structured { success: false, message: string } on errors.
 */

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

/**
 * Retrieve the stored JWT token from localStorage or the auth_token cookie.
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  // Prefer localStorage token
  const ls = localStorage.getItem("authToken");
  if (ls) return ls;

  // Fallback to cookie
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Build default headers for admin requests.
 */
function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Core fetch wrapper for all admin API calls.
 */
export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  let data: T;
  try {
    data = await res.json();
  } catch {
    throw {
      success: false,
      message: `Server returned non-JSON response (HTTP ${res.status}).`,
    };
  }

  if (res.status === 401) {
    throw {
      success: false,
      message: "Session expired or invalid. Please log in again.",
      status: 401,
    };
  }

  if (res.status === 403) {
    throw {
      success: false,
      message: "Access denied: Insufficient permissions.",
      status: 403,
    };
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
