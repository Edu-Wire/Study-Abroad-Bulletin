"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Eye, Edit3, Trash2, Filter } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { universities } from "@/data/mock";

export default function AdminUniversitiesPage() {
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const countriesList = ["All", ...Array.from(new Set(universities.map((u) => u.country)))];

  const filteredUniversities = universities.filter((uni) => {
    const matchesSearch =
      uni.name.toLowerCase().includes(search.toLowerCase()) ||
      uni.city.toLowerCase().includes(search.toLowerCase()) ||
      uni.courses.some((c) => c.toLowerCase().includes(search.toLowerCase()));

    const matchesCountry = selectedCountry === "All" || uni.country === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Universities Directory"
        description="Manage institutions, global rankings, degree programs, and admission parameters."
        count={universities.length}
        countLabel="universities"
        addLabel="Add University"
        onAdd={() => setActionNotice("Create University Record")}
      />

      <AdminTableContainer
        title="All Partner Institutions"
        count={filteredUniversities.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, city, course..."
        footerNote={`Displaying ${filteredUniversities.length} of ${universities.length} institutions`}
        filterComponent={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-[#667085] shrink-0" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="h-8 px-2.5 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
            >
              {countriesList.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Countries" : c}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {filteredUniversities.length === 0 ? (
          <AdminEmptyState
            title="No universities found"
            description="No institutions matched your search keywords or filter criteria."
            icon={GraduationCap}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Ranking</th>
                <th className="py-3 px-3">Tuition</th>
                <th className="py-3 px-3">Degree</th>
                <th className="py-3 px-3">IELTS</th>
                <th className="py-3 px-3">Scholarships</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8EF]">
              {filteredUniversities.map((uni) => (
                <tr
                  key={uni.id}
                  className="hover:bg-[#F7F9FC]/60 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-[#111827] max-w-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-[#071A33] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {uni.initials}
                      </div>
                      <div className="truncate group-hover:text-[#1769E0] transition-colors">
                        {uni.name}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {uni.city}, {uni.country}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-100">
                      #{uni.ranking}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-medium text-[#111827] whitespace-nowrap">
                    {uni.tuition}
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {uni.degree}
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {uni.ielts}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {uni.scholarships ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                        None
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/universities"
                        target="_blank"
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors"
                        title="View Public Page"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setActionNotice(`Edit: ${uni.name}`)}
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                        title="Edit University"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete: ${uni.name}`)}
                        className="p-1.5 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#E4E8EF] p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#1769E0]/10 text-[#1769E0] flex items-center justify-center shrink-0 font-bold">
                +
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">{actionNotice}</h3>
                <p className="text-xs text-[#667085]">University Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1 Admin Panel Foundation
              </p>
              University form and data persistence will be wired up during Phase 2.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setActionNotice(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer"
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
