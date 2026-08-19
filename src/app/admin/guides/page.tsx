"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, Edit3, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableContainer, AdminEmptyState } from "@/components/admin/AdminTable";
import { guides } from "@/data/mock";

export default function AdminGuidesPage() {
  const [search, setSearch] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredGuides = guides.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.category.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Editorial Guides"
        description="Manage in-depth student resources, SOP frameworks, IELTS strategies, and accommodation advice."
        count={guides.length}
        countLabel="guides"
        addLabel="Add Guide"
        onAdd={() => setActionNotice("Create Editorial Guide")}
      />

      <AdminTableContainer
        title="All Editorial Guides"
        count={filteredGuides.length}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search guide titles, categories..."
        footerNote={`Displaying ${filteredGuides.length} of ${guides.length} guides`}
      >
        {filteredGuides.length === 0 ? (
          <AdminEmptyState
            title="No guides found"
            description="No editorial guides matched your search keywords."
            icon={BookOpen}
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Reading Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8EF]">
              {filteredGuides.map((g) => (
                <tr
                  key={g.id}
                  className="hover:bg-[#F7F9FC]/60 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-semibold text-[#111827] max-w-md">
                    <div className="group-hover:text-[#1769E0] transition-colors font-bold text-sm">
                      {g.title}
                    </div>
                    <div className="text-[11px] text-[#667085] line-clamp-1 font-normal mt-0.5">
                      {g.description}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1769E0]/10 text-[#1769E0]">
                      {g.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                    {g.readingTime}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Published
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href="/guides"
                        target="_blank"
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors"
                        title="View Public Guide"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => setActionNotice(`Edit: ${g.title}`)}
                        className="p-1.5 text-[#667085] hover:text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                        title="Edit Guide"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setActionNotice(`Delete: ${g.title}`)}
                        className="p-1.5 text-[#667085] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete Guide"
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
                <p className="text-xs text-[#667085]">Guide Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1 Admin Panel Foundation
              </p>
              Rich markdown editor and guide publishing will be connected in Phase 2.
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
