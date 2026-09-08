"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Edit3, Trash2, Filter, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeadlineFormModal } from "@/components/admin/DeadlineFormModal";
import { adminGet, adminDelete } from "@/lib/api/apiClient";

type DeadlineType = "VISA" | "IMMIGRATION" | "APPLICATION" | "REGISTRATION" | "POLICY" | "SCHOLARSHIP";

interface Country {
  id: string;
  name: string;
  flag: string;
}

interface Deadline {
  id: string;
  slug: string;
  title: string;
  countryId: string;
  country: Country;
  deadlineDate: string;
  deadlineType: DeadlineType;
  status: string;
  importance: string;
  description: string;
  source: string;
  lastUpdated: string;
  relatedArticleTitle: string | null;
  relatedArticleHref: string | null;
  applicationUrl: string | null;
  tags: string[];
  content: string | null;
}

function daysLeft(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function AdminDeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; deadline: Deadline } | null
  >(null);

  const types = [
    "All",
    "VISA",
    "IMMIGRATION",
    "APPLICATION",
    "REGISTRATION",
    "POLICY",
    "SCHOLARSHIP",
  ];

  const load = useCallback(() => {
    setLoading(true);
    adminGet<{ success: boolean; deadlines: Deadline[] }>("/admin/deadlines")
      .then((d) => {
        if (d.success) setDeadlines(d.deadlines);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load deadlines.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    load();
  }, [load]);

  const handleDelete = async (d: Deadline) => {
    if (!confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    try {
      await adminDelete(`/admin/deadlines/${d.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete deadline.");
    }
  };

  const filteredDeadlines = deadlines.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.country?.name.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === "All" || d.deadlineType === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Intake & Award Deadlines"
        description="Monitor countdowns and close dates for university admissions cycles, intake terms, immigration policy, and international grants."
        count={deadlines.length}
        countLabel="deadlines"
        addLabel="Add Deadline"
        onAdd={() => setModal({ mode: "create" })}
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-medium">
          {error}
        </div>
      )}

      <AdminTableContainer
        count={filteredDeadlines.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search opportunity, destination..."
        footerNote={`Displaying ${filteredDeadlines.length} of ${deadlines.length} tracked countdowns`}
        filterComponent={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors cursor-pointer"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All Types" : `${t} Deadlines`}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading deadlines...
          </div>
        ) : filteredDeadlines.length === 0 ? (
          <AdminEmptyState
            title="No deadlines found"
            description="No countdown items matched your search filters."
            icon={Clock}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Opportunity / Institution</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Destination</th>
                <th className="py-3 px-3">Deadline Date</th>
                <th className="py-3 px-3">Days Left</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeadlines.map((d) => {
                const remaining = daysLeft(d.deadlineDate);
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-sm">
                      <div className="group-hover:text-[#1769E0] transition-colors font-bold text-xs sm:text-sm">
                        {d.title}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-200/80">
                        {d.deadlineType}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {d.country?.name}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap text-[11px]">
                      {new Date(d.deadlineDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          remaining <= 10
                            ? "bg-rose-50 text-rose-700 border-rose-200/80"
                            : "bg-amber-50 text-amber-700 border-amber-200/80"
                        }`}
                      >
                        {remaining} days
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ mode: "edit", deadline: d })}
                          className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Deadline"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Deadline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminTableContainer>

      {modal && (
        <DeadlineFormModal
          mode={modal.mode}
          initialData={
            modal.mode === "edit"
              ? {
                  ...modal.deadline,
                  deadlineDate: modal.deadline.deadlineDate.slice(0, 10),
                  relatedArticleTitle: modal.deadline.relatedArticleTitle ?? "",
                  relatedArticleHref: modal.deadline.relatedArticleHref ?? "",
                  applicationUrl: modal.deadline.applicationUrl ?? "",
                  content: modal.deadline.content ?? "",
                  status: modal.deadline.status as
                    | "UPCOMING"
                    | "CLOSING_SOON"
                    | "PASSED"
                    | "UPDATED",
                  importance: modal.deadline.importance as "CRITICAL" | "HIGH" | "MEDIUM",
                }
              : undefined
          }
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
