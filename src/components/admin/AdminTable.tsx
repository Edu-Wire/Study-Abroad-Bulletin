"use client";

import { ReactNode } from "react";
import { Search, Layers, type LucideIcon } from "lucide-react";

interface AdminTableContainerProps {
  title?: string;
  count?: number;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterComponent?: ReactNode;
  actionsComponent?: ReactNode;
  children: ReactNode;
  footerNote?: string;
  className?: string;
}

export function AdminTableContainer({
  title,
  count,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search records...",
  filterComponent,
  actionsComponent,
  children,
  footerNote,
  className = "",
}: AdminTableContainerProps) {
  const hasToolbar = Boolean(
    title || onSearchChange || filterComponent || actionsComponent
  );

  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col ${className}`}
    >
      {/* Table Toolbar */}
      {hasToolbar && (
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {title && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-2 w-2 rounded-full bg-[#1769E0]" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
              {typeof count === "number" && (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/80">
                  {count}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 sm:justify-end flex-wrap">
            {onSearchChange && (
              <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-8.5 pl-8.5 pr-3 text-xs bg-slate-50/70 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>
            )}

            {filterComponent}
            {actionsComponent}
          </div>
        </div>
      )}

      {/* Horizontal Scrollable Table Body */}
      <div className="overflow-x-auto w-full">{children}</div>

      {/* Table Footer */}
      {footerNote && (
        <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
          <span>{footerNote}</span>
          <span className="text-[10px] text-slate-400 font-medium">AbroadBulletin Intelligence System</span>
        </div>
      )}
    </div>
  );
}

export function AdminEmptyState({
  title = "No records found",
  description = "No matching items for this query or category.",
  icon: Icon = Layers,
  action,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 sm:py-16 px-4 text-center flex flex-col items-center justify-center">
      <div className="h-11 w-11 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
