"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Eye, Edit3, Trash2, Filter, X, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { universities } from "@/data/mock";

export default function AdminUniversitiesPage() {
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const countriesList = [
    "All",
    ...Array.from(new Set(universities.map((u) => u.country))),
  ];

  const filteredUniversities = universities.filter((uni) => {
    const matchesSearch =
      uni.name.toLowerCase().includes(search.toLowerCase()) ||
      uni.city.toLowerCase().includes(search.toLowerCase()) ||
      uni.courses.some((c) => c.toLowerCase().includes(search.toLowerCase()));

    const matchesCountry =
      selectedCountry === "All" || uni.country === selectedCountry;

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
        onAdd={() => setActionNotice("Create University Record")}
      />

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
        {filteredUniversities.length === 0 ? (
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
                    {uni.city}, {uni.country}
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
                        onClick={() => setActionNotice(`Edit Institution: ${uni.name}`)}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit University"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete Institution: ${uni.name}`)}
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

      {/* Action Notice Modal */}
      {actionNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769E0] border border-blue-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{actionNotice}</h3>
                  <p className="text-xs text-slate-500">Institution Manager</p>
                </div>
              </div>
              <button
                onClick={() => setActionNotice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
              University record creation and live directory persistence are configured in the data registry.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setActionNotice(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
