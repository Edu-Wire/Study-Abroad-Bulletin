/**
 * Automated Sources - catalog, view types, and the API call with fallback.
 *
 * The catalog is NOT hand-maintained here. `src/lib/generated/phase1-sources.json`
 * is written by `npm run verify:sources` from the ingestion registry, so the
 * Admin shell shows the real 28 sources with their real families, schedules and
 * Appendix A references even before Developer A's endpoints exist. Importing the
 * registry module directly would pull Zod and the validation stack into the
 * browser bundle; the snapshot is the seam.
 *
 * Operational fields (health, lag, counters) come from the API. When it cannot
 * be reached they stay at "unknown" rather than being invented, and the UI says
 * the catalog is all it is showing - see `DataOrigin`.
 */

import snapshot from "@/lib/generated/phase1-sources.json";
import { fetchWithFallback, type ApiResult } from "@/lib/ingestion-api";

export const SOURCE_GEOS = ["CA", "UK", "AU", "US", "DE", "NZ", "IE", "EU"] as const;
export type SourceGeo = (typeof SOURCE_GEOS)[number];

/** Transport badges from Blueprint 13.1. */
export const TRANSPORT_BADGES = ["API", "ATOM", "RSS", "WEB", "WATCH", "DATA"] as const;
export type TransportBadge = (typeof TRANSPORT_BADGES)[number];

/** Health states from Blueprint 14.1. */
export const HEALTH_STATES = [
  "HEALTHY",
  "DEGRADED",
  "STALE",
  "ERROR",
  "BACKFILLING",
  "UNKNOWN",
] as const;
export type HealthState = (typeof HEALTH_STATES)[number];

export type SourcePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface GeoMeta {
  code: SourceGeo;
  label: string;
  flag: string;
}

export const GEO_META: Record<SourceGeo, GeoMeta> = {
  CA: { code: "CA", label: "Canada", flag: "🇨🇦" },
  UK: { code: "UK", label: "United Kingdom", flag: "🇬🇧" },
  AU: { code: "AU", label: "Australia", flag: "🇦🇺" },
  US: { code: "US", label: "United States", flag: "🇺🇸" },
  DE: { code: "DE", label: "Germany", flag: "🇩🇪" },
  NZ: { code: "NZ", label: "New Zealand", flag: "🇳🇿" },
  IE: { code: "IE", label: "Ireland", flag: "🇮🇪" },
  EU: { code: "EU", label: "European Union", flag: "🇪🇺" },
};

export interface ContentSource {
  code: string;
  name: string;
  geo: SourceGeo;
  transport: TransportBadge;
  family: string;
  priority: SourcePriority;
  enabled: boolean;
  /** Human-readable cadence, e.g. "15 min". */
  cadence: string;
  cadenceMinutes: number;
  backfillDepth: string;
  /** Appendix A research references, e.g. ["R4"]. */
  references: string[];
  appendixExempt: boolean;
  owner: string;
  officialUrl: string;
  freshnessSlaMinutes: number;
  reconcile: string;

  // Operational - from the API when available.
  health: HealthState;
  lastSyncedAt: string | null;
  freshnessLagMinutes: number | null;
  itemsLast24h: number;
  candidatesLast24h: number;
  errorsLast24h: number;
}

interface SnapshotSource {
  code: string;
  name: string;
  geo: string;
  transport: string;
  family: string;
  priority: string;
  enabled: boolean;
  schedule: string;
  cadenceMinutes: number;
  backfillDepth: string;
  references: string[];
  appendixExempt: boolean;
  owner: string;
  officialUrl: string;
  freshnessSlaMinutes: number;
  reconcile: string;
}

const CATALOG = snapshot.sources as SnapshotSource[];

/** Minutes -> the cadence label used in the Blueprint source map. */
export function cadenceLabel(minutes: number): string {
  if (minutes >= 43_200) return "Monthly";
  if (minutes >= 1_440) return `${Math.round(minutes / 1_440)} d`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} h`;
  return `${minutes} min`;
}

/**
 * Catalog rows with operational state left unknown.
 *
 * Deliberately not randomised: invented health badges on a screen an editor
 * uses to decide whether a source is trustworthy would be worse than an honest
 * "unknown". The UI pairs this with a visible fallback notice.
 */
export function getCatalogSources(): ContentSource[] {
  return CATALOG.map((source) => ({
    code: source.code,
    name: source.name,
    geo: source.geo as SourceGeo,
    transport: source.transport as TransportBadge,
    family: source.family,
    priority: source.priority as SourcePriority,
    enabled: source.enabled,
    cadence: cadenceLabel(source.cadenceMinutes),
    cadenceMinutes: source.cadenceMinutes,
    backfillDepth: source.backfillDepth,
    references: source.references,
    appendixExempt: source.appendixExempt,
    owner: source.owner,
    officialUrl: source.officialUrl,
    freshnessSlaMinutes: source.freshnessSlaMinutes,
    reconcile: source.reconcile,
    health: "UNKNOWN",
    lastSyncedAt: null,
    freshnessLagMinutes: null,
    itemsLast24h: 0,
    candidatesLast24h: 0,
    errorsLast24h: 0,
  }));
}

/** Shape Developer A's `GET /admin/content-sources` returns. */
interface ApiContentSource {
  code?: string;
  id?: string;
  name?: string;
  health?: string;
  sourceType?: string;
  lastSyncedAt?: string | null;
  freshnessLagMinutes?: number | null;
  itemsLast24h?: number;
  candidatesLast24h?: number;
  errorsLast24h?: number;
  enabled?: boolean;
}

/**
 * Catalog joined with live operational state.
 *
 * The catalog is authoritative for what a source *is* (family, schedule,
 * references); the API is authoritative for how it is *doing*. Joining rather
 * than replacing means a source the API has not seen yet still appears, instead
 * of the list silently shrinking.
 */
export async function getContentSources(): Promise<ApiResult<ContentSource[]>> {
  const catalog = getCatalogSources();

  const result = await fetchWithFallback<ApiContentSource[]>("/content-sources", () => []);

  if (result.origin === "FALLBACK") {
    return { data: catalog, origin: "FALLBACK", notice: result.notice };
  }

  const byCode = new Map(
    result.data
      .filter((row): row is ApiContentSource & { code: string } => Boolean(row.code))
      .map((row) => [row.code, row])
  );

  return {
    origin: "LIVE",
    data: catalog.map((source) => {
      const live = byCode.get(source.code);
      if (!live) return source;
      return {
        ...source,
        enabled: live.enabled ?? source.enabled,
        health: normalizeHealth(live.health),
        lastSyncedAt: live.lastSyncedAt ?? null,
        freshnessLagMinutes: live.freshnessLagMinutes ?? null,
        itemsLast24h: live.itemsLast24h ?? 0,
        candidatesLast24h: live.candidatesLast24h ?? 0,
        errorsLast24h: live.errorsLast24h ?? 0,
      };
    }),
  };
}

/** A's health vocabulary (14.1) mapped onto the badges this UI renders. */
function normalizeHealth(value: string | undefined): HealthState {
  switch (value) {
    case "HEALTHY":
    case "LIVE":
      return "HEALTHY";
    case "DEGRADED":
      return "DEGRADED";
    case "STALE":
      return "STALE";
    case "BROKEN":
    case "ERROR":
    case "RATE_LIMITED":
      return "ERROR";
    case "BACKFILLING":
      return "BACKFILLING";
    default:
      return "UNKNOWN";
  }
}

/** Source counts per geography, for the tab filters (Blueprint 13.1). */
export function getSourceCountsByGeo(sources: ContentSource[]): Record<SourceGeo, number> {
  const counts = Object.fromEntries(SOURCE_GEOS.map((geo) => [geo, 0])) as Record<
    SourceGeo,
    number
  >;
  for (const source of sources) {
    counts[source.geo] += 1;
  }
  return counts;
}

export const TRANSPORT_LABELS: Record<TransportBadge, string> = {
  API: "JSON API",
  ATOM: "Atom feed",
  RSS: "RSS feed",
  WEB: "Web listing",
  WATCH: "Change watch",
  DATA: "Data file",
};

export const HEALTH_LABELS: Record<HealthState, string> = {
  HEALTHY: "Healthy",
  DEGRADED: "Degraded",
  STALE: "Stale",
  ERROR: "Error",
  BACKFILLING: "Backfilling",
  UNKNOWN: "No data",
};

/** Relative "x ago" label for the last-sync column. */
export function formatLag(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1_440)} d ago`;
}

/** `GET /admin/content-sources/:id` shape — the catalog plus DB-native operational detail. */
export interface ContentSourceDetail {
  id: string;
  code: string;
  name: string;
  sourceType: string;
  baseUrl: string;
  feedUrl: string | null;
  enabled: boolean;
  disabledReason: string | null;
  schedule: string | null;
  categoryHint: string | null;
  config: Record<string, unknown> | null;
  country: { id: string; name: string; flag: string; code: string } | null;
  health: HealthState;
  lastSyncedAt: string | null;
  freshnessLagMinutes: number | null;
  itemsLast24h: number;
  errorsLast24h: number;
  syncState: {
    cursor: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastErrorMessage: string | null;
    consecutiveFailures: number;
    healthStatus: string;
  } | null;
  runs: Array<{
    id: string;
    runType: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    itemsFound: number;
    itemsCreated: number;
    errorMessage: string | null;
  }>;
}

/** Content source detail by DB id or registry code — no static fallback: this is operational data. */
export async function getContentSourceDetail(idOrCode: string): Promise<ApiResult<ContentSourceDetail | null>> {
  const result = await fetchWithFallback<ApiRawContentSourceDetail | null>(
    `/admin/content-sources/${encodeURIComponent(idOrCode)}`,
    () => null
  );

  if (!result.data) return { ...result, data: null };

  return {
    ...result,
    data: {
      ...result.data,
      health: normalizeHealth(result.data.health),
    },
  };
}

interface ApiRawContentSourceDetail extends Omit<ContentSourceDetail, "health"> {
  health?: string;
}

export { triggerSync } from "@/lib/ingestion-api";
export type { ApiResult, DataOrigin } from "@/lib/ingestion-api";
