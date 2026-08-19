"use client";

import { usePathname } from "next/navigation";
import { Menu, Search, Bell, Plus, Shield } from "lucide-react";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  onQuickAction: (actionName: string) => void;
}

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/admin": {
    title: "Admin Dashboard",
    subtitle: "Overview of platform intelligence & content datasets",
  },
  "/admin/news": {
    title: "News Management",
    subtitle: "Editorial articles, RSS feed sync & publication queue",
  },
  "/admin/universities": {
    title: "Universities Directory",
    subtitle: "Global institutions, rankings, fees & admissions criteria",
  },
  "/admin/scholarships": {
    title: "Scholarships Database",
    subtitle: "Funding grants, deadlines & student eligibility tracking",
  },
  "/admin/countries": {
    title: "Country Intelligence",
    subtitle: "Destinations, policies, intake seasons & university stats",
  },
  "/admin/visa": {
    title: "Visa & Immigration Updates",
    subtitle: "Government policy alerts, permit changes & urgent notices",
  },
  "/admin/guides": {
    title: "Editorial Guides",
    subtitle: "SOPs, IELTS, visa walkthroughs & application timelines",
  },
  "/admin/deadlines": {
    title: "Intake & Award Deadlines",
    subtitle: "Countdown management for admissions & funding opportunities",
  },
  "/admin/users": {
    title: "Admin & User Roles",
    subtitle: "Access control, editorial permissions & audit logs",
  },
  "/admin/settings": {
    title: "System Settings",
    subtitle: "Configuration, RSS sync schedules & environment parameters",
  },
};

export function AdminHeader({ onToggleSidebar, onQuickAction }: AdminHeaderProps) {
  const pathname = usePathname();
  const currentRoute = routeTitles[pathname] || {
    title: "Admin Panel",
    subtitle: "Abroad Bulletin Management Interface",
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E4E8EF] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-xs">
      {/* Left: Mobile Toggle & Page Title / Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F7F9FC] border border-[#E4E8EF] lg:hidden shrink-0"
          aria-label="Toggle Navigation Drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[#667085] font-medium hidden sm:flex">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[#1769E0] font-semibold">{currentRoute.title}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight truncate">
            {currentRoute.title}
          </h1>
        </div>
      </div>

      {/* Right: Search + Notifications + Quick Action + Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Search placeholder */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667085]" />
          <input
            type="text"
            placeholder="Search records..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#1769E0] focus:bg-white transition-all"
            readOnly
            onClick={() => onQuickAction("Global Admin Search")}
          />
        </div>

        {/* Quick Add Button */}
        <button
          onClick={() => onQuickAction("Quick Action Menu")}
          className="flex items-center gap-1.5 h-9 px-3 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Add</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => onQuickAction("System Notifications")}
          className="relative p-2 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F7F9FC] border border-[#E4E8EF] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#1769E0] ring-2 ring-white" />
        </button>

        {/* Admin Profile */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[#E4E8EF]">
          <div className="h-8 w-8 rounded-full bg-[#071A33] text-white text-xs font-bold flex items-center justify-center border border-[#E4E8EF] shrink-0">
            <Shield className="h-4 w-4 text-[#1769E0]" />
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-[#111827] leading-tight">Admin Console</p>
            <p className="text-[10px] text-[#667085] leading-tight">Super User</p>
          </div>
        </div>
      </div>
    </header>
  );
}
