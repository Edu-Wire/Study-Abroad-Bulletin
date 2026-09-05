/**
 * Ingestion Admin API client.
 *
 * Every call goes to Express through the same-origin BFF at `/api/backend`.
 * There is no mock mode and no environment gate: as of Day 3 the endpoints all
 * exist, and a flag that silently swapped invented figures for real ones was a
 * scaffold, not a feature.
 *
 * What remains is degradation, which is different. When the API cannot be
 * reached the call returns `origin: "FALLBACK"` with an empty result and a
 * notice explaining why, and the screen says so. An operator deciding whether a
 * source is trustworthy must never be shown a placeholder that looks like data.
 *
 * Route ownership: `/admin/content-sources`, `/source-items`, `/source-runs`
 * and `/source-health` are Developer A's operational API; `/source-changes`,
 * `/source-items/:id/ignore` and `/content-sources/:id/healthcheck` are
 * Developer B's editorial API. Both are mounted under `/api/admin`.
 */

const API_BASE_PATH = "/api/backend/admin";

export type DataOrigin = "LIVE" | "FALLBACK";

export interface ApiResult<T> {
  data: T;
  origin: DataOrigin;
  /** Populated on fallback: why the live call did not produce data. */
  notice?: string;
  /** Present when the endpoint returned a `meta` block (pagination, counts). */
  meta?: Record<string, unknown>;
}

/** Outcome of a mutation. Mutations never invent success. */
export interface MutationResult<T = unknown> {
  accepted: boolean;
  notice: string;
  data?: T;
}

function describeStatus(status: number, path: string): string {
  switch (status) {
    case 401:
      return "Your session has expired. Sign in again.";
    case 403:
      return "You do not have permission for this action.";
    case 404:
      return `Not found: ${path}`;
    case 429:
      return "Rate limited. Wait a moment and retry.";
    default:
      return `The ingestion API returned ${status} for ${path}`;
  }
}

/**
 * GET a JSON payload, degrading to `buildFallback()` on anything that means
 * "no data came back": a transport failure, a non-2xx, or an HTML error page
 * where JSON was expected. An auth redirect can return HTML with a 200, and
 * rendering that as records would put markup on screen as if it were rows.
 */
export async function fetchWithFallback<T>(
  path: string,
  buildFallback: () => T,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, {
      credentials: "include",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      ...init,
    });

    if (!response.ok) {
      return { data: buildFallback(), origin: "FALLBACK", notice: describeStatus(response.status, path) };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        data: buildFallback(),
        origin: "FALLBACK",
        notice: `The ingestion API returned ${contentType || "no content type"} for ${path}`,
      };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: T;
      meta?: Record<string, unknown>;
      summary?: Record<string, unknown>;
      message?: string;
    };

    if (payload && typeof payload === "object" && payload.success === false) {
      return {
        data: buildFallback(),
        origin: "FALLBACK",
        notice: payload.message ?? `The ingestion API rejected ${path}`,
      };
    }

    const data =
      payload && typeof payload === "object" && "data" in payload
        ? ((payload.data as T) ?? buildFallback())
        : (payload as unknown as T);

    return { data, origin: "LIVE", meta: payload?.meta ?? payload?.summary };
  } catch {
    // ECONNREFUSED, DNS failure, aborted request: the API is simply not there.
    return {
      data: buildFallback(),
      origin: "FALLBACK",
      notice: `Could not reach the ingestion API (${path}). Is the Express server running?`,
    };
  }
}

/**
 * POST a mutation and report exactly what happened.
 *
 * Job-enqueueing endpoints answer 202: the request was accepted, the work has
 * not run yet. That distinction is preserved in the notice rather than being
 * flattened into "done", because nothing on these screens polls for completion —
 * a run's result appears on the next load.
 */
export async function postMutation<T = unknown>(
  path: string,
  body?: unknown
): Promise<MutationResult<T>> {
  try {
    const response = await fetch(`${API_BASE_PATH}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json()) as { success?: boolean; message?: string; data?: T })
      : null;

    if (response.ok) {
      return {
        accepted: true,
        notice: payload?.message ?? (response.status === 202 ? "Queued." : "Done."),
        data: payload?.data,
      };
    }

    return {
      accepted: false,
      notice: payload?.message ?? describeStatus(response.status, path),
      data: payload?.data,
    };
  } catch {
    return { accepted: false, notice: "Could not reach the ingestion API." };
  }
}

// ============================================================
// Endpoints
// ============================================================

/** Enqueue a live sync run for one source. Accepts a registry code or a DB id. */
export function triggerSync(sourceId: string): Promise<MutationResult> {
  return postMutation(`/content-sources/${encodeURIComponent(sourceId)}/sync`);
}

/** Enqueue reconciliation over a period; the API defaults to the last 7 days. */
export function triggerReconcile(
  sourceId: string,
  range?: { periodStart?: string; periodEnd?: string }
): Promise<MutationResult> {
  return postMutation(`/content-sources/${encodeURIComponent(sourceId)}/reconcile`, range ?? {});
}

/** Partition a historical range into windows and enqueue them. */
export function triggerBackfill(
  sourceId: string,
  options?: { startDate?: string; endDate?: string; windowDays?: number }
): Promise<MutationResult> {
  return postMutation(`/content-sources/${encodeURIComponent(sourceId)}/backfill`, options ?? {});
}

/**
 * Run the adapter's healthcheck against the live endpoint, now.
 *
 * The one synchronous external call in the Admin surface, and deliberately so:
 * its whole purpose is to answer "does this source respond?" while the operator
 * is looking at the screen.
 */
export function runHealthcheck(sourceId: string): Promise<MutationResult<SourceHealthProbe>> {
  return postMutation<SourceHealthProbe>(
    `/content-sources/${encodeURIComponent(sourceId)}/healthcheck`
  );
}

/** Re-run AI assessment for an item, optionally against a specific version. */
export function reclassifyItem(itemId: string, versionId?: string): Promise<MutationResult> {
  return postMutation(`/source-items/${encodeURIComponent(itemId)}/reclassify`, { versionId });
}

/** Promote the item's candidate to a CMS draft. Always DRAFT; a human publishes. */
export function createDraft(itemId: string): Promise<MutationResult> {
  return postMutation(`/source-items/${encodeURIComponent(itemId)}/create-draft`);
}

/** Dismiss the item's candidate. Source evidence is retained. */
export function ignoreItem(itemId: string, reason: string): Promise<MutationResult> {
  return postMutation(`/source-items/${encodeURIComponent(itemId)}/ignore`, { reason });
}

/** Seed or re-sync the 28 Phase 1 registry sources into the database. */
export function seedSources(): Promise<MutationResult> {
  return postMutation(`/content-sources/seed`);
}

export interface SourceHealthProbe {
  code: string;
  adapter: string;
  officialUrl: string;
  state: string;
  checkedAt: string;
  message?: string;
  latencyMs?: number;
  healthStatus: string;
}
