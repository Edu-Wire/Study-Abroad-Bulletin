"use client";

/**
 * Source Changes — versioned diffs from watched rule pages and re-fetched
 * documents (Blueprint 11.2).
 *
 * Material changes lead, because a fee, an eligibility rule or a work-right is
 * what an editor is here for; a whitespace edit is noise. A published article is
 * never silently rewritten from one of these — a change raises an editorial
 * alert and the candidate goes back into the queue.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { History, RefreshCw } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { NoticeBar, OriginNotice } from "@/components/admin/ingestion/IngestionUi";
import { getCatalogSources } from "@/lib/content-sources";
import { formatDateTime, getSourceChanges, type SourceDiffRow } from "@/lib/ingestion-admin";

export default function AdminSourceChangesPage() {
  const [changes, setChanges] = useState<SourceDiffRow[]>([]);
  const [originNotice, setOriginNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState("");
  const [materialOnly, setMaterialOnly] = useState(false);
  const [search, setSearch] = useState("");

  const catalog = useMemo(() => getCatalogSources(), []);
  const watchedCount = useMemo(
    () => catalog.filter((source) => source.transport === "WATCH").length,
    [catalog]
  );

  /**
   * Loading is derived from "which query have we finished?" rather than kept
   * as its own flag. Two pieces of state that must agree is one more than
   * needed, and setting a flag synchronously inside the effect would make the
   * mount render twice for nothing.
   */
  const queryKey = `${sourceCode}|${materialOnly}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== queryKey;

  const load = useCallback(async () => {
    const result = await getSourceChanges({
      sourceId: sourceCode || undefined,
      materialOnly,
      limit: 100,
    });
    setChanges(result.data);
    setOriginNotice(result.origin === "FALLBACK" ? (result.notice ?? "") : null);
    setLoadedKey(queryKey);
  }, [sourceCode, materialOnly, queryKey]);

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
    if (!query) return changes;
    return changes.filter(
      (change) =>
        (change.sourceItem?.title ?? "").toLowerCase().includes(query) ||
        (change.sourceItem?.contentSource.name ?? "").toLowerCase().includes(query) ||
        (change.changeSummary ?? "").toLowerCase().includes(query)
    );
  }, [changes, search]);

  const materialCount = changes.filter((change) => change.isMaterial).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Changes"
        description="Versioned diffs from watched rule pages — visa fees, eligibility, work rights and effective dates that change without a press release."
        count={changes.length}
        countLabel="changes"
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

      {materialCount > 0 && (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
          {materialCount} material change{materialCount === 1 ? "" : "s"} detected. Review each one
          before relying on an article written from an earlier version.
        </div>
      )}

      <AdminTableContainer
        count={visible.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by document, source or change summary..."
        filterComponent={
          <div className="flex flex-wrap items-center gap-2">
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
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={materialOnly}
                onChange={(event) => setMaterialOnly(event.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-[#1769E0]"
              />
              Material only
            </label>
          </div>
        }
        footerNote={`${watchedCount} rule-page watches configured across the Phase 1 destinations`}
      >
        {visible.length === 0 ? (
          <AdminEmptyState
            title={loading ? "Loading changes…" : "No change events yet"}
            description={
              loading
                ? "Fetching versioned diffs."
                : `${watchedCount} rule-page watches are configured. Diffs appear here once the worker snapshots them a second time and the content differs.`
            }
            icon={History}
          />
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Detected</th>
                <th className="px-3 py-3">Document</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Versions</th>
                <th className="px-3 py-3">Change</th>
                <th className="px-4 py-3 text-right">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((change) => (
                <tr
                  key={change.id}
                  className={`transition-colors hover:bg-slate-50/70 ${
                    change.isMaterial ? "bg-amber-50/30" : ""
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatDateTime(change.detectedAt)}
                  </td>
                  <td className="max-w-xs px-3 py-3">
                    {change.sourceItem ? (
                      <Link
                        href={`/admin/source-items/${change.sourceItem.id}`}
                        className="block truncate font-semibold text-slate-800 hover:text-[#1769E0] hover:underline"
                      >
                        {change.sourceItem.title}
                      </Link>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-400">
                        {change.sourceItemId}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {change.sourceItem ? (
                      <Link
                        href={`/admin/sources/${change.sourceItem.contentSource.code}`}
                        className="text-slate-600 hover:text-[#1769E0] hover:underline"
                      >
                        {change.sourceItem.contentSource.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                    v{change.priorVersion?.versionNumber ?? "?"} → v
                    {change.nextVersion?.versionNumber ?? "?"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                        change.isMaterial
                          ? "border-amber-500/25 bg-amber-500/10 text-amber-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {change.isMaterial ? "material" : "minor"}
                    </span>
                    {change.changeSummary && (
                      <span className="ml-2 text-[11px] text-slate-600">{change.changeSummary}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    <span className="text-emerald-600">+{change.addedTokens}</span>{" "}
                    <span className="text-rose-600">−{change.removedTokens}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminTableContainer>
    </div>
  );
}
