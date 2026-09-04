"use client";

/**
 * Automated Sources dashboard (Blueprint 13.1).
 *
 * Country filters are the first navigation level and individual sources nest
 * inside them, which is why this replaces the old "RSS Ingestion Feeds" framing:
 * only 6 of the 28 Phase 1 sources are actually feeds.
 *
 * The catalog is seeded from the ingestion registry snapshot, so all 28
 * configured sources appear with their real family, schedule and Appendix A
 * references. Operational state comes from Developer A's
 * `GET /admin/content-sources` when it is available; when it is not, the page
 * says so rather than showing invented health figures.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Rss, RefreshCw, Settings2, ListTree } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import {
  GEO_META,
  HEALTH_LABELS,
  SOURCE_GEOS,
  TRANSPORT_LABELS,
  formatLag,
  getCatalogSources,
  getContentSources,
  getSourceCountsByGeo,
  triggerSync,
  type ContentSource,
  type DataOrigin,
  type HealthState,
  type SourceGeo,
  type TransportBadge,
} from "@/lib/content-sources";

type GeoFilter = SourceGeo | "ALL";

const TRANSPORT_STYLES: Record<TransportBadge, string> = {
  API: "bg-violet-50 text-violet-700 border-violet-200",
  ATOM: "bg-orange-50 text-orange-700 border-orange-200",
  RSS: "bg-amber-50 text-amber-700 border-amber-200",
  WEB: "bg-slate-100 text-slate-700 border-slate-200",
  WATCH: "bg-rose-50 text-rose-700 border-rose-200",
  DATA: "bg-teal-50 text-teal-700 border-teal-200",
};

const HEALTH_STYLES: Record<HealthState, { badge: string; dot: string }> = {
  HEALTHY: { badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" },
  DEGRADED: { badge: "bg-amber-500/10 text-amber-700 border-amber-500/20", dot: "bg-amber-500" },
  STALE: { badge: "bg-slate-500/10 text-slate-600 border-slate-500/20", dot: "bg-slate-400" },
  ERROR: { badge: "bg-rose-500/10 text-rose-700 border-rose-500/20", dot: "bg-rose-500" },
  BACKFILLING: { badge: "bg-blue-500/10 text-[#1769E0] border-blue-500/20", dot: "bg-[#1769E0]" },
  UNKNOWN: { badge: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

const PRIORITY_STYLES: Record<ContentSource["priority"], string> = {
  CRITICAL: "text-rose-700",
  HIGH: "text-slate-900",
  MEDIUM: "text-slate-600",
  LOW: "text-slate-400",
};

export default function AdminSourcesPage() {
  // Seeded from the registry snapshot so the first paint is the real catalog,
  // then replaced with live operational state if the API answers.
  const [sources, setSources] = useState<ContentSource[]>(() => getCatalogSources());
  const [origin, setOrigin] = useState<DataOrigin>("FALLBACK");
  const [originNotice, setOriginNotice] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoFilter>("ALL");
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getContentSources()
      .then((result) => {
        if (cancelled) return;
        setSources(result.data);
        setOrigin(result.origin);
        setOriginNotice(result.notice ?? null);
      })
      .catch(() => {
        // fetchWithFallback already degrades; this only catches a programming
        // error, and the catalog is already on screen.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => getSourceCountsByGeo(sources), [sources]);

  const visibleSources = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sources.filter((source) => {
      if (geo !== "ALL" && source.geo !== geo) return false;
      if (!query) return true;
      return (
        source.name.toLowerCase().includes(query) ||
        source.code.toLowerCase().includes(query) ||
        source.owner.toLowerCase().includes(query) ||
        source.references.some((reference) => reference.toLowerCase() === query)
      );
    });
  }, [sources, geo, search]);

  const unhealthyCount = sources.filter(
    (source) => source.health === "ERROR" || source.health === "STALE"
  ).length;

  // Enqueue only: the button disables while the request is in flight so an
  // editor cannot stack jobs on one source, and the page never polls for
  // completion - a run's result arrives on the next load.
  const handleSync = async (source: ContentSource) => {
    setSyncing((current) => ({ ...current, [source.code]: true }));
    const result = await triggerSync(source.code);
    setNotice(`${source.name}: ${result.notice}`);
    setSyncing((current) => ({ ...current, [source.code]: false }));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Automated Sources"
        description="Official government and institutional sources feeding the ingestion engine: APIs, feeds, web listings, rule-page change watches and scheduled datasets across all Phase 1 destinations."
        count={sources.length}
        countLabel="sources"
      />

      {origin === "FALLBACK" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            Catalog only
          </span>
          <span>
            Showing the configured registry. Sync status, health and counters are unavailable
            until the ingestion API is running.
          </span>
          {originNotice && <span className="font-mono text-[11px] opacity-70">{originNotice}</span>}
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200/80 bg-blue-50 px-4 py-2.5 text-xs font-medium text-[#1769E0]">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-[11px] font-semibold uppercase tracking-wider hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {origin === "LIVE" && unhealthyCount > 0 && (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          {unhealthyCount} source{unhealthyCount === 1 ? "" : "s"} outside the freshness SLA.
          Review before relying on today&apos;s candidate queue.
        </div>
      )}

      {/* Country filters are the first navigation level (Blueprint 13.1) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterTab
          label="All Sources"
          count={sources.length}
          active={geo === "ALL"}
          onClick={() => setGeo("ALL")}
        />
        {SOURCE_GEOS.map((code) => (
          <FilterTab
            key={code}
            label={`${GEO_META[code].flag} ${code}`}
            title={GEO_META[code].label}
            count={counts[code]}
            active={geo === code}
            onClick={() => setGeo(code)}
          />
        ))}
      </div>

      <AdminTableContainer
        count={visibleSources.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sources, owners, Appendix A references (e.g. R4)..."
        footerNote={`Displaying ${visibleSources.length} of ${sources.length} configured sources`}
      >
        {visibleSources.length === 0 ? (
          <AdminEmptyState
            title="No sources found"
            description="No configured source matches this filter."
            icon={Rss}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Cadence</th>
                <th className="py-3 px-3">Backfill</th>
                <th className="py-3 px-3">Last Sync</th>
                <th className="py-3 px-3">24h Items</th>
                <th className="py-3 px-3">Health</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSources.map((source) => {
                const isSyncing = Boolean(syncing[source.code]);
                const health = HEALTH_STYLES[source.health];

                return (
                  <tr key={source.code} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg leading-none shrink-0" role="img" aria-label={GEO_META[source.geo].label}>
                          {GEO_META[source.geo].flag}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`font-bold text-xs sm:text-sm group-hover:text-[#1769E0] transition-colors ${PRIORITY_STYLES[source.priority]}`}
                          >
                            {source.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {source.code}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {source.owner}
                            </span>
                            {/* Appendix A traceability, visible to the editor */}
                            {source.references.map((reference) => (
                              <span
                                key={reference}
                                title={`Blueprint Appendix A reference ${reference}`}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono"
                              >
                                {reference}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        title={TRANSPORT_LABELS[source.transport]}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${TRANSPORT_STYLES[source.transport]}`}
                      >
                        {source.transport}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{source.cadence}</td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{source.backfillDepth}</td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {formatLag(source.freshnessLagMinutes)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{source.itemsLast24h}</span>
                      <span className="text-slate-400"> / {source.candidatesLast24h} cand.</span>
                      {source.errorsLast24h > 0 && (
                        <span className="ml-1.5 text-rose-600 font-semibold">
                          {source.errorsLast24h} err
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${health.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${health.dot}`} />
                        {HEALTH_LABELS[source.health]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void handleSync(source)}
                          disabled={isSyncing}
                          title="Trigger Sync"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:text-[#1769E0] hover:border-[#1769E0] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                          {isSyncing ? "Syncing" : "Sync"}
                        </button>
                        <Link
                          href={`/admin/source-items?sourceId=${source.code}`}
                          title="View Items"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#1769E0] hover:bg-blue-50 transition-colors"
                        >
                          <ListTree className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/sources/${source.code}`}
                          title="Source Detail"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#1769E0] hover:bg-blue-50 transition-colors"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminTableContainer>
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
  title,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
        active
          ? "bg-[#1769E0] text-white border-[#1769E0]"
          : "bg-white text-slate-600 border-slate-200 hover:border-[#1769E0] hover:text-[#1769E0]"
      }`}
    >
      {label}
      <span className={`ml-1.5 text-[11px] ${active ? "text-white/70" : "text-slate-400"}`}>
        {count}
      </span>
    </button>
  );
}
