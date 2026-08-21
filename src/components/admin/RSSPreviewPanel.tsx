"use client";

/**
 * RSSPreviewPanel — Admin RSS Feed Preview + Manual Import
 *
 * Calls GET /api/admin/rss/preview to load live RSS items.
 * Calls POST /api/admin/articles/import-rss with { rssSourceId, sourceUrl }.
 * Duplicate items are clearly marked "In CMS".
 */

import { useEffect, useState, useCallback } from "react";
import {
  Rss,
  RefreshCw,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RssPreviewItem {
  rssSourceId: string;
  sourceName: string;
  headline: string;
  summary: string;
  sourceUrl: string;
  rawDate: string;
  image: string;
  category: string;
  countryId: string;
  slugPrefix: string;
  alreadyImported: boolean;
  existingArticleId: string | null;
  existingStatus: string | null;
  existingSlug: string | null;
}

type ImportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string; articleId: string }
  | { status: "duplicate"; message: string; existingId: string; existingStatus: string }
  | { status: "error"; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<
  string,
  { label: string; bg: string; text: string; border: string; flag: string }
> = {
  "ircc-canada": {
    label: "Canada IRCC",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200/80",
    flag: "🇨🇦",
  },
  ukvi: {
    label: "UK UKVI",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200/80",
    flag: "🇬🇧",
  },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  REJECTED: "Rejected",
};

function formatRawDate(raw: string): string {
  if (!raw) return "Unknown date";
  try {
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

function isRecentFeedItem(rawDate: string, latestBatchTimestamp?: number): boolean {
  if (!rawDate) return false;
  try {
    const articleTime = new Date(rawDate).getTime();
    if (isNaN(articleTime)) return false;

    // 1. Check against current real time (within last 72 hours)
    const now = Date.now();
    const diffHoursFromNow = (now - articleTime) / (1000 * 60 * 60);
    if (diffHoursFromNow >= -2 && diffHoursFromNow <= 72) {
      return true;
    }

    // 2. Also check against the latest feed timestamp in the batch (within 72 hours of newest item)
    if (latestBatchTimestamp && latestBatchTimestamp > 0) {
      const diffHoursFromLatest = (latestBatchTimestamp - articleTime) / (1000 * 60 * 60);
      if (diffHoursFromLatest >= 0 && diffHoursFromLatest <= 72) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: single RSS item card
// ─────────────────────────────────────────────────────────────────────────────

function RssItemCard({
  item,
  latestBatchTimestamp,
  onImportSuccess,
}: {
  item: RssPreviewItem;
  latestBatchTimestamp?: number;
  onImportSuccess: (sourceUrl: string, articleId: string) => void;
}) {
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

  const effectiveAlreadyImported =
    item.alreadyImported ||
    importState.status === "success" ||
    importState.status === "duplicate";

  const isNew = isRecentFeedItem(item.rawDate, latestBatchTimestamp);
  const showNewBadge = isNew && !effectiveAlreadyImported;

  const handleImport = async () => {
    setImportState({ status: "loading" });
    try {
      const res = await fetch("http://localhost:8000/api/admin/articles/import-rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rssSourceId: item.rssSourceId,
          sourceUrl: item.sourceUrl,
        }),
      });

      const data = await res.json();

      if (res.status === 409 || data.alreadyImported) {
        setImportState({
          status: "duplicate",
          message: data.message,
          existingId: data.existingArticleId ?? "",
          existingStatus: data.existingStatus ?? "DRAFT",
        });
        return;
      }

      if (!data.success) {
        setImportState({ status: "error", message: data.message ?? "Import failed." });
        return;
      }

      setImportState({
        status: "success",
        message: data.message,
        articleId: data.article?.id ?? "",
      });
      onImportSuccess(item.sourceUrl, data.article?.id ?? "");
    } catch {
      setImportState({ status: "error", message: "Network error — import failed." });
    }
  };

  const badge = SOURCE_BADGE[item.rssSourceId] ?? {
    label: item.sourceName,
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    flag: "🌐",
  };

  return (
    <div
      id={`rss-item-${encodeURIComponent(item.sourceUrl)}`}
      className={`relative bg-white rounded-xl border transition-all duration-200 ${
        effectiveAlreadyImported
          ? "border-emerald-200/80 bg-emerald-50/15"
          : "border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
      } p-4 flex flex-col justify-between gap-3`}
    >
      <div className="space-y-2">
        {/* Source badge row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
            >
              <span className="text-xs">{badge.flag}</span>
              {badge.label}
            </span>
            {showNewBadge && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 uppercase tracking-wider shadow-2xs">
                <Sparkles className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                NEW
              </span>
            )}
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {item.category}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRawDate(item.rawDate)}
          </span>
        </div>

        {/* Headline */}
        <h3 className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2">
          {item.headline}
        </h3>

        {/* Summary */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {item.summary}
        </p>
      </div>

      {/* Footer: source URL + action */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[#1769E0] hover:underline truncate max-w-[200px]"
        >
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate">{new URL(item.sourceUrl).hostname}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>

        {/* Import action area */}
        <div className="flex items-center gap-2 shrink-0">
          {effectiveAlreadyImported ? (
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200/90 cursor-not-allowed select-none shadow-2xs"
              title={
                item.existingStatus
                  ? `In CMS · ${STATUS_LABEL[item.existingStatus] ?? item.existingStatus}`
                  : "Imported into CMS as Draft"
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                {importState.status === "success"
                  ? "Imported as Draft"
                  : item.existingStatus
                  ? `Imported (${STATUS_LABEL[item.existingStatus] ?? item.existingStatus})`
                  : "Imported"}
              </span>
            </button>
          ) : importState.status === "error" ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {importState.message}
              </span>
              <button
                onClick={() => setImportState({ status: "idle" })}
                className="text-[11px] text-slate-500 underline cursor-pointer hover:text-slate-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <button
              id={`import-btn-${encodeURIComponent(item.sourceUrl).slice(-20)}`}
              onClick={handleImport}
              disabled={importState.status === "loading"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1769E0] text-white hover:bg-[#1357bd] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            >
              {importState.status === "loading" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Importing…</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  <span>Import Article</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────

const RSS_PER_PAGE = 10;

export function RSSPreviewPanel({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [items, setItems] = useState<RssPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<"ALL" | string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "READY" | "IMPORTED">("ALL");
  const [rssPage, setRssPage] = useState(1);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/api/admin/rss/preview");
      const data = await res.json();
      if (data.success) {
        setItems(data.items ?? []);
      } else {
        setError(data.message ?? "Failed to load RSS preview.");
      }
    } catch {
      setError("Could not reach backend server. Is it running on port 8000?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const [localImported, setLocalImported] = useState<Set<string>>(new Set());

  const handleItemImported = (sourceUrl: string) => {
    setLocalImported((prev) => new Set([...prev, sourceUrl]));
    onImportSuccess();
  };

  const sources = Array.from(new Set(items.map((i) => i.rssSourceId)));

  const annotatedItems = items.map((item) => ({
    ...item,
    alreadyImported: item.alreadyImported || localImported.has(item.sourceUrl),
  }));

  const filteredItems = annotatedItems.filter((item) => {
    if (filterSource !== "ALL" && item.rssSourceId !== filterSource) return false;
    if (filterStatus === "READY" && item.alreadyImported) return false;
    if (filterStatus === "IMPORTED" && !item.alreadyImported) return false;
    return true;
  });

  const totalImported = annotatedItems.filter((i) => i.alreadyImported).length;
  const totalPending = annotatedItems.length - totalImported;

  useEffect(() => {
    setRssPage(1);
  }, [filterSource, filterStatus]);

  const latestBatchTimestamp = items.reduce((max, item) => {
    const t = new Date(item.rawDate || 0).getTime();
    return isNaN(t) ? max : Math.max(max, t);
  }, 0);

  const rssTotalPages = Math.max(1, Math.ceil(filteredItems.length / RSS_PER_PAGE));
  const pagedItems = filteredItems.slice(
    (rssPage - 1) * RSS_PER_PAGE,
    rssPage * RSS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      {/* Filter and Action Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 sm:p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Source filter buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["ALL", ...sources].map((src) => {
              const b = SOURCE_BADGE[src];
              const isSelected = filterSource === src;
              return (
                <button
                  key={src}
                  onClick={() => {
                    setFilterSource(src);
                    setRssPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1769E0] text-white border-[#1769E0] shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {b && <span>{b.flag}</span>}
                  <span>{src === "ALL" ? "All Feeds" : b?.label ?? src}</span>
                </button>
              );
            })}
          </div>

          {/* Status filter buttons: All / Ready / Imported */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => {
                setFilterStatus("ALL");
                setRssPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "ALL"
                  ? "bg-[#1769E0] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({annotatedItems.length})
            </button>
            <button
              onClick={() => {
                setFilterStatus("READY");
                setRssPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "READY"
                  ? "bg-[#1769E0] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ready ({totalPending})
            </button>
            <button
              onClick={() => {
                setFilterStatus("IMPORTED");
                setRssPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === "IMPORTED"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Imported ({totalImported})
            </button>
          </div>
        </div>

        {/* Status Count & Refresh */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-xs text-slate-500 hidden sm:block">
            <span className="font-semibold text-slate-900">{totalPending}</span> ready to import
            {" · "}
            <span className="font-semibold text-emerald-600">{totalImported}</span> in CMS
          </div>
          <button
            id="rss-preview-refresh-btn"
            onClick={loadPreview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Body Area */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-[#1769E0]" />
          <p className="text-xs font-medium">Fetching official government RSS feeds…</p>
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center gap-3 text-center bg-white border border-slate-200/80 rounded-xl p-6">
          <AlertCircle className="h-8 w-8 text-rose-500" />
          <p className="text-sm font-semibold text-slate-900">Failed to load RSS feeds</p>
          <p className="text-xs text-slate-500 max-w-sm">{error}</p>
          <button
            onClick={loadPreview}
            className="mt-2 px-4 py-2 text-xs font-semibold bg-[#1769E0] text-white rounded-lg hover:bg-[#1357bd] transition-colors cursor-pointer shadow-2xs"
          >
            Try Again
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-3 text-center bg-white border border-slate-200/80 rounded-xl p-6">
          <Rss className="h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-slate-900">
            {items.length === 0
              ? "No RSS items available"
              : filterStatus === "READY"
              ? "All items have been imported"
              : filterStatus === "IMPORTED"
              ? "No items have been imported yet"
              : "No items found for the selected filter"}
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            {items.length === 0
              ? "Check that backend server can reach the external XML endpoints."
              : 'Select "All" to view all feed items or click Refresh to check for new entries.'}
          </p>
        </div>
      ) : (
        <>
          {/* Card Grid */}
          <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-2">
            {pagedItems.map((item) => (
              <RssItemCard
                key={item.sourceUrl}
                item={item}
                latestBatchTimestamp={latestBatchTimestamp}
                onImportSuccess={(url) => handleItemImported(url)}
              />
            ))}
          </div>

          {/* Pagination Bar */}
          {rssTotalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-slate-200/80 bg-white rounded-xl">
              <p className="text-[11px] text-slate-500">
                Page <span className="font-semibold text-slate-900">{rssPage}</span> of{" "}
                <span className="font-semibold text-slate-900">{rssTotalPages}</span>
                {" "}·{" "}
                <span className="font-semibold text-slate-900">{filteredItems.length}</span> items
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRssPage(1)}
                  disabled={rssPage === 1}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setRssPage((p) => Math.max(1, p - 1))}
                  disabled={rssPage === 1}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: rssTotalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === rssTotalPages || Math.abs(p - rssPage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`re-${i}`} className="px-2 text-xs text-slate-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setRssPage(p as number)}
                        className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          rssPage === p
                            ? "bg-[#1769E0] text-white shadow-2xs"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setRssPage((p) => Math.min(rssTotalPages, p + 1))}
                  disabled={rssPage === rssTotalPages}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setRssPage(rssTotalPages)}
                  disabled={rssPage === rssTotalPages}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Footer Guidance Note */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
            <ChevronRight className="h-3.5 w-3.5 text-[#1769E0] shrink-0" />
            <span>
              Imported articles are saved as Drafts in the database for editorial review and publishing.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
