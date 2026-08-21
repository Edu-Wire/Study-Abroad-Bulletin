"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Search,
  Bell,
  Plus,
  Shield,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  onQuickAction: (actionName: string) => void;
}

const routeTitles: Record<string, { section: string; title: string }> = {
  "/admin": {
    section: "Overview",
    title: "Dashboard",
  },
  "/admin/news": {
    section: "Editorial & Content",
    title: "News & Articles",
  },
  "/admin/visa": {
    section: "Editorial & Content",
    title: "Visa Updates",
  },
  "/admin/guides": {
    section: "Editorial & Content",
    title: "Editorial Guides",
  },
  "/admin/universities": {
    section: "Directories",
    title: "Universities",
  },
  "/admin/scholarships": {
    section: "Directories",
    title: "Scholarships",
  },
  "/admin/countries": {
    section: "Directories",
    title: "Countries",
  },
  "/admin/deadlines": {
    section: "Operations",
    title: "Deadlines",
  },
  "/admin/users": {
    section: "System",
    title: "Users & Roles",
  },
  "/admin/settings": {
    section: "System",
    title: "Settings",
  },
};

export function AdminHeader({
  onToggleSidebar,
  onQuickAction,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const currentRoute = routeTitles[pathname] || {
    section: "Admin",
    title: "Console",
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left: Mobile Sidebar Trigger & Breadcrumb Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 lg:hidden shrink-0 transition-colors cursor-pointer"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Lightweight Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate"
        >
          <Link
            href="/admin"
            className="hover:text-slate-900 transition-colors shrink-0"
          >
            Admin
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400 hidden sm:inline truncate">
            {currentRoute.section}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 hidden sm:inline shrink-0" />
          <span className="text-slate-900 font-semibold truncate">
            {currentRoute.title}
          </span>
        </nav>
      </div>

      {/* Right: Search + Quick Add + Notifications + Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Search Bar with shortcut hint */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search records..."
            className="w-full h-8.5 pl-8.5 pr-8 text-xs bg-slate-50/80 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-all cursor-pointer"
            readOnly
            onClick={() => onQuickAction("Global Admin Search")}
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
            ⌘K
          </kbd>
        </div>

        {/* Quick Add CTA */}
        <button
          onClick={() => onQuickAction("Quick Action Menu")}
          className="inline-flex items-center gap-1.5 h-8.5 px-3 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          title="Quick Add Resource"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => onQuickAction("System Notifications")}
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          aria-label="System Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#1769E0] ring-2 ring-white" />
        </button>

        {/* Live Public Site Quick Icon (Tablet/Mobile) */}
        <Link
          href="/"
          target="_blank"
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors md:hidden"
          title="View Live Public Site"
        >
          <ExternalLink className="h-4 w-4 text-[#1769E0]" />
        </Link>

        {/* Admin Console Profile Tag */}
        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-[#071A33] text-white text-xs font-bold flex items-center justify-center border border-slate-200 shrink-0">
            <Shield className="h-3.5 w-3.5 text-[#60A5FA]" />
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-slate-900 leading-tight">
              Admin Console
            </p>
            <p className="text-[10px] text-slate-500 leading-tight">
              Super User
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
