"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Eye, Edit3, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { countries } from "@/data/mock";

export default function AdminCountriesPage() {
  const [search, setSearch] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.popularIntake.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Country Intelligence"
        description="Manage study destinations, policy updates, active university directories, and intake periods."
        count={countries.length}
        countLabel="destinations"
        addLabel="Add Country"
        onAdd={() => setActionNotice("Create Country Profile")}
      />

      <AdminTableContainer
        title="Supported Study Destinations"
        count={filteredCountries.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search country names..."
        footerNote={`Displaying ${filteredCountries.length} of ${countries.length} destinations`}
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
              <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-3">Partner Universities</th>
                <th className="py-3 px-3">Average Tuition</th>
                <th className="py-3 px-3">Primary Intake</th>
                <th className="py-3 px-3">Policy Updates</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8EF]">
              {filteredCountries.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-[#F7F9FC]/60 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-[#111827]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl" role="img" aria-label={c.name}>
                        {c.flag}
                      </span>
                      <div>
                        <div className="group-hover:text-[#1769E0] transition-colors font-bold text-sm">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-[#667085] font-normal">
                          /countries/{c.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-[#111827] whitespace-nowrap">
                    {c.universities} institutions
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {c.averageTuition}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1769E0]/10 text-[#1769E0]">
                      {c.popularIntake}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {c.updates} recorded
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active Dossier
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/countries/${c.id}`}
                        target="_blank"
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors"
                        title="View Public Country Page"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setActionNotice(`Edit Dossier: ${c.name}`)}
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                        title="Edit Country Dossier"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Archive: ${c.name}`)}
                        className="p-1.5 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Archive Country"
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
                <p className="text-xs text-[#667085]">Country Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1 Admin Panel Foundation
              </p>
              Country dossier updates and CRUD actions will be enabled in Phase 2.
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
