"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Eye, Edit3, Trash2, X, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { countries } from "@/data/mock";

export default function AdminCountriesPage() {
  const [search, setSearch] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.popularIntake.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Country Intelligence"
        description="Manage study destinations, immigration policy dossiers, active university registries, and intake cycles."
        count={countries.length}
        countLabel="destinations"
        addLabel="Add Country"
        onAdd={() => setActionNotice("Create Country Dossier")}
      />

      <AdminTableContainer
        count={filteredCountries.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search destinations, intake seasons..."
        footerNote={`Displaying ${filteredCountries.length} of ${countries.length} destination dossiers`}
      >
        {filteredCountries.length === 0 ? (
          <AdminEmptyState
            title="No countries found"
            description="No destinations match your search query."
            icon={Globe}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-3">Partner Institutions</th>
                <th className="py-3 px-3">Average Tuition</th>
                <th className="py-3 px-3">Primary Intake</th>
                <th className="py-3 px-3">Policy Updates</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCountries.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl shrink-0" role="img" aria-label={c.name}>
                        {c.flag}
                      </span>
                      <div>
                        <div className="group-hover:text-[#1769E0] transition-colors font-bold text-xs sm:text-sm">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          /countries/{c.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {c.universities} institutions
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {c.averageTuition}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-200/80">
                      {c.popularIntake}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">
                    {c.updates} updates
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <StatusBadge status="ACTIVE" label="Active Dossier" size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/countries/${c.id}`}
                        target="_blank"
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Public Dossier"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setActionNotice(`Edit Dossier: ${c.name}`)}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Dossier"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Archive Dossier: ${c.name}`)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Archive Dossier"
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
                  <p className="text-xs text-slate-500">Country Dossier System</p>
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
              Destination intelligence and immigration overview content are synchronized with the central portal.
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
