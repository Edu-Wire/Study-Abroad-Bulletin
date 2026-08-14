"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, GraduationCap, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Search", href: "/search", Icon: Search },
  { label: "Universities", href: "/universities", Icon: GraduationCap },
  { label: "Scholarships", href: "/scholarships", Icon: BookOpen },
  { label: "Account", href: "/dashboard", Icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-full border-t border-border bg-background lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="grid h-14 w-full grid-cols-5 min-w-0">
        {tabs.map(({ label, href, Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0 px-1",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4.5 shrink-0" strokeWidth={isActive ? 2 : 1.5} />
              <span className="eyebrow truncate text-center" style={{ fontSize: "0.5625rem" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
