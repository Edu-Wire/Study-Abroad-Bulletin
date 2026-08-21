"use client";

import Link from "next/link";
import { Plus, ArrowLeft, Download } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
  addLabel?: string;
  onAdd?: () => void;
  backHref?: string;
  backLabel?: string;
  showExport?: boolean;
  onExport?: () => void;
  children?: React.ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  count,
  countLabel = "items",
  addLabel,
  onAdd,
  backHref,
  backLabel = "Back to Dashboard",
  showExport = false,
  onExport,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200/80 mb-6">
      <div className="space-y-1 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1769E0] hover:underline mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>
        )}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display">
            {title}
          </h1>
          {typeof count === "number" && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1769E0] border border-blue-200/80">
              {count} {countLabel}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
        {children}

        {showExport && (
          <button
            onClick={
              onExport ||
              (() => alert("Export format (CSV/JSON) is scheduled for backend phase."))
            }
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        )}

        {addLabel && onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
