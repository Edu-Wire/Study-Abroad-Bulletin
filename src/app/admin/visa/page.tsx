"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck2, Eye, Edit3, Trash2, Loader2 } from "lucide-react";
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

interface VisaArticle {
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
  publishedAt: string | null;
  primaryCountry: Country | null;
  countries: { country: Country }[];
}

export default function AdminVisaPage() {
  const [articles, setArticles] = useState<VisaArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; article: VisaArticle } | null
  >(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGet<{ success: boolean; articles: VisaArticle[] }>(
      "/admin/articles?category=VISA&limit=100"
    )
      .then((d) => {
        if (d.success) setArticles(d.articles);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load visa updates.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    load();
  }, [load]);

  const handleDelete = async (article: VisaArticle) => {
    if (!confirm(`Delete "${article.headline}"? This cannot be undone.`)) return;
    try {
      await adminDelete(`/admin/articles/${article.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete visa update.");
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.headline.toLowerCase().includes(search.toLowerCase()) ||
      (a.primaryCountry?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Visa & Immigration Updates"
        description="Publish official immigration policy alerts, financial proof changes, permit regulation updates, and urgent visa notices. Backed by the same editorial article system as the newsroom."
        count={articles.length}
        countLabel="updates"
        addLabel="Add Visa Alert"
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
        searchPlaceholder="Search headline, country..."
        footerNote={`Displaying ${filteredArticles.length} of ${articles.length} immigration notices`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading visa updates...
          </div>
        ) : filteredArticles.length === 0 ? (
          <AdminEmptyState
            title="No visa updates found"
            description="No immigration notices matched your search query."
            icon={FileCheck2}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Policy Headline</th>
                <th className="py-3 px-3">Published</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArticles.map((a) => (
                <tr
                  key={a.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    {a.primaryCountry ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg" role="img" aria-label={a.primaryCountry.name}>
                          {a.primaryCountry.flag}
                        </span>
                        <span>{a.primaryCountry.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-sm">
                    <div className="line-clamp-2 group-hover:text-[#1769E0] transition-colors">
                      {a.headline}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                    {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge status={a.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/visa"
                        target="_blank"
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Public Notice"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setModal({ mode: "edit", article: a })}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Policy"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Policy"
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
                  category: "VISA",
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
              : { category: "VISA" }
          }
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
