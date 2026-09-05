"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, Edit3, Trash2, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ArticleFormModal } from "@/components/admin/ArticleFormModal";
import { adminGet, adminDelete } from "@/lib/api/apiClient";

interface Country {
  id: string;
  name: string;
  flag: string;
}

interface GuideArticle {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content: string | null;
  category: string;
  image: string | null;
  readingTime: string;
  breaking: boolean;
  featured: boolean;
  status: string;
  primaryCountry: Country | null;
  countries: { country: Country }[];
}

export default function AdminGuidesPage() {
  const [articles, setArticles] = useState<GuideArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; article: GuideArticle } | null
  >(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGet<{ success: boolean; articles: GuideArticle[] }>(
      "/admin/articles?category=GUIDES&limit=100"
    )
      .then((d) => {
        if (d.success) setArticles(d.articles);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load guides.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    load();
  }, [load]);

  const handleDelete = async (article: GuideArticle) => {
    if (!confirm(`Delete "${article.headline}"? This cannot be undone.`)) return;
    try {
      await adminDelete(`/admin/articles/${article.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete guide.");
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.headline.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Editorial Guides"
        description="Author, publish, and manage in-depth student resources, SOP frameworks, IELTS strategies, and destination walkthroughs. Backed by the same editorial article system as the newsroom."
        count={articles.length}
        countLabel="guides"
        addLabel="Add Guide"
        onAdd={() => setModal({ mode: "create" })}
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-medium">
          {error}
        </div>
      )}

      <AdminTableContainer
        count={filteredArticles.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search guide titles, keywords..."
        footerNote={`Displaying ${filteredArticles.length} of ${articles.length} editorial guides`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading guides...
          </div>
        ) : filteredArticles.length === 0 ? (
          <AdminEmptyState
            title="No guides found"
            description="No editorial guides matched your search keywords."
            icon={BookOpen}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Title & Overview</th>
                <th className="py-3 px-3">Reading Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArticles.map((g) => (
                <tr
                  key={g.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-md">
                    <div className="group-hover:text-[#1769E0] transition-colors font-bold text-xs sm:text-sm">
                      {g.headline}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 font-normal mt-0.5">
                      {g.summary}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                    {g.readingTime}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge status={g.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/guides"
                        target="_blank"
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Public Guide"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setModal({ mode: "edit", article: g })}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Guide"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Guide"
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

      {modal && (
        <ArticleFormModal
          mode={modal.mode}
          initialData={
            modal.mode === "edit"
              ? {
                  ...modal.article,
                  category: "GUIDES",
                  content: modal.article.content ?? "",
                  image: modal.article.image ?? "",
                  status: modal.article.status as
                    | "DRAFT"
                    | "PENDING_REVIEW"
                    | "PUBLISHED"
                    | "ARCHIVED"
                    | "REJECTED",
                  primaryCountryId: modal.article.primaryCountry?.id ?? "",
                  countryIds: modal.article.countries.map((c) => c.country.id),
                }
              : { category: "GUIDES" }
          }
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
