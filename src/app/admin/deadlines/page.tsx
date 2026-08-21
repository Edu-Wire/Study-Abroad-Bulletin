"use client";

import { useState } from "react";
import { Clock, Eye, Edit3, Trash2, Filter, X, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
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
        description="Monitor countdowns and close dates for university admissions cycles, intake terms, and international grants."
        count={deadlines.length}
        countLabel="deadlines"
        addLabel="Add Deadline"
        onAdd={() => setActionNotice("Create Deadline Entry")}
      />

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
        {filteredDeadlines.length === 0 ? (
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
                <th className="py-3 px-3">Urgency Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeadlines.map((d) => (
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
                      {d.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {d.country}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap text-[11px]">
                    {d.deadline}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        d.daysLeft <= 10
                          ? "bg-rose-50 text-rose-700 border-rose-200/80"
                          : "bg-amber-50 text-amber-700 border-amber-200/80"
                      }`}
                    >
                      {d.daysLeft} days
                    </span>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge
                      status={d.daysLeft <= 10 ? "CLOSING_SOON" : "OPEN"}
                      label={d.daysLeft <= 10 ? "Closing Soon" : "Open for Applications"}
                      size="sm"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setActionNotice(`Edit Deadline: ${d.title}`)}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Deadline"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete Deadline: ${d.title}`)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769E0] border border-blue-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{actionNotice}</h3>
                  <p className="text-xs text-slate-500">Deadline Manager</p>
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
              Automated countdown alerts and application reminders are scheduled for active records.
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
