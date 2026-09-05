"use client";

/**
 * Source Items — the ingestion corpus, and the editorial queue that sits on it.
 *
 * Every discovered item appears here, whatever the pipeline decided about it:
 * an IGNORE with its reason on screen is how an operator confirms the
 * prefilter is doing the right thing, so filtering those away by default would
 * hide the evidence this screen exists to show.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ListTree, ExternalLink, RefreshCw } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import {
  CandidateBadge,
  NoticeBar,
  OriginNotice,
  ProcessingBadge,
  RouteBadge,
} from "@/components/admin/ingestion/IngestionUi";
import { getCatalogSources } from "@/lib/content-sources";
import {
  PROCESSING_STATUSES,
  editorialLane,
  formatRelative,
  getSourceItems,
  toScore,
  type ProcessingStatus,
  type SourceItemRow,
} from "@/lib/ingestion-admin";

const PAGE_SIZE = 25;

/**
 * `?source=<registry code>` deep-links here from a source row or from a source's
 * operations screen. Reading it needs `useSearchParams`, which suspends, so the
 * page body sits behind a boundary rather than opting the whole route out of
 * prerendering.
 */
export default function AdminSourceItemsPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-xs text-slate-500">Loading source items…</p>}>
      <SourceItemsView />
    </Suspense>
  );
}

function SourceItemsView() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SourceItemRow[]>([]);
  const [originNotice, setOriginNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total?: number; totalPages?: number }>({});

  const [sourceCode, setSourceCode] = useState(() => searchParams.get("source") ?? "");
  const [status, setStatus] = useState<ProcessingStatus | "">("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const catalog = useMemo(() => getCatalogSources(), []);

  /**
   * Loading is derived from "which query have we finished?" rather than kept as
   * its own flag. Two pieces of state that must agree is one more than needed,
   * and setting a flag synchronously inside the effect would make the mount
   * render twice for nothing.
   */
  const queryKey = `${sourceCode}|${status}|${page}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== queryKey;

  const load = useCallback(async () => {
    const result = await getSourceItems({
      sourceId: sourceCode || undefined,
      status: status || undefined,
      page,
      limit: PAGE_SIZE,
    });
    setItems(result.data);
    setOriginNotice(result.origin === "FALLBACK" ? (result.notice ?? "") : null);
    setMeta((result.meta as { total?: number; totalPages?: number }) ?? {});
    setLoadedKey(queryKey);
  }, [sourceCode, status, page, queryKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` fetches, then sets state; the rule targets synchronous state sync, and an effect is where a client-rendered admin screen is meant to start a fetch.
    void load();
  }, [load]);

  /** Manual refresh: drop the loaded marker so the spinner shows again. */
  const refresh = () => {
    setLoadedKey(null);
    void load();
  };

  // Client-side only: the API paginates, so this narrows the page in hand
  // rather than pretending to search the whole corpus.
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.contentSource.name.toLowerCase().includes(query) ||
        (item.externalId ?? "").toLowerCase().includes(query)
    );
  }, [items, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Items"
        description="Every document the ingestion engine has discovered, with its processing state, AI assessment and editorial routing. Items are never deleted; an ignored item keeps its evidence."
        count={typeof meta.total === "number" ? meta.total : items.length}
        countLabel="items"
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

      <AdminTableContainer
        count={visible.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search this page by title, source or external id..."
        filterComponent={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sourceCode}
              onChange={(event) => {
                setSourceCode(event.target.value);
                setPage(1);
              }}
              className="h-8.5 cursor-pointer rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs text-slate-700 focus:border-[#1769E0] focus:bg-white focus:outline-none"
            >
              <option value="">All sources</option>
              {catalog.map((source) => (
                <option key={source.code} value={source.code}>
                  {source.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ProcessingStatus | "");
                setPage(1);
              }}
              className="h-8.5 cursor-pointer rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs text-slate-700 focus:border-[#1769E0] focus:bg-white focus:outline-none"
            >
              <option value="">All statuses</option>
              {PROCESSING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        }
        footerNote={
          meta.totalPages
            ? `Page ${page} of ${meta.totalPages} · ${meta.total} items total`
            : `${visible.length} items on this page`
        }
      >
        {visible.length === 0 ? (
          <AdminEmptyState
            title={loading ? "Loading items…" : "No source items"}
            description={
              loading
                ? "Fetching the ingestion corpus."
                : "Nothing matches this filter. Trigger a sync on a source to populate the corpus."
            }
            icon={ListTree}
          />
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Item</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Published</th>
                <th className="px-3 py-3">Processing</th>
                <th className="px-3 py-3">Route</th>
                <th className="px-3 py-3">Relevance</th>
                <th className="px-3 py-3">Candidate</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((item) => {
                const assessment = item.assessments?.[0];
                return (
                  <tr key={item.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="max-w-md px-4 py-3.5">
                      <Link
                        href={`/admin/source-items/${item.id}`}
                        className="block truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-[#1769E0] sm:text-sm"
                      >
                        {item.title}
                      </Link>
                      <div className="truncate font-mono text-[11px] text-slate-400">
                        {item.externalId ?? item.canonicalUrl}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <Link
                        href={`/admin/sources/${item.contentSource.code}`}
                        className="font-semibold text-slate-700 hover:text-[#1769E0] hover:underline"
                      >
                        {item.contentSource.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-slate-600">
                      {formatRelative(item.publishedAt ?? item.discoveredAt)}
                    </td>
                    <td className="px-3 py-3.5">
                      <ProcessingBadge status={item.processingStatus} />
                    </td>
                    <td className="px-3 py-3.5">
                      {assessment ? <RouteBadge lane={editorialLane(assessment)} /> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap font-mono tabular-nums text-slate-700">
                      {assessment ? `${toScore(assessment.relevanceScore)}/100` : "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      {item.candidate ? (
                        <CandidateBadge status={item.candidate.status} />
                      ) : (
                        <span className="text-[11px] text-slate-400">none</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/source-items/${item.id}`}
                          title="Inspect item, full source and AI assessment"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1769E0]"
                        >
                          <ListTree className="h-4 w-4" />
                        </Link>
                        <a
                          href={item.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open the official source"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#1769E0]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminTableContainer>

      {(meta.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-slate-500">
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= (meta.totalPages ?? 1)}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
