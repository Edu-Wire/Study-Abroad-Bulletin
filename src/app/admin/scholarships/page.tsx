"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Eye, Edit3, Trash2, Filter, X, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
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
        description="Index international awards, government financial grants, coverage values, eligibility criteria, and application close dates."
        count={scholarships.length}
        countLabel="scholarships"
        addLabel="Add Scholarship"
        onAdd={() => setActionNotice("Create Scholarship Award")}
      />

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
              {filteredScholarships.map((sch) => (
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
                      status={
                        sch.type === "Fully Funded"
                          ? "FULLY_FUNDED"
                          : "PARTIAL"
                      }
                      label={sch.type}
                      size="sm"
                    />
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {sch.country}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {sch.degree}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {sch.funding}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                    {sch.deadline}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        sch.daysLeft <= 10
                          ? "bg-rose-50 text-rose-700 border-rose-200/80"
                          : "bg-amber-50 text-amber-700 border-amber-200/80"
                      }`}
                    >
                      {sch.daysLeft}d left
                    </span>
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
                        onClick={() => setActionNotice(`Edit Award: ${sch.name}`)}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Scholarship"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete Award: ${sch.name}`)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769E0] border border-blue-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{actionNotice}</h3>
                  <p className="text-xs text-slate-500">Scholarship Award System</p>
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
              Scholarship details and application URL tracking are connected to the central directory.
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
