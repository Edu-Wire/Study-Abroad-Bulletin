"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Eye, Edit3, Trash2, Filter } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { scholarships } from "@/data/mock";

export default function AdminScholarshipsPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fundingTypes = ["All", "Fully Funded", "Partial", "Tuition Waiver"];

  const filteredScholarships = scholarships.filter((sch) => {
    const matchesSearch =
      sch.name.toLowerCase().includes(search.toLowerCase()) ||
      sch.organization.toLowerCase().includes(search.toLowerCase()) ||
      sch.country.toLowerCase().includes(search.toLowerCase()) ||
      sch.eligibility.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === "All" || sch.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Scholarships & Grants"
        description="Track funding opportunities, deadlines, grant values, and student eligibility criteria."
        count={scholarships.length}
        countLabel="scholarships"
        addLabel="Add Scholarship"
        onAdd={() => setActionNotice("Create Scholarship Award")}
      />

      <AdminTableContainer
        title="All Scholarship Opportunities"
        count={filteredScholarships.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search awards, organizations, countries..."
        footerNote={`Displaying ${filteredScholarships.length} of ${scholarships.length} scholarships`}
        filterComponent={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-[#667085] shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 px-2.5 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
            >
              {fundingTypes.map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All Funding Types" : t}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {filteredScholarships.length === 0 ? (
          <AdminEmptyState
            title="No scholarships found"
            description="No awards matched your search keywords or filter criteria."
            icon={Award}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Award & Provider</th>
                <th className="py-3 px-3">Funding Type</th>
                <th className="py-3 px-3">Country</th>
                <th className="py-3 px-3">Degree</th>
                <th className="py-3 px-3">Grant Value</th>
                <th className="py-3 px-3">Deadline</th>
                <th className="py-3 px-3">Days Left</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8EF]">
              {filteredScholarships.map((sch) => (
                <tr
                  key={sch.id}
                  className="hover:bg-[#F7F9FC]/60 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-[#111827] max-w-xs">
                    <div className="line-clamp-1 group-hover:text-[#1769E0] transition-colors">
                      {sch.name}
                    </div>
                    <div className="text-[11px] text-[#667085] truncate font-normal mt-0.5">
                      {sch.organization}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        sch.type === "Fully Funded"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-blue-50 text-[#1769E0] border border-blue-100"
                      }`}
                    >
                      {sch.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {sch.country}
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {sch.degree}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-[#111827] whitespace-nowrap">
                    {sch.funding}
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {sch.deadline}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        sch.daysLeft <= 10
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {sch.daysLeft}d
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/scholarships"
                        target="_blank"
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors"
                        title="View Public Page"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setActionNotice(`Edit: ${sch.name}`)}
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                        title="Edit Scholarship"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete: ${sch.name}`)}
                        className="p-1.5 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete Scholarship"
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
                <p className="text-xs text-[#667085]">Scholarship Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1 Admin Panel Foundation
              </p>
              Scholarship creation and editing forms will connect to backend APIs in Phase 2.
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
