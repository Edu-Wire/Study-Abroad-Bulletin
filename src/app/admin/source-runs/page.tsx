"use client";

/**
 * Source Runs — operational history across every source.
 *
 * A run row is the audit record of one discovery pass: what it found, what it
 * created, and what it failed on. A FAILED run with its error message on screen
 * is the fastest route from "this source looks stale" to the reason why.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History, RefreshCw } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { NoticeBar, OriginNotice, RunBadge } from "@/components/admin/ingestion/IngestionUi";
import { getCatalogSources } from "@/lib/content-sources";
import {
  formatDateTime,
  formatDuration,
  getSourceRuns,
  type SourceRunRow,
} from "@/lib/ingestion-admin";

export default function AdminSourceRunsPage() {
  const [runs, setRuns] = useState<SourceRunRow[]>([]);
  const [originNotice, setOriginNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState("");
  const [search, setSearch] = useState("");

  const catalog = useMemo(() => getCatalogSources(), []);

  /**
   * Loading is derived from "which query have we finished?" rather than kept as
   * its own flag. Two pieces of state that must agree is one more than needed,
   * and setting a flag synchronously inside the effect would make the mount
   * render twice for nothing.
   */
  const queryKey = `${sourceCode}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== queryKey;


  const load = useCallback(async () => {
    const result = await getSourceRuns(sourceCode || undefined, 100);
    setRuns(result.data);
    setOriginNotice(result.origin === "FALLBACK" ? (result.notice ?? "") : null);
    setLoadedKey(queryKey);
  }, [sourceCode, queryKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` fetches, then sets state; the rule targets synchronous state sync, and an effect is where a client-rendered admin screen is meant to start a fetch.
    void load();
  }, [load]);

  /** Manual refresh: drop the loaded marker so the spinner shows again. */
  const refresh = () => {
    setLoadedKey(null);
    void load();
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return runs;
    return runs.filter(
      (run) =>
        (run.contentSource?.name ?? "").toLowerCase().includes(query) ||
        run.runType.toLowerCase().includes(query) ||
        run.status.toLowerCase().includes(query)
    );
  }, [runs, search]);

  const failing = runs.filter((run) => run.status === "FAILED").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Runs"
        description="Every discovery, backfill and reconciliation pass the worker has executed, with counts and failures."
        count={runs.length}
        countLabel="runs"
      >
        <button
          onClick={refresh}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </AdminPageHeader>

      {originNotice !== null && <OriginNotice notice={originNotice} />}
      {notice && <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />}

      {failing > 0 && (
        <div className="rounded-lg border border-rose-200/80 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          {failing} failed run{failing === 1 ? "" : "s"} in this window. Open the source to see the
          error and retry.
        </div>
      )}

      <AdminTableContainer
        count={visible.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by source, run type or status..."
        filterComponent={
          <select
            value={sourceCode}
            onChange={(event) => setSourceCode(event.target.value)}
            className="h-8.5 cursor-pointer rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs text-slate-700 focus:border-[#1769E0] focus:bg-white focus:outline-none"
          >
            <option value="">All sources</option>
            {catalog.map((source) => (
              <option key={source.code} value={source.code}>
                {source.name}
              </option>
            ))}
          </select>
        }
        footerNote={`Showing ${visible.length} of the ${runs.length} most recent runs`}
      >
        {visible.length === 0 ? (
          <AdminEmptyState
            title={loading ? "Loading runs…" : "No runs recorded"}
            description={
              loading
                ? "Fetching operational history."
                : "The worker has not executed a run yet. Trigger a sync from Automated Sources."
            }
            icon={History}
          />
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Started</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Duration</th>
                <th className="px-3 py-3 text-right">Found</th>
                <th className="px-3 py-3 text-right">Created</th>
                <th className="px-3 py-3 text-right">Updated</th>
                <th className="px-4 py-3 text-right">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((run) => (
                <Fragment key={run.id}>
                  <tr className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatDateTime(run.startedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {run.contentSource ? (
                        <Link
                          href={`/admin/sources/${run.contentSource.code}`}
                          className="font-semibold text-slate-700 hover:text-[#1769E0] hover:underline"
                        >
                          {run.contentSource.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{run.runType}</td>
                    <td className="px-3 py-3">
                      <RunBadge status={run.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-700">{run.itemsFound}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-700">{run.itemsCreated}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-700">{run.itemsUpdated}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {run.itemsFailed > 0 ? (
                        <span className="font-semibold text-rose-600">{run.itemsFailed}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                  {run.errorMessage && (
                    <tr>
                      <td colSpan={9} className="bg-rose-50/50 px-4 pb-3 text-[11px] text-rose-800">
                        {run.errorMessage}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableContainer>
    </div>
  );
}
