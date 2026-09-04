/**
 * Ingestion Admin API client with a registry-seeded fallback.
 *
 * Developer A owns `/api/admin/content-sources`, `/source-items`, `/source-runs`,
 * `/source-health` and `/source-changes` (mounted at `/api/admin` in
 * `backend/src/server.js`). Those routes may not have landed, or the Express
 * server may not be running, so every call here degrades to locally generated
 * data instead of an error screen - and the UI says so out loud rather than
 * presenting placeholders as live figures.
 *
 * Gate: `NEXT_PUBLIC_INGESTION_API=1` opts into the live API. Without it the
 * shell runs on fallback data by design.
 */

const API_BASE_PATH = "/api/backend";

export type DataOrigin = "LIVE" | "FALLBACK";

export interface ApiResult<T> {
  data: T;
  origin: DataOrigin;
  /** Populated on fallback: why the live call did not produce data. */
  notice?: string;
}

function liveApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_INGESTION_API === "1";
}

/**
 * Fetch from Express through the same-origin BFF, falling back on anything that
 * indicates the endpoint is not there yet: a 404, a connection failure, or an
 * HTML error page where JSON was expected.
 */
export async function fetchWithFallback<T>(
  path: string,
  buildFallback: () => T,
  init?: RequestInit
): Promise<ApiResult<T>> {
  if (!liveApiEnabled()) {
    return {
      data: buildFallback(),
      origin: "FALLBACK",
      notice: "Live ingestion API disabled (set NEXT_PUBLIC_INGESTION_API=1)",
    };
  }

  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, {
      credentials: "include",
      headers: { "content-type": "application/json" },
      ...init,
    });

    if (response.status === 404) {
      return {
        data: buildFallback(),
        origin: "FALLBACK",
        notice: `Awaiting Developer A endpoint: ${path}`,
      };
    }

    if (!response.ok) {
      return {
        data: buildFallback(),
        origin: "FALLBACK",
        notice: `Ingestion API returned ${response.status} for ${path}`,
      };
    }

    // A proxy or auth redirect can return HTML with a 200; parsing it as data
    // would put an error page's markup on screen as if it were records.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        data: buildFallback(),
        origin: "FALLBACK",
        notice: `Ingestion API returned ${contentType || "no content type"} for ${path}`,
      };
    }

    const payload = (await response.json()) as { success?: boolean; data?: T } | T;
    const data =
      payload && typeof payload === "object" && "data" in payload
        ? ((payload as { data: T }).data ?? buildFallback())
        : (payload as T);

    return { data, origin: "LIVE" };
  } catch {
    // ECONNREFUSED, DNS failure, aborted request: the API is simply not there.
    return {
      data: buildFallback(),
      origin: "FALLBACK",
      notice: `Could not reach the ingestion API (${path})`,
    };
  }
}

/**
 * Fire a state-changing action (enqueue a job, apply an editorial decision).
 * Returns whether the request was accepted; callers show optimistic state
 * either way and never poll for completion — a run's result arrives on the
 * next load.
 */
export async function postAction(
  path: string,
  body?: Record<string, unknown>
): Promise<{ accepted: boolean; notice: string }> {
  if (!liveApiEnabled()) {
    return {
      accepted: false,
      notice: "Not sent: live ingestion API is disabled in this environment.",
    };
  }

  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => null);

    if (response.ok) {
      return { accepted: true, notice: (payload && payload.message) || "Request accepted." };
    }
    if (response.status === 401 || response.status === 403) {
      return { accepted: false, notice: "Not authorised for this action." };
    }
    return {
      accepted: false,
      notice: (payload && payload.message) || `Request failed (${response.status}).`,
    };
  } catch {
    return { accepted: false, notice: "Could not reach the ingestion API." };
  }
}

/** Enqueue a manual sync run for a content source. */
export async function triggerSync(sourceId: string): Promise<{ accepted: boolean; notice: string }> {
  return postAction(`/admin/content-sources/${encodeURIComponent(sourceId)}/sync`);
}
