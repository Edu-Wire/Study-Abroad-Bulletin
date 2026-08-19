"use client";

import { ReactNode } from "react";
import { Search, Filter, Layers } from "lucide-react";

interface AdminTableProps {
  title?: string;
  count?: number;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterComponent?: ReactNode;
  children: ReactNode;
  footerNote?: string;
}

export function AdminTableContainer({
  title,
  count,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Filter records...",
  filterComponent,
  children,
  footerNote,
}: AdminTableProps) {
  return (
    <div className="bg-white border border-[#E4E8EF] rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      {(title || onSearchChange || filterComponent) && (
        <div className="p-4 border-b border-[#E4E8EF] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {title && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#1769E0]" />
              <h2 className="text-sm font-bold text-[#111827]">{title}</h2>
              {typeof count === "number" && (
                <span className="text-xs text-[#667085] bg-[#F7F9FC] px-2 py-0.5 rounded-full border border-[#E4E8EF]">
                  {count}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2.5 flex-1 sm:justify-end flex-wrap">
            {onSearchChange && (
              <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#667085]" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8.5 pr-3 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#1769E0] focus:bg-white transition-all"
                />
              </div>
            )}

            {filterComponent}
          </div>
        </div>
      )}

      {/* Horizontal Scrollable Table Body */}
      <div className="overflow-x-auto w-full">
        {children}
      </div>

      {/* Table Footer */}
      {footerNote && (
        <div className="px-4 py-2.5 bg-[#F7F9FC] border-t border-[#E4E8EF] text-xs text-[#667085] flex items-center justify-between">
          <span>{footerNote}</span>
          <span className="text-[11px] text-[#667085] font-medium">Phase 1 Static Mock Data</span>
        </div>
      )}
    </div>
  );
}

export function AdminEmptyState({
  title = "No records found",
  description = "No matching items for this query or category.",
  icon: Icon = Layers,
}: {
  title?: string;
  description?: string;
  icon?: any;
}) {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
      <div className="h-12 w-12 rounded-xl bg-[#F7F9FC] border border-[#E4E8EF] flex items-center justify-center text-[#667085] mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-bold text-[#111827]">{title}</h4>
      <p className="text-xs text-[#667085] mt-1 max-w-sm">{description}</p>
    </div>
  );
}
