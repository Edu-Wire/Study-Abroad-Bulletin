"use client";

import { useState } from "react";
import Link from "next/link";
import { FileCheck2, Eye, Edit3, Trash2, X, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
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
        description="Publish official immigration policy alerts, financial proof changes, permit regulation updates, and urgent visa notices."
        count={visaUpdates.length}
        countLabel="updates"
        addLabel="Add Visa Alert"
        onAdd={() => setActionNotice("Create Visa Alert")}
      />

      <AdminTableContainer
        count={filteredUpdates.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search visa subclass, country, policy..."
        footerNote={`Displaying ${filteredUpdates.length} of ${visaUpdates.length} immigration notices`}
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
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-3">Visa Subclass / Type</th>
                <th className="py-3 px-4">Policy Headline</th>
                <th className="py-3 px-3">Announced Date</th>
                <th className="py-3 px-3">Urgency Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUpdates.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" role="img" aria-label={v.country}>
                        {v.flag}
                      </span>
                      <span>{v.country}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-200/80">
                      {v.visaType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-sm">
                    <div className="line-clamp-2 group-hover:text-[#1769E0] transition-colors">
                      {v.headline}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                    {v.date}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge
                      status={v.urgent ? "URGENT" : "STANDARD"}
                      label={v.urgent ? "Urgent Policy" : "Standard Notice"}
                      size="sm"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/visa"
                        target="_blank"
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Public Notice"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setActionNotice(`Edit Notice: ${v.headline}`)}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Policy"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete Notice: ${v.headline}`)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769E0] border border-blue-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{actionNotice}</h3>
                  <p className="text-xs text-slate-500">Immigration Alert System</p>
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
              Visa policy alerts are distributed to student feeds and country intelligence pages.
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
