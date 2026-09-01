/**
 * Automated Sources - client-side catalog and view types.
 *
 * Mirrors the Phase 1 ingestion registry
 * (`backend/src/modules/ingestion/config/phase1Sources.ts`) for the Admin UI.
 * It is deliberately a separate, dependency-free copy: the admin shell must
 * render before any ingestion API exists, and the browser bundle should not pull
 * in the worker's validation stack.
 *
 * Day 2 replaces `getMockContentSources()` with `GET /admin/content-sources`;
 * the types stay as they are, so only the data function changes.
 */

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
  priority: SourcePriority;
  enabled: boolean;
  /** Human-readable cadence, e.g. "15 min". */
  cadence: string;
  /** Backfill depth from the source map, e.g. "2y" or "Now onward". */
  backfillDepth: string;
  /** Appendix A research references, e.g. ["R4"]. */
  references: string[];
  owner: string;
  health: HealthState;
  /** Operational counters shown on the row; server-provided from Day 2. */
  lastSyncedAt: string | null;
  freshnessLagMinutes: number | null;
  itemsLast24h: number;
  candidatesLast24h: number;
  errorsLast24h: number;
}

/** Minutes -> the cadence label used in the source map. */
function cadenceLabel(minutes: number): string {
  if (minutes >= 43_200) return "Monthly";
  if (minutes >= 1_440) return `${Math.round(minutes / 1_440)} d`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} h`;
  return `${minutes} min`;
}

/**
 * The 28 Phase 1 sources, in Admin navigation order. Operational fields are
 * placeholders until the ingestion API lands; the catalog fields are real.
 */
const PHASE1_CATALOG: Array<
  Omit<
    ContentSource,
    | "health"
    | "lastSyncedAt"
    | "freshnessLagMinutes"
    | "itemsLast24h"
    | "candidatesLast24h"
    | "errorsLast24h"
    | "cadence"
  > & { cadenceMinutes: number }
> = [
  // Canada [R4][R5]
  { code: "ca-ircc-atom", name: "IRCC Newsroom (Atom API)", geo: "CA", transport: "ATOM", priority: "HIGH", enabled: true, cadenceMinutes: 15, backfillDepth: "2y", references: ["R4"], owner: "IRCC" },
  { code: "ca-ircc-notices", name: "IRCC Notices", geo: "CA", transport: "WEB", priority: "HIGH", enabled: true, cadenceMinutes: 30, backfillDepth: "3y", references: ["R4"], owner: "IRCC" },
  { code: "ca-study-permit-watch", name: "Study Permit rules watch", geo: "CA", transport: "WATCH", priority: "CRITICAL", enabled: true, cadenceMinutes: 360, backfillDepth: "Now onward", references: ["R5"], owner: "IRCC" },

  // United Kingdom [R1][R2][R3]
  { code: "uk-govuk-search-api", name: "GOV.UK Search API (UKVI discovery)", geo: "UK", transport: "API", priority: "HIGH", enabled: true, cadenceMinutes: 15, backfillDepth: "2y", references: ["R1", "R2"], owner: "GDS / UKVI" },
  { code: "uk-govuk-content-api", name: "Immigration Rules: Statements of Changes", geo: "UK", transport: "API", priority: "CRITICAL", enabled: true, cadenceMinutes: 30, backfillDepth: "2021+", references: ["R2", "R3"], owner: "Home Office" },
  { code: "uk-immigration-rules-watch", name: "Student / Graduate / sponsor guidance watch", geo: "UK", transport: "WATCH", priority: "CRITICAL", enabled: true, cadenceMinutes: 360, backfillDepth: "Now onward", references: ["R2", "R3"], owner: "Home Office" },

  // Australia [R6][R7][R8][R9]
  { code: "au-study-australia-news", name: "Study Australia News", geo: "AU", transport: "WEB", priority: "HIGH", enabled: true, cadenceMinutes: 30, backfillDepth: "2y", references: ["R6"], owner: "Austrade" },
  { code: "au-education-newsroom-rss", name: "Dept of Education Newsroom (RSS)", geo: "AU", transport: "RSS", priority: "MEDIUM", enabled: true, cadenceMinutes: 30, backfillDepth: "2y", references: ["R7"], owner: "Dept of Education" },
  { code: "au-homeaffairs-subclass500-watch", name: "Subclass 500 Student visa watch", geo: "AU", transport: "WATCH", priority: "CRITICAL", enabled: true, cadenceMinutes: 360, backfillDepth: "Now onward", references: ["R9"], owner: "Home Affairs" },
  { code: "au-education-monthly-data", name: "International Student monthly data", geo: "AU", transport: "DATA", priority: "LOW", enabled: true, cadenceMinutes: 43_200, backfillDepth: "5y", references: ["R8"], owner: "Dept of Education" },

  // United States [R10][R11][R12]
  { code: "us-uscis-news-rss", name: "USCIS All News", geo: "US", transport: "RSS", priority: "MEDIUM", enabled: true, cadenceMinutes: 30, backfillDepth: "2y", references: ["R10"], owner: "USCIS" },
  { code: "us-uscis-alerts", name: "USCIS Alerts", geo: "US", transport: "WEB", priority: "HIGH", enabled: true, cadenceMinutes: 30, backfillDepth: "2y", references: ["R10"], owner: "USCIS" },
  { code: "us-state-visas-news", name: "Dept of State - U.S. Visas News", geo: "US", transport: "WEB", priority: "HIGH", enabled: true, cadenceMinutes: 15, backfillDepth: "3y", references: ["R12"], owner: "Dept of State" },
  { code: "us-state-study-exchange-watch", name: "Study & Exchange (F/M/J) watch", geo: "US", transport: "WATCH", priority: "CRITICAL", enabled: true, cadenceMinutes: 360, backfillDepth: "Now onward", references: ["R11"], owner: "Dept of State" },
  { code: "us-ice-sevp-watch", name: "ICE / SEVP student guidance watch", geo: "US", transport: "WATCH", priority: "HIGH", enabled: true, cadenceMinutes: 720, backfillDepth: "Now onward", references: [], owner: "ICE / SEVP" },

  // Germany [R13]
  { code: "de-ffo-news-rss", name: "Federal Foreign Office - current articles", geo: "DE", transport: "RSS", priority: "LOW", enabled: true, cadenceMinutes: 60, backfillDepth: "12m", references: ["R13"], owner: "Federal Foreign Office" },
  { code: "de-ffo-press-releases-rss", name: "Federal Foreign Office - press & speeches", geo: "DE", transport: "RSS", priority: "LOW", enabled: true, cadenceMinutes: 60, backfillDepth: "12m", references: ["R13"], owner: "Federal Foreign Office" },
  { code: "de-make-it-in-germany-watch", name: "Make it in Germany - study visa watch", geo: "DE", transport: "WATCH", priority: "CRITICAL", enabled: true, cadenceMinutes: 360, backfillDepth: "Now onward", references: ["R13"], owner: "Make it in Germany" },
  { code: "de-daad-news", name: "DAAD press, news and scholarships", geo: "DE", transport: "WEB", priority: "MEDIUM", enabled: true, cadenceMinutes: 60, backfillDepth: "2y", references: [], owner: "DAAD" },

  // New Zealand [R14]
  { code: "nz-immigration-news", name: "Immigration NZ News Centre", geo: "NZ", transport: "WEB", priority: "HIGH", enabled: true, cadenceMinutes: 30, backfillDepth: "3y", references: ["R14"], owner: "Immigration New Zealand" },
  { code: "nz-pathway-student-watch", name: "Pathway Student & Post Study Work watch", geo: "NZ", transport: "WATCH", priority: "CRITICAL", enabled: true, cadenceMinutes: 360, backfillDepth: "Now onward", references: ["R14"], owner: "Immigration New Zealand" },

  // Ireland [R15][R16]
  { code: "ie-isd-news-updates", name: "ISD News and Updates", geo: "IE", transport: "WEB", priority: "HIGH", enabled: true, cadenceMinutes: 30, backfillDepth: "3y", references: ["R15"], owner: "Immigration Service Delivery" },
  { code: "ie-student-permission-watch", name: "Student Permission / Stamp 2 watch", geo: "IE", transport: "WATCH", priority: "CRITICAL", enabled: true, cadenceMinutes: 360, backfillDepth: "Now onward", references: ["R16"], owner: "Immigration Service Delivery" },

  // European Union [R17]-[R21]
  { code: "eu-press-corner-api", name: "Commission Press Corner (Search + Documents)", geo: "EU", transport: "API", priority: "HIGH", enabled: true, cadenceMinutes: 15, backfillDepth: "3y targeted", references: ["R17", "R18"], owner: "European Commission" },
  { code: "eu-commission-dept-news", name: "Commission Department News", geo: "EU", transport: "RSS", priority: "MEDIUM", enabled: true, cadenceMinutes: 30, backfillDepth: "3y", references: ["R17"], owner: "European Commission" },
  { code: "eu-dg-home-news", name: "DG Migration and Home Affairs", geo: "EU", transport: "WEB", priority: "HIGH", enabled: true, cadenceMinutes: 30, backfillDepth: "3y", references: ["R19"], owner: "DG HOME" },
  { code: "eu-education-area-news", name: "European Education Area", geo: "EU", transport: "WEB", priority: "MEDIUM", enabled: true, cadenceMinutes: 30, backfillDepth: "3y", references: ["R20"], owner: "European Commission" },
  { code: "eu-erasmus-plus-news", name: "Erasmus+ / Erasmus Mundus", geo: "EU", transport: "WEB", priority: "MEDIUM", enabled: true, cadenceMinutes: 60, backfillDepth: "3y", references: ["R21"], owner: "Erasmus+" },
];

/**
 * Deterministic placeholder telemetry. Derived from the source code so the shell
 * looks alive and stable across renders without pretending to be live data -
 * and without hydration mismatches from `Math.random()`.
 */
function placeholderTelemetry(
  code: string,
  cadenceMinutes: number,
  now: number
): Pick<
  ContentSource,
  | "health"
  | "lastSyncedAt"
  | "freshnessLagMinutes"
  | "itemsLast24h"
  | "candidatesLast24h"
  | "errorsLast24h"
> {
  let seed = 0;
  for (let i = 0; i < code.length; i += 1) {
    seed = (seed * 31 + code.charCodeAt(i)) % 100_000;
  }

  const bucket = seed % 10;
  const health: HealthState =
    bucket === 9 ? "ERROR" : bucket === 8 ? "STALE" : bucket === 7 ? "DEGRADED" : bucket === 6 ? "BACKFILLING" : "HEALTHY";

  const lagMinutes =
    health === "STALE" ? cadenceMinutes * 4 + (seed % 60) : seed % Math.max(cadenceMinutes, 5);
  const itemsLast24h = health === "ERROR" ? 0 : (seed % 17) + (cadenceMinutes <= 30 ? 3 : 0);

  return {
    health,
    lastSyncedAt: new Date(now - lagMinutes * 60_000).toISOString(),
    freshnessLagMinutes: lagMinutes,
    itemsLast24h,
    candidatesLast24h: Math.round(itemsLast24h / 3),
    errorsLast24h: health === "ERROR" ? (seed % 5) + 1 : 0,
  };
}

/**
 * Catalog plus placeholder operational state.
 *
 * `now` is passed in by the caller (set once on mount) so the shell renders the
 * same values on the server and the client.
 */
export function getMockContentSources(now: number = Date.parse("2026-09-01T09:00:00Z")): ContentSource[] {
  return PHASE1_CATALOG.map(({ cadenceMinutes, ...source }) => ({
    ...source,
    cadence: cadenceLabel(cadenceMinutes),
    ...placeholderTelemetry(source.code, cadenceMinutes, now),
  }));
}

/** Source counts per geography, for the tab filters (Blueprint 13.1). */
export function getSourceCountsByGeo(sources: ContentSource[]): Record<SourceGeo, number> {
  const counts = Object.fromEntries(SOURCE_GEOS.map((geo) => [geo, 0])) as Record<SourceGeo, number>;
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
};

/** Relative "x ago" label for the last-sync column. */
export function formatLag(minutes: number | null): string {
  if (minutes === null) return "Never";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1_440)} d ago`;
}
