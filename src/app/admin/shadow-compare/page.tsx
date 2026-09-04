"use client";

/**
 * Shadow-mode comparison (Plan §5 steps 3-4, pilot: Canada + UK only).
 *
 * The legacy RSS preview and the new ingestion engine can both discover the
 * same government items right now. This page diffs them by canonical URL so
 * an editor can tell, before cutting over, whether the new pipeline is
 * actually catching what the old one caught - and what it catches on top of
 * that. It is a verification tool for the pilot window, not a permanent
 * dashboard: safe to remove once §5 step 6 (retire legacy preview) lands.
 */

import { useEffect, useState } from "react";
import { GitCompare, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminTable";
import { getShadowCompare, type ShadowCompareGeo, type ShadowCompareResult } from "@/lib/shadow-compare";
import type { DataOrigin } from "@/lib/ingestion-api";

const GEOS: { code: ShadowCompareGeo; label: string; flag: string }[] = [
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "UK", label: "United Kingdom", flag: "🇬🇧" },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ShadowComparePage() {
  const [geo, setGeo] = useState<ShadowCompareGeo>("CA");
  const [result, setResult] = useState<ShadowCompareResult | null>(null);
  const [origin, setOrigin] = useState<DataOrigin>("FALLBACK");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getShadowCompare(geo)
      .then((res) => {
        if (cancelled) return;
        setResult(res.data);
        setOrigin(res.origin);
        setNotice(res.data ? null : (res.notice ?? "Comparison unavailable."));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [geo]);

  const coveragePct =
    result && result.legacyCount > 0
      ? Math.round((result.matched.length / result.legacyCount) * 100)
      : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Shadow Comparison"
        description="Legacy RSS feeds vs. the new ingestion engine, diffed by canonical URL - the verification step before cutting the pilot country over (Plan §5)."
        backHref="/admin/sources"
        backLabel="Back to Automated Sources"
      />

      <div className="flex items-center gap-1.5">
        {GEOS.map((g) => (
          <button
            key={g.code}
            onClick={() => setGeo(g.code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              geo === g.code
                ? "bg-[#1769E0] text-white border-[#1769E0]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#1769E0] hover:text-[#1769E0]"
            }`}
          >
            {g.flag} {g.label}
          </button>
        ))}
      </div>

      {origin === "FALLBACK" && !loading && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            No live data
          </span>
          <span>{notice ?? "The ingestion API is not reachable."}</span>
        </div>
      )}

      {!loading && !result ? (
        <div className="bg-white border border-slate-200/80 rounded-xl">
          <AdminEmptyState
            title="No comparison available"
            description={notice ?? "Could not run the comparison for this country."}
            icon={GitCompare}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <StatTile label="Legacy RSS found" value={loading ? "…" : String(result?.legacyCount ?? 0)} />
            <StatTile label="New pipeline found" value={loading ? "…" : String(result?.newCount ?? 0)} />
            <StatTile
              label="Matched"
              value={loading ? "…" : String(result?.matched.length ?? 0)}
              tone="emerald"
            />
            <StatTile
              label="Coverage"
              value={loading ? "…" : coveragePct === null ? "—" : `${coveragePct}%`}
              tone={coveragePct !== null && coveragePct < 95 ? "amber" : "emerald"}
            />
          </div>

          {!loading && result && result.oldOnly.length > 0 && (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
              {result.oldOnly.length} item{result.oldOnly.length === 1 ? "" : "s"} the legacy feed found
              that the new pipeline missed. Review before treating {geo} as pilot-stable (§8 acceptance gate).
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChangeList
              title="Missed by new pipeline"
              icon={AlertTriangle}
              tone="amber"
              emptyLabel="Nothing missed — every legacy item was also found by the new pipeline."
              entries={result?.oldOnly ?? []}
              loading={loading}
            />
            <ChangeList
              title="Found only by new pipeline"
              icon={Sparkles}
              tone="blue"
              emptyLabel="No extra coverage yet beyond what the legacy feed already finds."
              entries={result?.newOnly ?? []}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ChangeList({
  title,
  icon: Icon,
  tone,
  emptyLabel,
  entries,
  loading,
}: {
  title: string;
  icon: typeof AlertTriangle;
  tone: "amber" | "blue";
  emptyLabel: string;
  entries: { url: string; title: string; publishedAt: string | null; source?: string }[];
  loading: boolean;
}) {
  const iconColor = tone === "amber" ? "text-amber-600" : "text-[#1769E0]";
  return (
    <section className="bg-white border border-slate-200/80 rounded-xl p-4">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        {title} ({loading ? "…" : entries.length})
      </h2>
      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-500 flex items-start gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {entries.map((entry) => (
            <a
              key={entry.url}
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs py-1.5 border-b border-slate-100 last:border-0 hover:text-[#1769E0] transition-colors"
            >
              <p className="font-medium text-slate-800 truncate">{entry.title}</p>
              <p className="text-[11px] text-slate-400">
                {formatDate(entry.publishedAt)}
                {entry.source ? ` · ${entry.source}` : ""}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
