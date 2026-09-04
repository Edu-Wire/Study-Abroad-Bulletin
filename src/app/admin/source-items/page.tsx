"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileSearch, ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  getSourceItems,
  createDraftFromSourceItem,
  ignoreSourceItem,
  ROUTING_LABELS,
  type SourceItemSummary,
} from "@/lib/source-items";
import type { DataOrigin } from "@/lib/ingestion-api";

const PROCESSING_FILTERS = [
  "ALL",
  "DISCOVERED",
  "ENRICHED",
  "SCORED",
  "CLASSIFIED",
  "ROUTED",
  "IMPORTED",
] as const;

const ROUTING_STYLES: Record<string, string> = {
  IGNORE: "bg-slate-100 text-slate-500 border-slate-200",
  REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  CREATE_DRAFT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PUBLISH: "bg-violet-50 text-violet-700 border-violet-200",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminSourceItemsPage() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("sourceId") ?? undefined;

  const [items, setItems] = useState<SourceItemSummary[]>([]);
  const [origin, setOrigin] = useState<DataOrigin>("FALLBACK");
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<(typeof PROCESSING_FILTERS)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const load = (cancelledRef?: { cancelled: boolean }) => {
    getSourceItems({ sourceId, status: status === "ALL" ? undefined : status })
      .then((result) => {
        if (cancelledRef?.cancelled) return;
        setItems(result.data);
        setOrigin(result.origin);
        setApiNotice(result.notice ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelledRef?.cancelled) setLoading(false);
      });
  };

  useEffect(() => {
    const ref = { cancelled: false };
    load(ref);
    return () => {
      ref.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, status]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.externalId?.toLowerCase().includes(query) ||
        item.contentSource.name.toLowerCase().includes(query)
    );
  }, [items, search]);

  const handleCreateDraft = async (item: SourceItemSummary) => {
    setBusy((b) => ({ ...b, [item.id]: true }));
    const result = await createDraftFromSourceItem(item.id);
    setActionNotice(`${item.title}: ${result.notice}`);
    setBusy((b) => ({ ...b, [item.id]: false }));
    if (result.accepted) load();
  };

  const handleIgnore = async (item: SourceItemSummary) => {
    setBusy((b) => ({ ...b, [item.id]: true }));
    const result = await ignoreSourceItem(item.id);
    setActionNotice(`${item.title}: ${result.notice}`);
    setBusy((b) => ({ ...b, [item.id]: false }));
    if (result.accepted) load();
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Source Items"
        description="Every discovered government item: full-source status, AI assessment and the editorial bridge into an Article draft. Nothing here auto-publishes."
        count={visibleItems.length}
        countLabel="items"
        backHref="/admin/sources"
        backLabel="Back to Automated Sources"
      />

      {origin === "FALLBACK" && !loading && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span className="rounded bg-amber-200/70 px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            No live data
          </span>
          <span>Source items are unavailable until the ingestion API is running and has discovered content.</span>
          {apiNotice && <span className="font-mono text-[11px] opacity-70">{apiNotice}</span>}
        </div>
      )}

      {actionNotice && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200/80 bg-blue-50 px-4 py-2.5 text-xs font-medium text-[#1769E0]">
          <span>{actionNotice}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-[11px] font-semibold uppercase tracking-wider hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PROCESSING_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                status === f
                  ? "bg-[#1769E0] text-white border-[#1769E0]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#1769E0] hover:text-[#1769E0]"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, external ID, source..."
          className="h-8.5 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1769E0] transition-colors min-w-[220px]"
        />
      </div>

      {visibleItems.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-xl">
          <AdminEmptyState
            title={loading ? "Loading items..." : "No source items found"}
            description={
              loading
                ? "Fetching discovered content."
                : "No item matches this filter yet. Items appear here once a source sync discovers content."
            }
            icon={FileSearch}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {visibleItems.map((item) => {
            const assessment = item.assessments[0];
            const isBusy = Boolean(busy[item.id]);
            const canDraft =
              assessment?.routingDecision === "CREATE_DRAFT" &&
              item.candidate &&
              item.candidate.status !== "DRAFT_CREATED" &&
              item.candidate.status !== "IGNORED";

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{item.contentSource.sourceType}</span>
                      <span>·</span>
                      <span className="truncate">{item.contentSource.name}</span>
                    </div>
                    <Link
                      href={`/admin/source-items/${item.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-[#1769E0] transition-colors leading-snug line-clamp-2"
                    >
                      {item.title}
                    </Link>
                  </div>
                  <a
                    href={item.canonicalUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="View original source"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#1769E0] hover:bg-blue-50 transition-colors shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span>{formatDate(item.publishedAt)}</span>
                  {item.externalId && (
                    <>
                      <span>·</span>
                      <span className="font-mono truncate max-w-[160px]">{item.externalId}</span>
                    </>
                  )}
                  {item.nativeTopics.slice(0, 3).map((topic) => (
                    <span key={topic} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={item.processingStatus} showDot={false} />
                  {assessment && (
                    <>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                          ROUTING_STYLES[assessment.routingDecision] ?? ROUTING_STYLES.REVIEW
                        }`}
                      >
                        {ROUTING_LABELS[assessment.routingDecision] ?? assessment.routingDecision}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {Math.round(assessment.relevanceScore * 100)}% relevance ·{" "}
                        {Math.round(assessment.confidenceScore * 100)}% confidence
                      </span>
                    </>
                  )}
                  {item.candidate && (
                    <StatusBadge status={item.candidate.status} showDot={false} />
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 mt-auto">
                  <Link
                    href={`/admin/source-items/${item.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:text-[#1769E0] hover:border-[#1769E0] transition-colors"
                  >
                    View Assessment
                  </Link>
                  {canDraft && (
                    <button
                      onClick={() => void handleCreateDraft(item)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#1769E0] text-white hover:bg-[#1357bd] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Create Draft
                    </button>
                  )}
                  {item.candidate && item.candidate.status === "PENDING" && (
                    <button
                      onClick={() => void handleIgnore(item)}
                      disabled={isBusy}
                      title="Ignore"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
