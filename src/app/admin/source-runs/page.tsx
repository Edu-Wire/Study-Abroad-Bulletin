"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Rss } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import {
  getSourceRuns,
  formatDuration,
  RUN_STATUS_STYLES,
  type SourceRunSummary,
} from "@/lib/source-runs";
import type { DataOrigin } from "@/lib/ingestion-api";

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSourceRunsPage() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId") ?? undefined;

  const [runs, setRuns] = useState<SourceRunSummary[]>([]);
  const [origin, setOrigin] = useState<DataOrigin>("FALLBACK");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSourceRuns({ sourceId, limit: 50 })
      .then((result) => {
        if (cancelled) return;
        setRuns(result.data);
        setOrigin(result.origin);
        setNotice(result.notice ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const failedCount = useMemo(() => runs.filter((r) => r.status === "FAILED").length, [runs]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Runs"
        description={
          sourceId
            ? `Ingestion run history for "${sourceId}" - discovery, backfill and reconciliation jobs, newest first.`
            : "Operational history of every ingestion run across all sources: live syncs, manual triggers, backfills and reconciliations."
        }
        count={runs.length}
        countLabel="runs"
        backHref="/admin/sources"
        backLabel="Back to Automated Sources"
      />

      {origin === "FALLBACK" && !loading && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            No live data
          </span>
          <span>Run history is unavailable until the ingestion API is running.</span>
          {notice && <span className="font-mono text-[11px] opacity-70">{notice}</span>}
        </div>
      )}

      {origin === "LIVE" && failedCount > 0 && (
        <div className="rounded-lg border border-rose-200/80 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          {failedCount} run{failedCount === 1 ? "" : "s"} failed in this window. Check
          errorMessage before trusting today&apos;s candidate queue for that source.
        </div>
      )}

      <AdminTableContainer
        count={runs.length}
        footerNote={`Displaying ${runs.length} run${runs.length === 1 ? "" : "s"}`}
      >
        {runs.length === 0 ? (
          <AdminEmptyState
            title={loading ? "Loading runs..." : "No runs yet"}
            description={
              loading
                ? "Fetching operational history."
                : "No ingestion run has been recorded for this filter yet."
            }
            icon={Activity}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Started</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Found</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-3">Updated</th>
                <th className="py-3 px-4">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => {
                const status = RUN_STATUS_STYLES[run.status] ?? RUN_STATUS_STYLES.SUCCESS;
                return (
                  <tr key={run.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Rss className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {run.contentSource?.name ?? "Unknown source"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {run.contentSource?.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{run.runType}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${status.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {formatTimestamp(run.startedAt)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-900 font-semibold whitespace-nowrap">
                      {run.itemsFound}
                    </td>
                    <td className="py-3.5 px-3 text-emerald-700 whitespace-nowrap">{run.itemsCreated}</td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{run.itemsUpdated}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {run.itemsFailed > 0 ? (
                        <span
                          className="text-rose-600 font-semibold"
                          title={run.errorMessage ?? undefined}
                        >
                          {run.itemsFailed}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
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
