"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Eye, Edit3, Trash2, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CountryFormModal } from "@/components/admin/CountryFormModal";
import { adminGet, adminDelete } from "@/lib/api/apiClient";

interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
  universitiesCount: number;
  averageTuition: string;
  popularIntake: string;
  updatesCount: number;
  heroImage: string | null;
}

export default function AdminCountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; country: Country } | null
  >(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGet<{ success: boolean; countries: Country[] }>("/admin/countries")
      .then((d) => {
        if (d.success) setCountries(d.countries);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load countries.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    load();
  }, [load]);

  const handleDelete = async (c: Country) => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await adminDelete(`/admin/countries/${c.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete country.");
    }
  };

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
        onAdd={() => setModal({ mode: "create" })}
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-medium">
          {error}
        </div>
      )}

      <AdminTableContainer
        count={filteredCountries.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search destinations, intake seasons..."
        footerNote={`Displaying ${filteredCountries.length} of ${countries.length} destination dossiers`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading countries...
          </div>
        ) : filteredCountries.length === 0 ? (
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
                    {c.universitiesCount} institutions
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
                    {c.updatesCount} updates
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
                        onClick={() => setModal({ mode: "edit", country: c })}
                        className="p-1.5 text-slate-500 hover:text-[#1769E0] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Dossier"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Dossier"
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

      {modal && (
        <CountryFormModal
          mode={modal.mode}
          initialData={
            modal.mode === "edit"
              ? { ...modal.country, heroImage: modal.country.heroImage ?? "" }
              : undefined
          }
          onClose={() => setModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
