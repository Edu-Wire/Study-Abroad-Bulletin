"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, Eye, Edit3, Trash2, Filter, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ScholarshipFormModal } from "@/components/admin/ScholarshipFormModal";
import { adminGet, adminDelete } from "@/lib/api/apiClient";

type ScholarshipType = "FULLY_FUNDED" | "PARTIAL" | "TUITION_WAIVER";

const TYPE_LABELS: Record<ScholarshipType, string> = {
  FULLY_FUNDED: "Fully Funded",
  PARTIAL: "Partial",
  TUITION_WAIVER: "Tuition Waiver",
};

interface Country {
  id: string;
  name: string;
  flag: string;
}

interface Scholarship {
  id: string;
  slug: string;
  name: string;
  organization: string;
  funding: string;
  degree: string;
  deadline: string | null;
  deadlineString: string;
  eligibility: string;
  type: ScholarshipType;
  universityId: string | null;
  university: { id: string; name: string } | null;
  destinations: Country[];
}

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export default function AdminScholarshipsPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; scholarship: Scholarship } | null
  >(null);

  const fundingTypes = ["All", "FULLY_FUNDED", "PARTIAL", "TUITION_WAIVER"];

  const load = useCallback(() => {
    setLoading(true);
    adminGet<{ success: boolean; scholarships: Scholarship[] }>("/admin/scholarships")
      .then((d) => {
        if (d.success) setScholarships(d.scholarships);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load scholarships.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    load();
  }, [load]);

  const handleDelete = async (sch: Scholarship) => {
    if (!confirm(`Delete "${sch.name}"? This cannot be undone.`)) return;
    try {
      await adminDelete(`/admin/scholarships/${sch.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete scholarship.");
    }
  };

  const filteredScholarships = scholarships.filter((sch) => {
    const destinationNames = sch.destinations.map((d) => d.name).join(" ");
    const matchesSearch =
      sch.name.toLowerCase().includes(search.toLowerCase()) ||
      sch.organization.toLowerCase().includes(search.toLowerCase()) ||
      destinationNames.toLowerCase().includes(search.toLowerCase()) ||
      sch.eligibility.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === "All" || sch.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Scholarships & Grants"
        description="Index international awards, government financial grants, coverage values, eligibility criteria, and application close dates."
        count={scholarships.length}
        countLabel="scholarships"
        addLabel="Add Scholarship"
        onAdd={() => setModal({ mode: "create" })}
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-medium">
          {error}
        </div>
      )}

      <AdminTableContainer
        count={filteredScholarships.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search awards, providers, countries..."
        footerNote={`Displaying ${filteredScholarships.length} of ${scholarships.length} scholarships`}
        filterComponent={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors cursor-pointer"
            >
              {fundingTypes.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All Funding Types" : TYPE_LABELS[t as ScholarshipType]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading scholarships...
          </div>
        ) : filteredScholarships.length === 0 ? (
          <AdminEmptyState
            title="No scholarships found"
            description="No awards matched your search keywords or funding filter."
            icon={Award}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Award & Provider</th>
                <th className="py-3 px-3">Funding Type</th>
                <th className="py-3 px-3">Destination</th>
                <th className="py-3 px-3">Degree</th>
                <th className="py-3 px-3">Grant Value</th>
                <th className="py-3 px-3">Deadline</th>
                <th className="py-3 px-3">Countdown</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredScholarships.map((sch) => {
                const remaining = daysLeft(sch.deadline);
                return (
                  <tr
                    key={sch.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                      <div className="line-clamp-1 group-hover:text-[#1769E0] transition-colors">
                        {sch.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate font-normal mt-0.5">
                        {sch.organization}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge
                        status={sch.type}
                        label={TYPE_LABELS[sch.type]}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {sch.destinations.length > 0
                        ? sch.destinations.map((d) => d.name).join(", ")
                        : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                      {sch.degree}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {sch.funding}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {sch.deadlineString}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {remaining === null ? (
                        <span className="text-slate-400 text-[11px]">—</span>
                      ) : (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            remaining <= 10
                              ? "bg-rose-50 text-rose-700 border-rose-200/80"
                              : "bg-amber-50 text-amber-700 border-amber-200/80"
                          }`}
                        >
                          {remaining}d left
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href="/scholarships"
                          target="_blank"
                          className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Public Page"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => setModal({ mode: "edit", scholarship: sch })}
                          className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Scholarship"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sch)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Scholarship"
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
        <ScholarshipFormModal
          mode={modal.mode}
          initialData={
            modal.mode === "edit"
              ? {
                  ...modal.scholarship,
                  universityId: modal.scholarship.universityId ?? "",
                  deadline: modal.scholarship.deadline
                    ? modal.scholarship.deadline.slice(0, 10)
                    : "",
                  countryIds: modal.scholarship.destinations.map((d) => d.id),
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
