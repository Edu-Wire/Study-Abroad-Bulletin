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
  ListTree,
  Activity,
  HeartPulse,
  ExternalLink,
  X,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { logout as apiLogout, getCurrentUser } from "@/lib/api/auth";

interface AdminSidebarProps {
  onCloseMobile?: () => void;
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

export function AdminSidebar({ onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  } | null>(null);

  // Identity and role come from the server on every mount, never from
  // localStorage. This is display state only: the admin layout has already
  // performed the authoritative role check server-side, and Express
  // authorizes each API call independently.
  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((res) => {
        if (!cancelled && res.success && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        // Leave user null; the layout guard governs access, not this sidebar.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // No privilege is assumed before the server answers.
  const role = user?.role;

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    // The server revokes the session and clears the HttpOnly cookie; there is
    // no browser-side auth state to clear.
    try {
      await apiLogout();
    } catch {
      // apiLogout degrades gracefully on its own.
    }
    router.push("/auth/login");
    router.refresh();
  };

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : "AD";

  const displayRoleName =
    role === "SUPER_ADMIN"
      ? "Super Admin"
      : role === "EDITOR"
        ? "Senior Editor"
        : role === "ADMIN"
          ? "Admin"
          : "";

  return (
    <aside className="h-full flex flex-col bg-[#071A33] text-slate-200 border-r border-[#152945] select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 sm:px-5 flex items-center justify-between border-b border-[#152945] shrink-0">
        <Link
          href="/admin"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-white/10 p-1 flex items-center justify-center border border-white/10 group-hover:border-[#1769E0] transition-colors">
            <Image
              src="/logo/ab-logo.png"
              alt="Abroad Bulletin"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <span className="font-display font-bold text-sm tracking-tight text-white block truncate">
              Abroad Bulletin
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-[#60A5FA] uppercase block">
              Intelligence CMS
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Grouped Navigation List */}
      <div className="flex-1 px-3 py-4 overflow-y-auto space-y-5 no-scrollbar">
        {NAV_GROUPS.map((group) => {
          // Until the server confirms the role, show nothing role-gated
          // rather than guessing at privilege.
          const visibleItems = role
            ? group.items.filter((item) => item.roles.includes(role))
            : [];

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href, item.exact);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${active
                        ? "bg-[#1769E0] text-white shadow-2xs font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${active
                          ? "text-white"
                          : "text-slate-400 group-hover:text-white"
                        }`}
                    />
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom User Card & Public Site Link */}
      <div className="p-3 border-t border-[#152945] shrink-0 space-y-2 bg-[#051428]">
        {/* Switch to Public Site */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors group"
        >
          <span className="flex items-center gap-2 min-w-0">
            <ExternalLink className="h-3.5 w-3.5 text-[#60A5FA] shrink-0" />
            <span className="truncate">View Public Site</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 group-hover:bg-[#1769E0] group-hover:text-white transition-colors shrink-0">
            Live
          </span>
        </Link>

        {/* Current Admin User Badge */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-[#1769E0] text-white font-bold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate flex items-center gap-1">
                <span className="truncate">
                  {user ? `${user.firstName || ""} ${user.lastName || ""}` : "Admin"}
                </span>
                <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {displayRoleName}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
