"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Newspaper, ExternalLink, Eye, Edit3, Trash2,
  CheckCircle2, Archive, Clock, FileText, AlertTriangle, X,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { ArticleFormModal } from "@/components/admin/ArticleFormModal";

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
  { value: "ALL", label: "All", icon: FileText },
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

function StatusBadge({ status }: { status: ArticleStatus }) {
  const map: Record<ArticleStatus, { label: string; className: string }> = {
    PUBLISHED: { label: "Published", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    DRAFT: { label: "Draft", className: "text-amber-700 bg-amber-50 border-amber-200" },
    PENDING_REVIEW: { label: "Pending Review", className: "text-purple-700 bg-purple-50 border-purple-200" },
    ARCHIVED: { label: "Archived", className: "text-gray-600 bg-gray-50 border-gray-200" },
    REJECTED: { label: "Rejected", className: "text-rose-700 bg-rose-50 border-rose-200" },
  };
  const { label, className } = map[status] ?? map.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"ALL" | ArticleStatus>("ALL");

  // Modal state
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    article?: Article;
  }>({ open: false, mode: "create" });

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "100" });
      if (activeStatus !== "ALL") params.set("status", activeStatus);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`http://localhost:8000/api/admin/articles?${params}`);
      const data = await res.json();
      if (data.success) {
        setArticles(data.articles);
      }
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchArticles(), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchArticles, search]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/admin/articles/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
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
      await fetch(`http://localhost:8000/api/admin/articles/${article.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchArticles();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const totalByStatus = (status: ArticleStatus) =>
    articles.filter((a) => a.status === status).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="News Management"
        description="Create, edit, publish and archive editorial news articles stored in PostgreSQL."
        count={articles.length}
        countLabel="articles"
        addLabel="Add News"
        onAdd={() => setFormModal({ open: true, mode: "create" })}
      />

      {/* Quick stat pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.slice(1).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveStatus(value as ArticleStatus)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
              activeStatus === value
                ? "bg-[#1769E0] text-white border-[#1769E0]"
                : "bg-white text-[#374151] border-[#E4E8EF] hover:border-[#1769E0] hover:text-[#1769E0]"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
            <span className={`${activeStatus === value ? "bg-white/20 text-white" : "bg-[#F7F9FC] text-[#667085]"} px-1.5 py-0.5 rounded-full text-[10px]`}>
              {totalByStatus(value as ArticleStatus)}
            </span>
          </button>
        ))}
        {activeStatus !== "ALL" && (
          <button
            onClick={() => setActiveStatus("ALL")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#F7F9FC] text-[#667085] border border-[#E4E8EF] hover:bg-[#E4E8EF] transition-all cursor-pointer"
          >
            <X className="h-3 w-3" />
            Clear Filter
          </button>
        )}
      </div>

      <AdminTableContainer
        title="All News Articles"
        count={articles.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search headlines, slugs, summaries..."
        footerNote={`${articles.length} articles from PostgreSQL abroad_bulletin`}
      >
        {loading ? (
          <div className="py-12 text-center text-sm text-[#667085]">
            Loading articles from PostgreSQL...
          </div>
        ) : articles.length === 0 ? (
          <AdminEmptyState
            title="No articles found"
            description={
              search
                ? "No articles matched your search. Try different keywords."
                : activeStatus !== "ALL"
                ? `No articles with status "${activeStatus}". Create one or change the filter.`
                : "No articles yet. Click \"Add News\" to create your first article."
            }
            icon={Newspaper}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Headline & Slug</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Countries</th>
                <th className="py-3 px-3">Published</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8EF]">
              {articles.map((item) => (
                <tr key={item.id} className="hover:bg-[#F7F9FC]/60 transition-colors group">
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-[#111827] line-clamp-1 group-hover:text-[#1769E0] transition-colors">
                      {item.breaking && (
                        <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white align-middle">
                          BREAKING
                        </span>
                      )}
                      {item.headline}
                    </div>
                    <div className="text-[11px] text-[#667085] font-mono mt-0.5 truncate">
                      /news/{item.slug}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1769E0]/10 text-[#1769E0]">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {item.countries.slice(0, 3).map(({ country }) => (
                        <span key={country.id} className="text-[11px]" title={country.name}>
                          {country.flag}
                        </span>
                      ))}
                      {item.countries.length === 0 && (
                        <span className="text-[#9CA3AF] text-[10px]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {formatDate(item.publishedAt)}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {item.isRss ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Live RSS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Editorial
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* View public page */}
                      <Link
                        href={`/news/${item.slug}`}
                        target="_blank"
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors"
                        title="View Public Story"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>

                      {/* Edit */}
                      <button
                        onClick={() =>
                          setFormModal({
                            open: true,
                            mode: "edit",
                            article: item,
                          })
                        }
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                        title="Edit Article"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {/* Quick status toggle: Publish / Archive */}
                      {item.status === "DRAFT" || item.status === "PENDING_REVIEW" ? (
                        <button
                          onClick={() => handleQuickStatus(item, "PUBLISHED")}
                          className="p-1.5 text-[#667085] hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Publish Article"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      ) : item.status === "PUBLISHED" ? (
                        <button
                          onClick={() => handleQuickStatus(item, "ARCHIVED")}
                          className="p-1.5 text-[#667085] hover:text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                          title="Archive Article"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      ) : null}

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
      </AdminTableContainer>

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

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#E4E8EF] p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Delete Article</h3>
                <p className="text-xs text-[#667085]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-[#374151] bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg px-3 py-2.5 mb-5 line-clamp-2">
              {deleteTarget.headline}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-[#4B5563] bg-[#F7F9FC] hover:bg-[#E4E8EF] border border-[#E4E8EF] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
