"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Newspaper,
  Eye,
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
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ArticleFormModal } from "@/components/admin/ArticleFormModal";
import { RSSPreviewPanel } from "@/components/admin/RSSPreviewPanel";
import { adminGet, adminDelete, adminPatch } from "@/lib/api/apiClient";

type ArticleStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED" | "REJECTED";
type ArticleCategory = "UNIVERSITIES" | "ADMISSIONS" | "SCHOLARSHIPS" | "VISA" | "STUDENT_LIFE" | "CAREER";

interface Country {
  id: string;
  name: string;
  flag: string;
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
        }>(`/admin/articles?${params}`);
        if (res.success) {
          setArticles(res.articles);
          setTotalCount(res.totalCount ?? 0);
          setTotalPages(res.totalPages ?? 1);
          setCurrentPage(res.currentPage ?? page);
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
  }, [activeStatus, search]);

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

  const totalByStatus = (status: ArticleStatus) =>
    activeStatus === status ? totalCount : articles.filter((a) => a.status === status).length;

  return (
    <div className="space-y-6">
      {/* Unified Page Header — No Duplicate H1 */}
      <AdminPageHeader
        title="News & Editorial"
        description="Draft, edit, publish, and manage editorial articles and automated government RSS feeds."
        count={totalCount}
        countLabel="articles"
        addLabel="Add Article"
        onAdd={() => setFormModal({ open: true, mode: "create" })}
      />

      {/* Segmented View Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 border border-slate-200/80 rounded-xl w-fit">
        <button
          id="news-tab-articles"
          onClick={() => setActiveTab("articles")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "articles"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-[#1769E0]" />
          <span>Editorial Articles</span>
          <span
            className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
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
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "rss"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Rss className="h-3.5 w-3.5 text-amber-500" />
          <span>RSS Ingestion Feeds</span>
        </button>
      </div>

      {/* ─── Articles Tab View ─── */}
      {activeTab === "articles" && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            {STATUS_TABS.map(({ value, label, icon: Icon }) => {
              const isSelected = activeStatus === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveStatus(value as ArticleStatus)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#1769E0] text-white border-[#1769E0] shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  {value !== "ALL" && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
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
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Filter</span>
              </button>
            )}
          </div>

          {/* Table Container */}
          <AdminTableContainer
            count={totalCount}
            searchValue={search}
            onSearchChange={(v) => {
              setSearch(v);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search headlines, slugs, summaries..."
            footerNote={`Showing ${articles.length} of ${totalCount} articles · Page ${currentPage} of ${totalPages}`}
          >
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
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Headline & Slug</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Countries</th>
                    <th className="py-3 px-3">Published</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articles.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3 px-4 max-w-xs sm:max-w-sm">
                        <div className="font-semibold text-slate-900 line-clamp-1 group-hover:text-[#1769E0] transition-colors">
                          {item.breaking && (
                            <span className="inline-block mr-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white align-middle">
                              BREAKING
                            </span>
                          )}
                          {item.headline}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          /news/{item.slug}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-100">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {item.countries.slice(0, 3).map(({ country }) => (
                            <span
                              key={country.id}
                              className="text-xs"
                              title={country.name}
                            >
                              {country.flag}
                            </span>
                          ))}
                          {item.countries.length === 0 && (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatDate(item.publishedAt)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
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
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View & edit in live preview */}
                          <Link
                            href={`/news/${item.slug}?adminPreview=true`}
                            target="_blank"
                            className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors"
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
                            className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Article"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Publish / Archive status toggle */}
                          {item.status === "DRAFT" || item.status === "PENDING_REVIEW" ? (
                            <button
                              onClick={() => handleQuickStatus(item, "PUBLISHED")}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Publish Article"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          ) : item.status === "PUBLISHED" ? (
                            <button
                              onClick={() => handleQuickStatus(item, "ARCHIVED")}
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Archive Article"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          ) : null}

                          {/* Delete target trigger */}
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/80 bg-slate-50/60">
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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                          className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            currentPage === p
                              ? "bg-[#1769E0] text-white shadow-2xs"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </AdminTableContainer>
        </div>
      )}

      {/* ─── RSS Feeds Tab View ─── */}
      {activeTab === "rss" && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200/80">
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Rss className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Live Automated RSS Feed Preview</h2>
              <p className="text-[11px] text-slate-500">
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
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Article</h3>
                <p className="text-xs text-slate-500">This action will remove the article from PostgreSQL.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mb-5 line-clamp-2">
              {deleteTarget.headline}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {deleting ? "Deleting..." : "Delete Story"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
