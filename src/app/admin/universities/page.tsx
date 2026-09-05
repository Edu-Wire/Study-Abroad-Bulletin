"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Eye, Edit3, Trash2, Filter, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UniversityFormModal } from "@/components/admin/UniversityFormModal";
import { adminGet, adminDelete } from "@/lib/api/apiClient";

interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
}

interface University {
  id: string;
  slug: string;
  name: string;
  initials: string;
  countryId: string;
  country: Country;
  city: string;
  ranking: number;
  tuition: string;
  tuitionValue: number;
  courses: string[];
  scholarships: boolean;
  intake: string;
  degree: string;
  ielts: string;
}

export default function AdminUniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; university: University } | null
  >(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGet<{ success: boolean; universities: University[] }>("/admin/universities")
      .then((d) => {
        if (d.success) setUniversities(d.universities);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load universities.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    load();
  }, [load]);

  const handleDelete = async (uni: University) => {
    if (!confirm(`Delete "${uni.name}"? This cannot be undone.`)) return;
    try {
      await adminDelete(`/admin/universities/${uni.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete university.");
    }
  };

  const countriesList = [
    "All",
    ...Array.from(new Set(universities.map((u) => u.country?.name).filter(Boolean))),
  ];

  const filteredUniversities = universities.filter((uni) => {
    const matchesSearch =
      uni.name.toLowerCase().includes(search.toLowerCase()) ||
      uni.city.toLowerCase().includes(search.toLowerCase()) ||
      uni.courses.some((c) => c.toLowerCase().includes(search.toLowerCase()));

    const matchesCountry =
      selectedCountry === "All" || uni.country?.name === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Universities Directory"
        description="Index partner institutions, global QS/THE rankings, degree programs, tuition estimates, and admissions criteria."
        count={universities.length}
        countLabel="universities"
        addLabel="Add University"
        onAdd={() => setModal({ mode: "create" })}
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-medium">
          {error}
        </div>
      )}

      <AdminTableContainer
        count={filteredUniversities.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search institution name, city, program..."
        footerNote={`Displaying ${filteredUniversities.length} of ${universities.length} institutions`}
        filterComponent={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors cursor-pointer"
            >
              {countriesList.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Destinations" : c}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading universities...
          </div>
        ) : filteredUniversities.length === 0 ? (
          <AdminEmptyState
            title="No universities found"
            description="No institutions matched your search keywords or country filter."
            icon={GraduationCap}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Global Rank</th>
                <th className="py-3 px-3">Annual Tuition</th>
                <th className="py-3 px-3">Degree Level</th>
                <th className="py-3 px-3">IELTS Req.</th>
                <th className="py-3 px-3">Scholarships</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUniversities.map((uni) => (
                <tr
                  key={uni.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-[#071A33] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {uni.initials}
                      </div>
                      <div className="truncate group-hover:text-[#1769E0] transition-colors">
                        {uni.name}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {uni.city}, {uni.country?.name}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-200/80">
                      #{uni.ranking}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {uni.tuition}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {uni.degree}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                    {uni.ielts}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge
                      status={uni.scholarships ? "AVAILABLE" : "NONE"}
                      label={uni.scholarships ? "Available" : "None"}
                      size="sm"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/universities"
                        target="_blank"
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Public Page"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setModal({ mode: "edit", university: uni })}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit University"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(uni)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete University"
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
        <UniversityFormModal
          mode={modal.mode}
          initialData={
            modal.mode === "edit"
              ? { ...modal.university, id: modal.university.id }
              : undefined
          }
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
