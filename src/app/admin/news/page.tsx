"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Newspaper,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  CheckCircle2,
  Archive,
  Clock,
  FileText,
  AlertTriangle,
  X,
  Rss,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ExternalLink,
  Search,
  Plus,
} from "lucide-react";
import { AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ArticleFormModal } from "@/components/admin/ArticleFormModal";
import { RSSPreviewPanel } from "@/components/admin/RSSPreviewPanel";
import { adminGet, adminDelete, adminPatch } from "@/lib/api/apiClient";
import { CountryFlag } from "@/components/common/CountryFlag";
import { getCountryCode } from "@/lib/countries";

type ArticleStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED" | "REJECTED";
type ArticleCategory = "UNIVERSITIES" | "ADMISSIONS" | "SCHOLARSHIPS" | "VISA" | "STUDENT_LIFE" | "CAREER";

interface Country {
  id: string;
  name: string;
  flag: string;
  code?: string;
}

function getCodeForCountry(country?: { id?: string; name?: string; flag?: string; code?: string } | null): string | undefined {
  if (!country) return undefined;
  if (country.code && /^[A-Za-z]{2}$/.test(country.code.trim())) {
    return country.code.trim().toUpperCase();
  }
  if (country.flag && /^[A-Za-z]{2}$/.test(country.flag.trim())) {
    return country.flag.trim().toUpperCase();
  }
  if (country.flag) {
    const chars = [...country.flag.trim()];
    if (chars.length === 2) {
      const cp0 = chars[0].codePointAt(0) ?? 0;
      const cp1 = chars[1].codePointAt(0) ?? 0;
      if (cp0 >= 0x1F1E6 && cp0 <= 0x1F1FF && cp1 >= 0x1F1E6 && cp1 <= 0x1F1FF) {
        return String.fromCharCode(cp0 - 0x1F1E6 + 65, cp1 - 0x1F1E6 + 65);
      }
    }
  }
  if (country.name) {
    const fromName = getCountryCode(country.name);
    if (fromName) return fromName;
  }
  if (country.id) {
    if (/^[A-Za-z]{2}$/.test(country.id.trim())) {
      return country.id.trim().toUpperCase();
    }
    const fromId = getCountryCode(country.id);
    if (fromId) return fromId;
  }
  return undefined;
}

interface Article {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content?: string | null;
  category: ArticleCategory;
  image?: string | null;
  readingTime: string;
  breaking: boolean;
  featured: boolean;
  isRss: boolean;
  status: ArticleStatus;
  publishedAt: string;
  createdAt: string;
  primaryCountryId?: string | null;
  primaryCountry?: Country | null;
  countries: { country: Country }[];
  sourceName?: string | null;
}

const STATUS_TABS: { value: "ALL" | ArticleStatus; label: string; icon: React.ElementType }[] = [
  { value: "ALL", label: "All Stories", icon: FileText },
  { value: "PUBLISHED", label: "Published", icon: CheckCircle2 },
  { value: "DRAFT", label: "Drafts", icon: Clock },
  { value: "PENDING_REVIEW", label: "Pending", icon: Clock },
  { value: "ARCHIVED", label: "Archived", icon: Archive },
];

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  UNIVERSITIES: "Universities",
  ADMISSIONS: "Admissions",
  SCHOLARSHIPS: "Scholarships",
  VISA: "Visa",
  STUDENT_LIFE: "Student Life",
  CAREER: "Career",
};

const ARTICLES_PER_PAGE = 20;

// ---------------------------------------------------------------------------
// localStorage soft-hide helpers (personal testing workspace — no DB writes)
// ---------------------------------------------------------------------------
const DISMISSED_KEY = "admin_dismissed_rss_ids";

function getDismissedIds(): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"ALL" | ArticleStatus>("ALL");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Tab state: "articles" | "rss"
  const [activeTab, setActiveTab] = useState<"articles" | "rss">("articles");

  // Modal state
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    article?: Article;
  }>({ open: false, mode: "create" });

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Soft-hide state — backed by localStorage, zero DB writes
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedIds());

  // Bulk archive state
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [bulkArchiveError, setBulkArchiveError] = useState<string | null>(null);

  // Status counts from backend across all articles
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchArticles = useCallback(
    async (page = currentPage) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ARTICLES_PER_PAGE),
        });
        if (activeStatus !== "ALL") params.set("status", activeStatus);
        if (search.trim()) params.set("search", search.trim());

        const res = await adminGet<{
          success: boolean;
          articles: Article[];
          totalCount: number;
          totalPages: number;
          currentPage: number;
          statusCounts?: Record<string, number>;
        }>(`/admin/articles?${params}`);
        if (res.success) {
          setArticles(res.articles);
          setTotalCount(res.totalCount ?? 0);
          setTotalPages(res.totalPages ?? 1);
          setCurrentPage(res.currentPage ?? page);
          if (res.statusCounts) {
            setStatusCounts(res.statusCounts);
          }
        }
      } catch (err) {
        console.error("Failed to fetch articles:", err);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStatus, search, currentPage]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    setCurrentPage(1);
    setSelectedIds(new Set()); // clear selection when filter/search changes
  }, [activeStatus, search]);

  // Also clear selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => fetchArticles(currentPage), search ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, search, currentPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const data = await adminDelete<{ success: boolean }>(
        `/admin/articles/${deleteTarget.id}`
      );
      if (data.success) {
        setDeleteTarget(null);
        fetchArticles();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickStatus = async (article: Article, newStatus: ArticleStatus) => {
    try {
      await adminPatch(`/admin/articles/${article.id}/status`, { status: newStatus });
      fetchArticles();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const totalByStatus = (status: ArticleStatus) => {
    if (statusCounts[status] !== undefined) {
      return statusCounts[status];
    }
    return activeStatus === status
      ? totalCount
      : articles.filter((a) => a.status === status).length;
  };

  // ---------------------------------------------------------------------------
  // Soft-hide helpers — purely frontend, no API calls
  // ---------------------------------------------------------------------------

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === visibleArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleArticles.map((a) => a.id)));
    }
  }

  function hideSelected() {
    const next = new Set([...dismissedIds, ...selectedIds]);
    setDismissedIds(next);
    saveDismissedIds(next);
    setSelectedIds(new Set());
  }

  function restoreAllHidden() {
    setDismissedIds(new Set());
    setSelectedIds(new Set());
    try { localStorage.removeItem(DISMISSED_KEY); } catch { /* noop */ }
  }

  async function handleBulkArchive(targetStatus: ArticleStatus = "ARCHIVED") {
    if (selectedIds.size === 0) return;
    setBulkArchiving(true);
    setBulkArchiveError(null);
    try {
      await adminPatch<{ success: boolean; count: number }>(
        "/admin/articles/bulk-status",
        {
          ids: [...selectedIds],
          status: targetStatus,
        }
      );
      setSelectedIds(new Set());
      setShowBulkArchiveConfirm(false);
      await fetchArticles(1);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
          ? err.message
          : "Bulk action failed. Please try again.";
      console.error("Bulk archive failed:", msg);
      setBulkArchiveError(msg);
    } finally {
      setBulkArchiving(false);
    }
  }

  // Derived: articles visible after soft-hide filter
  const visibleArticles = articles.filter((a) => !dismissedIds.has(a.id));

  return (
    <div className="space-y-3.5">
      {/* Header Block: Title + Grouped Metadata beneath it on Left, Search + Actions on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display">
            News &amp; Editorial
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed flex items-center gap-2 flex-wrap">
            <span>Draft, edit, publish, and manage editorial articles and automated government RSS feeds.</span>
            <span className="inline-block text-slate-300">·</span>
            <span className="font-semibold text-slate-700">{totalCount} articles</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Search bar moved out of content body into header row */}
          <div className="relative w-full sm:w-64 md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search headlines, slugs, summaries..."
              className="w-full h-9 pl-9 pr-4 text-xs bg-slate-50/70 border border-slate-200/80 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
            />
          </div>

          {/* Add Article Action Button */}
          <button
            onClick={() => setFormModal({ open: true, mode: "create" })}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-full shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Article</span>
          </button>
        </div>
      </div>

      {/* Segmented View Switcher */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 border border-slate-200/70 rounded-full w-fit shadow-2xs">
        <button
          id="news-tab-articles"
          onClick={() => setActiveTab("articles")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "articles"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-[#1769E0]" />
          <span>Editorial Articles</span>
          <span
            className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              activeTab === "articles"
                ? "bg-[#1769E0] text-white"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          id="news-tab-rss"
          onClick={() => setActiveTab("rss")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "rss"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Rss className="h-3.5 w-3.5 text-amber-500" />
          <span>RSS Ingestion Feeds</span>
        </button>
      </div>

      {/* ─── Articles Tab View ─── */}
      {activeTab === "articles" && (
        <div className="space-y-3">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            {STATUS_TABS.map(({ value, label, icon: Icon }) => {
              const isSelected = activeStatus === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveStatus(value as ArticleStatus)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? "bg-[#1769E0] text-white border-[#1769E0] shadow-sm"
                      : "bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  {value !== "ALL" && (
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {totalByStatus(value as ArticleStatus)}
                    </span>
                  )}
                </button>
              );
            })}

            {activeStatus !== "ALL" && (
              <button
                onClick={() => setActiveStatus("ALL")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Filter</span>
              </button>
            )}

            {/* Restore Hidden pill — only shows when there are dismissed articles */}
            {dismissedIds.size > 0 && (
              <button
                onClick={restoreAllHidden}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold
                           bg-amber-50 border border-amber-300 text-amber-700
                           hover:bg-amber-100 hover:border-amber-400 transition-colors cursor-pointer shadow-2xs"
                title="Restore all hidden articles back into view"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Restore Hidden ({dismissedIds.size})</span>
              </button>
            )}
          </div>

          {/* Bulk action bar — slides in when rows are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between px-5 py-3
                            bg-blue-50/90 border border-blue-200/80 rounded-[22px] shadow-xs">
              {/* Left: count + clear */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-[#1769E0] text-white flex items-center
                                justify-center text-[11px] font-bold shrink-0 shadow-2xs">
                  {selectedIds.size}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {selectedIds.size} row{selectedIds.size > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
                >
                  Clear
                </button>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-2">
                {activeStatus === "ARCHIVED" ? (
                  <button
                    onClick={() => handleBulkArchive("PUBLISHED")}
                    disabled={bulkArchiving}
                    title="Restore selected articles to Published status"
                    className="flex items-center gap-1.5 px-4 py-2
                               bg-emerald-600 text-white text-xs font-semibold rounded-full
                               hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    {bulkArchiving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Restore {selectedIds.size} to Published
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setBulkArchiveError(null);
                      setShowBulkArchiveConfirm(true);
                    }}
                    disabled={bulkArchiving}
                    title="Archive selected — removes from public site, keeps in DB under Archived tab"
                    className="flex items-center gap-1.5 px-4 py-2
                               bg-slate-700 text-white text-xs font-semibold rounded-full
                               hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive {selectedIds.size}
                  </button>
                )}

                {/* Hide from view button — local only, no DB write */}
                <button
                  onClick={hideSelected}
                  title="Hide from this browser view only — no database change"
                  className="flex items-center gap-1.5 px-4 py-2
                             bg-slate-900 text-white text-xs font-semibold rounded-full
                             hover:bg-slate-800 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide {selectedIds.size} from view
                </button>
              </div>
            </div>
          )}

          {/* Table Card Container */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden flex flex-col w-full">
            <div className="overflow-x-auto xl:overflow-x-hidden w-full">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1769E0]" />
                  <p className="text-xs">Loading articles from PostgreSQL…</p>
                </div>
              ) : articles.length === 0 ? (
                <AdminEmptyState
                  title="No articles found"
                  description={
                    search
                      ? "No articles matched your search keywords."
                      : activeStatus !== "ALL"
                      ? `No articles with status "${activeStatus}".`
                      : "No articles in database yet. Click \"Add Article\" to publish."
                  }
                  icon={Newspaper}
                />
              ) : (
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-600 font-semibold text-xs">
                      {/* S.No. column */}
                      <th className="py-3.5 px-3 text-center w-11">#</th>
                      {/* Select-all checkbox */}
                      <th className="py-3.5 px-2.5 text-center w-9">
                        <input
                          type="checkbox"
                          checked={visibleArticles.length > 0 && selectedIds.size === visibleArticles.length}
                          ref={(el) => {
                            if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < visibleArticles.length;
                          }}
                          onChange={toggleSelectAll}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-[#1769E0] cursor-pointer"
                          title="Select all visible rows"
                        />
                      </th>
                      <th className="py-3.5 px-5">Headline</th>
                      <th className="py-3.5 px-5 w-32">Category</th>
                      <th className="py-3.5 px-4 w-28">Countries</th>
                      <th className="py-3.5 px-5 w-32">Published</th>
                      <th className="py-3.5 px-5 w-36">Source</th>
                      <th className="py-3.5 px-5 w-32">Status</th>
                      <th className="py-3.5 px-5 text-right w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleArticles.map((item, index) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* S.No. — continuous across pages */}
                        <td className="py-3.5 px-3 text-center text-[11px] text-slate-400 font-mono select-none">
                          {(currentPage - 1) * ARTICLES_PER_PAGE + index + 1}
                        </td>
                        {/* Row checkbox */}
                        <td className="py-3.5 px-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#1769E0] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-5 min-w-0">
                          <div className="flex items-center gap-2 group/title min-w-0">
                            {item.breaking && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500 text-white tracking-wide">
                                BREAKING
                              </span>
                            )}
                            <span
                              className="font-semibold text-[13px] text-slate-900 group-hover:text-[#1769E0] transition-colors truncate cursor-pointer block min-w-0"
                              title={`${item.headline} (/news/${item.slug})`}
                              onClick={() => setFormModal({ open: true, mode: "edit", article: item })}
                            >
                              {item.headline}
                            </span>
                            <a
                              href={`/news/${item.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#1769E0] transition-opacity p-0.5 rounded shrink-0"
                              title={`View live: /news/${item.slug}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#D0E2FF] text-[#1B3256] border border-[#B2D2FE] shadow-2xs">
                            {CATEGORY_LABELS[item.category] ?? item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {item.countries.slice(0, 3).map(({ country }) => {
                              const code = getCodeForCountry(country);
                              const countryTitle = country.name || code || "Country";
                              return (
                                <span
                                  key={country.id}
                                  className="inline-flex items-center justify-center p-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition-all cursor-default group"
                                  title={countryTitle}
                                >
                                  {code ? (
                                    <CountryFlag
                                      code={code}
                                      size="md"
                                      className="rounded-[2px] shadow-2xs group-hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <span className="text-sm">{country.flag}</span>
                                  )}
                                </span>
                              );
                            })}
                            {item.countries.length === 0 && (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap text-[11px]">
                          {formatDate(item.publishedAt)}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {item.isRss ? (
                            <div className="flex flex-col gap-0.5">
                              <StatusBadge status="RSS" size="sm" />
                              {item.sourceName && (
                                <span
                                  className="text-[10px] text-slate-400 truncate max-w-[120px]"
                                  title={item.sourceName}
                                >
                                  {item.sourceName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <StatusBadge status="EDITORIAL" size="sm" />
                          )}
                        </td>
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <StatusBadge status={item.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                          {/* View & edit in live preview */}
                          <Link
                            href={`/news/${item.slug}?adminPreview=true`}
                            target="_blank"
                            className="p-2 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50/80 rounded-full transition-colors"
                            title="View & Edit Story"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>

                          {/* Edit article modal */}
                          <button
                            onClick={() =>
                              setFormModal({
                                open: true,
                                mode: "edit",
                                article: item,
                              })
                            }
                            className="p-2 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50/80 rounded-full transition-colors cursor-pointer"
                            title="Edit Article"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Publish / Archive status toggle */}
                          {item.status === "DRAFT" || item.status === "PENDING_REVIEW" ? (
                            <button
                              onClick={() => handleQuickStatus(item, "PUBLISHED")}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                              title="Publish Article"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          ) : item.status === "PUBLISHED" ? (
                            <button
                              onClick={() => handleQuickStatus(item, "ARCHIVED")}
                              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                              title="Archive Article"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          ) : item.status === "ARCHIVED" ? (
                            <button
                              onClick={() => handleQuickStatus(item, "PUBLISHED")}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                              title="Restore Article to Published"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}

                          {/* Delete target trigger */}
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                            title="Delete Article"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/60">
              <p className="text-[11px] text-slate-500">
                Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                <span className="font-semibold text-slate-900">{totalPages}</span>
                {" "}·{" "}
                <span className="font-semibold text-slate-900">{totalCount}</span> articles
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`el-${i}`} className="px-2 text-xs text-slate-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => goToPage(p as number)}
                        className={`min-w-[32px] h-8 px-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          currentPage === p
                            ? "bg-[#1769E0] text-white shadow-xs"
                            : "text-slate-700 hover:bg-slate-200/60"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Table Footer Note */}
          <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
            <span>{`Showing ${visibleArticles.length}${dismissedIds.size > 0 ? ` (${dismissedIds.size} hidden)` : ""} of ${totalCount} articles · Page ${currentPage} of ${totalPages}`}</span>
            <span className="text-[10px] text-slate-400 font-medium">AbroadBulletin Intelligence System</span>
          </div>
        </div>
        </div>
      )}

      {/* ─── RSS Feeds Tab View ─── */}
      {activeTab === "rss" && (
        <div className="bg-white border border-slate-200/75 rounded-[28px] p-6 sm:p-7 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-200/80">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Rss className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Live Automated RSS Feed Preview</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Preview official immigration articles from Canada IRCC and UK UKVI feeds before importing to database.
              </p>
            </div>
          </div>
          <RSSPreviewPanel onImportSuccess={fetchArticles} />
        </div>
      )}

      {/* Article Form Modal */}
      {formModal.open && (
        <ArticleFormModal
          mode={formModal.mode}
          initialData={
            formModal.article
              ? {
                  id: formModal.article.id,
                  slug: formModal.article.slug,
                  headline: formModal.article.headline,
                  summary: formModal.article.summary,
                  content: formModal.article.content ?? "",
                  category: formModal.article.category,
                  image: formModal.article.image ?? "",
                  readingTime: formModal.article.readingTime,
                  breaking: formModal.article.breaking,
                  featured: formModal.article.featured,
                  status: formModal.article.status,
                  primaryCountryId: formModal.article.primaryCountryId ?? "",
                  countryIds: formModal.article.countries.map((c) => c.country.id),
                }
              : undefined
          }
          onClose={() => setFormModal({ open: false, mode: "create" })}
          onSuccess={() => fetchArticles()}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-slate-200/90 p-7 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Article</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action will remove the article from PostgreSQL.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-6 line-clamp-2">
              {deleteTarget.headline}
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-full transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
              >
                {deleting ? "Deleting..." : "Delete Story"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Archive Confirmation Modal */}
      {showBulkArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-slate-200/90 p-7
                          animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center
                              justify-center shrink-0">
                <Archive className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Archive {selectedIds.size} Article{selectedIds.size > 1 ? "s" : ""}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These articles will be removed from the public site and moved to the Archived tab.
                  No data is deleted — you can re-publish them at any time.
                </p>
              </div>
            </div>

            {/* What happens checklist */}
            <ul className="space-y-2 mb-6 text-xs text-slate-600 bg-slate-50 border border-slate-200
                           rounded-2xl px-4 py-3.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Removed from public <span className="font-mono">/news</span> site immediately</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Moved to “Archived” filter tab in admin panel</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>RSS Ingestion Feeds tab completely unaffected</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Fully reversible — re-publish any article at any time</span>
              </li>
            </ul>

            {bulkArchiveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                {bulkArchiveError}
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowBulkArchiveConfirm(false)}
                disabled={bulkArchiving}
                className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white
                           hover:bg-slate-100 border border-slate-200 rounded-full
                           transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkArchive("ARCHIVED")}
                disabled={bulkArchiving}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-800
                           hover:bg-slate-900 rounded-full cursor-pointer disabled:opacity-50
                           shadow-2xs hover:shadow-xs transition-all flex items-center gap-2"
              >
                {bulkArchiving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Archiving…</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" />
                    <span>Archive {selectedIds.size}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
