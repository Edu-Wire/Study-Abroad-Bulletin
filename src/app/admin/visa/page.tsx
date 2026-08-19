"use client";

import { useState } from "react";
import Link from "next/link";
import { FileCheck2, Eye, Edit3, Trash2, AlertCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { visaUpdates } from "@/data/mock";

export default function AdminVisaPage() {
  const [search, setSearch] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredUpdates = visaUpdates.filter(
    (v) =>
      v.headline.toLowerCase().includes(search.toLowerCase()) ||
      v.country.toLowerCase().includes(search.toLowerCase()) ||
      v.visaType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Visa & Immigration Updates"
        description="Publish and maintain official immigration alerts, permit rules, financial proof changes, and urgent visa notices."
        count={visaUpdates.length}
        countLabel="updates"
        addLabel="Add Visa Alert"
        onAdd={() => setActionNotice("Create Visa Alert")}
      />

      <AdminTableContainer
        title="Live Visa Policies & Bulletins"
        count={filteredUpdates.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search visa type, country, headline..."
        footerNote={`Displaying ${filteredUpdates.length} of ${visaUpdates.length} immigration updates`}
      >
        {filteredUpdates.length === 0 ? (
          <AdminEmptyState
            title="No visa updates found"
            description="No immigration notices matched your search query."
            icon={FileCheck2}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Destination & Flag</th>
                <th className="py-3 px-3">Visa Subclass / Type</th>
                <th className="py-3 px-4">Policy Headline</th>
                <th className="py-3 px-3">Announced Date</th>
                <th className="py-3 px-3">Urgency Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8EF]">
              {filteredUpdates.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-[#F7F9FC]/60 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-[#111827] whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" role="img" aria-label={v.country}>
                        {v.flag}
                      </span>
                      <span>{v.country}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1769E0]/10 text-[#1769E0]">
                      {v.visaType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#111827] max-w-sm">
                    <div className="line-clamp-2 group-hover:text-[#1769E0] transition-colors">
                      {v.headline}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {v.date}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {v.urgent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="h-3 w-3" />
                        Urgent Policy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                        Standard Notice
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/visa"
                        target="_blank"
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors"
                        title="View Public Page"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setActionNotice(`Edit: ${v.headline}`)}
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                        title="Edit Policy"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete: ${v.headline}`)}
                        className="p-1.5 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
                <p className="text-xs text-[#667085]">Visa Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1 Admin Panel Foundation
              </p>
              Visa alert creation and real-time push will be connected in Phase 2 backend.
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
