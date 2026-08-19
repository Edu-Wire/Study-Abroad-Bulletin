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
  ExternalLink,
  X,
  ShieldCheck,
  LogOut,
} from "lucide-react";

interface AdminSidebarProps {
  onCloseMobile?: () => void;
}

const allNavItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true, roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"] },
  { label: "News", href: "/admin/news", icon: Newspaper, roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"] },
  { label: "Universities", href: "/admin/universities", icon: GraduationCap, roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Scholarships", href: "/admin/scholarships", icon: Award, roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Countries", href: "/admin/countries", icon: Globe, roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"] },
  { label: "Visa Updates", href: "/admin/visa", icon: FileCheck2, roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"] },
  { label: "Guides", href: "/admin/guides", icon: BookOpen, roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"] },
  { label: "Deadlines", href: "/admin/deadlines", icon: Clock, roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Users & Roles", href: "/admin/users", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function AdminSidebar({ onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ firstName?: string; lastName?: string; email?: string; role?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          // Ignore parse error
        }
      }
    }
  }, []);

  const role = user?.role || "SUPER_ADMIN";
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    router.push("/auth/login");
  };

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "AD";

  const displayRoleName = role === "SUPER_ADMIN" ? "Super Admin" : role === "EDITOR" ? "Senior Editor" : "Admin";

  return (
    <aside className="h-full flex flex-col bg-[#071A33] text-white border-r border-[#1B2F4E] shadow-lg">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#1B2F4E] shrink-0">
        <Link
          href="/admin"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-white/10 p-1 flex items-center justify-center border border-white/10 group-hover:border-[#1769E0] transition-colors">
            <Image
              src="/logo/ab-logo.png"
              alt="Abroad Bulletin"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-display font-bold text-sm tracking-tight text-white block">
              Abroad Bulletin
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-[#1769E0] uppercase block">
              Admin CMS
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Navigation ({displayRoleName})
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-[#1769E0] text-white shadow-xs"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active ? "text-white" : "text-gray-400 group-hover:text-white"
                }`}
              />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Profile & Public Site Link */}
      <div className="p-3 border-t border-[#1B2F4E] shrink-0 space-y-2 bg-[#051428]">
        {/* Switch to Public Site */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors group"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-[#1769E0]" />
            <span>View Public Site</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 group-hover:bg-[#1769E0] group-hover:text-white transition-colors">
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
                {user ? `${user.firstName || ""} ${user.lastName || ""}` : "Admin"}
                <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
              </p>
              <p className="text-[11px] text-gray-400 truncate">{displayRoleName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-md text-gray-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

