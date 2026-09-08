"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  GraduationCap,
  Award,
  Globe,
  FileCheck2,
  BookOpen,
  Clock,
  Users,
  Settings,
  Rss,
  History,
  GitCompare,
  ListTree,
  Activity,
  HeartPulse,
  ExternalLink,
  X,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { logout as apiLogout, getCurrentUser } from "@/lib/api/auth";

interface AdminSidebarProps {
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  roles: string[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        exact: true,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
    ],
  },
  {
    group: "EDITORIAL & CONTENT",
    items: [
      {
        label: "News & Articles",
        href: "/admin/news",
        icon: Newspaper,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Visa Updates",
        href: "/admin/visa",
        icon: FileCheck2,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Editorial Guides",
        href: "/admin/guides",
        icon: BookOpen,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Automated Sources",
        href: "/admin/sources",
        icon: Rss,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Source Items",
        href: "/admin/source-items",
        icon: ListTree,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Source Changes",
        href: "/admin/source-changes",
        icon: History,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Source Runs",
        href: "/admin/source-runs",
        icon: Activity,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Source Health",
        href: "/admin/source-health",
        icon: HeartPulse,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
      {
        label: "Shadow Comparison",
        href: "/admin/shadow-compare",
        icon: GitCompare,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
    ],
  },
  {
    group: "DIRECTORIES",
    items: [
      {
        label: "Universities",
        href: "/admin/universities",
        icon: GraduationCap,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        label: "Scholarships",
        href: "/admin/scholarships",
        icon: Award,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        label: "Countries",
        href: "/admin/countries",
        icon: Globe,
        roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
      },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      {
        label: "Deadlines",
        href: "/admin/deadlines",
        icon: Clock,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      {
        label: "Users & Roles",
        href: "/admin/users",
        icon: Users,
        roles: ["SUPER_ADMIN", "ADMIN"],
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

export function AdminSidebar({
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((res) => {
        if (!cancelled && res.success && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        // Leave user null; layout guard handles authorization
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const role = user?.role || "SUPER_ADMIN";

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // apiLogout degrades gracefully
    }
    router.push("/auth/login");
    router.refresh();
  };

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.firstName
      ? user.firstName.slice(0, 2).toUpperCase()
      : "N";

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || "Admin Super";

  const displayRoleName =
    role === "SUPER_ADMIN"
      ? "Super Admin"
      : role === "EDITOR"
      ? "Senior Editor"
      : role === "ADMIN"
      ? "Admin"
      : "Super Admin";

  return (
    <aside className="relative h-full flex flex-col bg-white text-slate-800 border-r border-slate-200/80 select-none shadow-[1px_0_12px_rgba(0,0,0,0.02)] transition-all duration-300">
      {/* Brand Header */}
      {isCollapsed ? (
        <div className="h-[76px] flex flex-col items-center justify-center border-b border-slate-100 shrink-0 px-2 py-2 gap-1 relative">
          <Link
            href="/admin"
            title="Abroad Bulletin"
            className="relative h-11 w-11 rounded-xl overflow-hidden bg-blue-50/70 p-1 flex items-center justify-center border border-blue-100/90 hover:border-[#1769E0] transition-colors shadow-2xs group"
          >
            <Image
              src="/logo/ab-mark-square.png"
              alt="Abroad Bulletin"
              width={38}
              height={38}
              className="object-contain group-hover:scale-105 transition-transform"
              priority
            />
          </Link>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 rounded-lg border border-slate-200/80 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="h-16 px-3.5 sm:px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <Link
            href="/admin"
            onClick={onCloseMobile}
            className="flex items-center group focus:outline-none min-w-0"
          >
            <div className="relative h-[42px] w-[185px] shrink-0">
              <Image
                src="/logo/abroad-bulletin-logo.png"
                alt="Abroad Bulletin"
                fill
                sizes="185px"
                className="object-contain object-left group-hover:opacity-90 transition-opacity"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            {/* Single Desktop Shrink Button */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-xl border border-slate-200/80 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Shrink sidebar (Ctrl+B)"
                aria-label="Shrink sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 lg:hidden transition-colors cursor-pointer"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div
        className={`flex-1 ${
          isCollapsed ? "px-2" : "px-3.5"
        } py-3.5 overflow-y-auto space-y-1 no-scrollbar`}
      >
        {NAV_GROUPS.map((group, groupIndex) => {
          const visibleItems = role
            ? group.items.filter((item) => item.roles.includes(role))
            : group.items;

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              {groupIndex > 0 && (
                <div
                  className={`my-2 border-t border-slate-100 ${
                    isCollapsed ? "w-8 mx-auto" : ""
                  }`}
                />
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href, item.exact);

                return isCollapsed ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    title={item.label}
                    className={`flex items-center justify-center w-11 h-11 mx-auto rounded-[14px] text-[13.5px] transition-all group relative ${
                      active
                        ? "bg-[#EEF4FF] border border-[#2B7FFF] text-[#1D68E2] shadow-2xs"
                        : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/90"
                    }`}
                  >
                    <Icon
                      className={`h-[19px] w-[19px] shrink-0 transition-colors ${
                        active
                          ? "text-[#1D68E2]"
                          : "text-slate-500 group-hover:text-slate-800"
                      }`}
                      strokeWidth={active ? 2.2 : 1.75}
                    />
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-[14px] text-[13.5px] transition-all group ${
                      active
                        ? "bg-[#EEF4FF] border border-[#2B7FFF] text-[#1D68E2] font-semibold shadow-2xs"
                        : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 font-medium"
                    }`}
                  >
                    <Icon
                      className={`h-[19px] w-[19px] shrink-0 transition-colors ${
                        active
                          ? "text-[#1D68E2]"
                          : "text-slate-500 group-hover:text-slate-800"
                      }`}
                      strokeWidth={active ? 2 : 1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom User Card & Public Site Link */}
      {isCollapsed ? (
        <div className="p-2 border-t border-slate-100 bg-white shrink-0 mt-auto flex flex-col items-center">
          {/* Switch to Public Site */}
          <Link
            href="/"
            target="_blank"
            title="View Public Site (Live)"
            className="relative flex items-center justify-center w-11 h-11 mb-2 rounded-[14px] text-slate-500 hover:text-[#1769E0] hover:bg-blue-50/80 transition-colors border border-transparent hover:border-blue-100"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </Link>

          {/* User Profile Collapsed */}
          <div
            title={`${displayName} (${displayRoleName})`}
            className="flex flex-col items-center gap-1.5 p-1.5 rounded-[14px] bg-slate-50/80 border border-slate-200/80 w-full"
          >
            <div className="relative">
              <div className="h-8.5 w-8.5 rounded-full overflow-hidden bg-[#071A33] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 border-t border-slate-100 bg-white shrink-0 mt-auto">
          {/* Switch to Public Site */}
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 mb-2 rounded-[14px] text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50/80 transition-colors group border border-transparent hover:border-slate-200/60"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#1769E0] shrink-0" />
              <span className="truncate">View Public Site</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold shrink-0">
              Live
            </span>
          </Link>

          {/* User Profile Card — Dynamic User Info without Dropdown Arrows */}
          <div className="rounded-[18px] border border-slate-200/90 p-2.5 bg-white flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full overflow-hidden bg-[#071A33] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-tight truncate flex items-center gap-1.5">
                  <span className="truncate">{displayName}</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                </h4>
                <p className="text-[11px] text-slate-500 font-normal leading-tight truncate mt-0.5">
                  {displayRoleName}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 ml-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
