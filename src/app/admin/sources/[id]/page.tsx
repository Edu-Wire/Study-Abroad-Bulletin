"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw, ListTree, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminTable";
import {
  getContentSourceDetail,
  triggerSync,
  HEALTH_LABELS,
  formatLag,
  type ContentSourceDetail,
} from "@/lib/content-sources";
import type { DataOrigin } from "@/lib/ingestion-api";

const HEALTH_STYLES: Record<string, { badge: string; dot: string }> = {
  HEALTHY: { badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" },
  DEGRADED: { badge: "bg-amber-500/10 text-amber-700 border-amber-500/20", dot: "bg-amber-500" },
  STALE: { badge: "bg-slate-500/10 text-slate-600 border-slate-500/20", dot: "bg-slate-400" },
  ERROR: { badge: "bg-rose-500/10 text-rose-700 border-rose-500/20", dot: "bg-rose-500" },
  BACKFILLING: { badge: "bg-blue-500/10 text-[#1769E0] border-blue-500/20", dot: "bg-[#1769E0]" },
  UNKNOWN: { badge: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ContentSourceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [source, setSource] = useState<ContentSourceDetail | null>(null);
  const [origin, setOrigin] = useState<DataOrigin>("FALLBACK");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    getContentSourceDetail(id)
      .then((result) => {
        setSource(result.data);
        setOrigin(result.origin);
        if (!result.data) setNotice(result.notice ?? "This source is not available.");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSync = async () => {
    setSyncing(true);
    const result = await triggerSync(id);
    setNotice(result.notice);
    setSyncing(false);
    if (result.accepted) load();
  };

  if (loading) {
    return (
      <AdminPageHeader title="Loading..." description="Fetching source detail." backHref="/admin/sources" />
    );
  }

  if (!source) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Content source" description="This source could not be loaded." backHref="/admin/sources" />
        <div className="bg-white border border-slate-200/80 rounded-xl">
          <AdminEmptyState
            title="Not available"
            description={notice ?? "The ingestion API is not reachable, or this source does not exist."}
            icon={AlertTriangle}
          />
        </div>
      </div>
    );
  }

  const health = HEALTH_STYLES[source.health] ?? HEALTH_STYLES.UNKNOWN;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={source.name}
        description={`${source.sourceType} · ${source.country?.name ?? "Multi-country / global"} · ${source.code}`}
        backHref="/admin/sources"
        backLabel="Back to Automated Sources"
      >
        <Link
          href={`/admin/source-items?sourceId=${source.code}`}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 rounded-lg transition-colors"
        >
          <ListTree className="h-3.5 w-3.5" />
          View Items
        </Link>
        <button
          onClick={() => void handleSync()}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Trigger Sync
        </button>
      </AdminPageHeader>

      {origin === "FALLBACK" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            No live data
          </span>
          <span>The ingestion API is not reachable — this page is showing stale or no data.</span>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200/80 bg-blue-50 px-4 py-2.5 text-xs font-medium text-[#1769E0]">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-[11px] font-semibold uppercase tracking-wider hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatTile label="Health">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${health.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${health.dot}`} />
            {HEALTH_LABELS[source.health]}
          </span>
        </StatTile>
        <StatTile label="Last Synced">{formatLag(source.freshnessLagMinutes)}</StatTile>
        <StatTile label="Items (24h)">{source.itemsLast24h}</StatTile>
        <StatTile label="Errors (24h)">
          <span className={source.errorsLast24h > 0 ? "text-rose-600 font-semibold" : ""}>{source.errorsLast24h}</span>
        </StatTile>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200/80 rounded-xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Configuration</h2>
          <dl className="space-y-2 text-xs">
            <Row label="Feed / Base URL" value={source.feedUrl ?? source.baseUrl} mono />
            <Row label="Schedule" value={source.schedule ?? "—"} mono />
            <Row label="Category hint" value={source.categoryHint ?? "—"} />
            <Row label="Enabled" value={source.enabled ? "Yes" : `No${source.disabledReason ? ` — ${source.disabledReason}` : ""}`} />
          </dl>
        </section>

        <section className="bg-white border border-slate-200/80 rounded-xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Sync State</h2>
          {source.syncState ? (
            <dl className="space-y-2 text-xs">
              <Row label="Last success" value={formatDateTime(source.syncState.lastSuccessAt)} />
              <Row label="Last failure" value={formatDateTime(source.syncState.lastFailureAt)} />
              <Row label="Consecutive failures" value={String(source.syncState.consecutiveFailures)} />
              {source.syncState.lastErrorMessage && (
                <Row label="Last error" value={source.syncState.lastErrorMessage} className="text-rose-600" />
              )}
            </dl>
          ) : (
            <p className="text-xs text-slate-500">No sync state recorded yet.</p>
          )}
        </section>
      </div>

      <section className="bg-white border border-slate-200/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Activity className="h-3.5 w-3.5" />
            Recent Runs
          </h2>
          <Link
            href={`/admin/source-runs?sourceId=${source.code}`}
            className="text-[11px] font-semibold text-[#1769E0] hover:underline"
          >
            View all runs →
          </Link>
        </div>
        {source.runs.length === 0 ? (
          <p className="text-xs text-slate-500">No runs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {source.runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-600">{formatDateTime(run.startedAt)}</span>
                <span className="text-slate-400">{run.runType}</span>
                <span
                  className={`font-semibold ${
                    run.status === "FAILED" ? "text-rose-600" : run.status === "SUCCESS" ? "text-emerald-600" : "text-[#1769E0]"
                  }`}
                >
                  {run.status}
                </span>
                <span className="text-slate-500">{run.itemsFound} found / {run.itemsCreated} created</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <div className="text-sm font-bold text-slate-900">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-400 shrink-0">{label}</dt>
      <dd className={`text-right text-slate-700 break-all ${mono ? "font-mono" : ""} ${className ?? ""}`}>{value}</dd>
    </div>
  );
}
