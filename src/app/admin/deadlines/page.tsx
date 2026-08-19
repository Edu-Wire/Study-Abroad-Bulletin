"use client";

import { useState } from "react";
import { Clock, Eye, Edit3, Trash2, Filter } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { deadlines } from "@/data/mock";

export default function AdminDeadlinesPage() {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const types = ["All", "University", "Scholarship"];

  const filteredDeadlines = deadlines.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.country.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === "All" || d.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Intake & Award Deadlines"
        description="Monitor countdowns and close dates for university admissions cycles and international scholarship applications."
        count={deadlines.length}
        countLabel="deadlines"
        addLabel="Add Deadline"
        onAdd={() => setActionNotice("Create Deadline Entry")}
      />

      <AdminTableContainer
        title="Active Deadlines Tracking"
        count={filteredDeadlines.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search titles, countries..."
        footerNote={`Displaying ${filteredDeadlines.length} of ${deadlines.length} tracked deadlines`}
        filterComponent={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-[#667085] shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 px-2.5 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0]"
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
        {filteredDeadlines.length === 0 ? (
          <AdminEmptyState
            title="No deadlines found"
            description="No countdown items matched your search filters."
            icon={Clock}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Opportunity / Institution</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Country</th>
                <th className="py-3 px-3">Deadline Date</th>
                <th className="py-3 px-3">Days Remaining</th>
                <th className="py-3 px-3">Urgency</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8EF]">
              {filteredDeadlines.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-[#F7F9FC]/60 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-[#111827] max-w-sm">
                    <div className="group-hover:text-[#1769E0] transition-colors font-bold text-sm">
                      {d.title}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1769E0]/10 text-[#1769E0]">
                      {d.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {d.country}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-[#111827] whitespace-nowrap">
                    {d.deadline}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        d.daysLeft <= 10
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {d.daysLeft} days
                    </span>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {d.daysLeft <= 10 ? (
                      <span className="text-[11px] font-bold text-rose-600">
                        Closing Soon
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-600">
                        Open for Applications
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setActionNotice(`Edit: ${d.title}`)}
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                        title="Edit Deadline"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete: ${d.title}`)}
                        className="p-1.5 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete Deadline"
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
                <p className="text-xs text-[#667085]">Deadline Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1 Admin Panel Foundation
              </p>
              Automated countdown timers and deadline alert triggers will be wired in Phase 2.
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
