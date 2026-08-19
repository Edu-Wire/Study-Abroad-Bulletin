"use client";

import Link from "next/link";
import { Plus, ArrowLeft, Download, Filter } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
  addLabel?: string;
  onAdd?: () => void;
  backHref?: string;
  showExport?: boolean;
}

export function AdminPageHeader({
  title,
  description,
  count,
  countLabel = "items",
  addLabel,
  onAdd,
  backHref,
  showExport = true,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E4E8EF] mb-6">
      <div className="space-y-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1769E0] hover:underline mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Dashboard</span>
          </Link>
        )}
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight">
            {title}
          </h1>
          {typeof count === "number" && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1769E0]/10 text-[#1769E0] border border-[#1769E0]/20">
              {count} {countLabel}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-[#667085] max-w-2xl">{description}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
        {showExport && (
          <button
            onClick={() => alert("Export format (CSV/JSON) will be available in Phase 2 backend.")}
            className="flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-[#F7F9FC] text-[#667085] hover:text-[#111827] text-xs font-semibold border border-[#E4E8EF] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        )}

        {addLabel && onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 h-9 px-3.5 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
