"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { SearchBar } from "@/components/common/SearchBar";
import { cn } from "@/lib/utils";

const mainNav = [
  { label: "Latest", href: "/news" },
  { label: "Universities", href: "/universities" },
  { label: "Countries", href: "/countries" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Visa", href: "/visa" },
  { label: "Tracker", href: "/immigration-tracker" },
  { label: "Directory", href: "/consultants" },
  { label: "Guides", href: "/guides" },
];

const utilityLinks = [
  { label: "Tracker", href: "/immigration-tracker" },
  { label: "Directory", href: "/consultants" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Format today's date as "11 AUGUST 2026" */
function formatEditionDate(): string {
  const now = new Date();
  return now
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

/** Top utility bar — thin, all-caps, restrained */
function UtilityBar({
  onSearchClick,
  searchOpen,
}: {
  onSearchClick: () => void;
  searchOpen: boolean;
}) {
  const [date, setDate] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setDate(formatEditionDate());
    if (typeof window !== "undefined") {
      setIsLoggedIn(!!localStorage.getItem("authToken"));
    }
  }, []);

  return (
    <div className="border-b border-border bg-background">
      <div className="shell flex h-8 items-center justify-between gap-4">
        {/* Left — edition label */}
        <p className="eyebrow hidden text-muted-foreground sm:block">
          Global Study Abroad Edition
        </p>
        {/* Center — date */}
        <p className="eyebrow text-muted-foreground">{date}</p>
        {/* Right — search + auth */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={onSearchClick}
            className="eyebrow text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
          >
            <Search className="size-3" />
            <span className="hidden sm:inline">Search</span>
          </button>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="eyebrow text-primary font-bold transition-colors hover:text-navy hidden sm:block"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="eyebrow text-muted-foreground transition-colors hover:text-foreground hidden sm:block"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Masthead — the publication identity */
function Masthead() {
  return (
    <div className="border-b border-border bg-background">
      <div className="shell flex items-center justify-center py-4 sm:py-5">
        <Link href="/" className="inline-block transition-transform hover:scale-[1.01] active:scale-[0.99]">
          <Image
            src="/logo/logo.png"
            alt="Abroad Bulletin — Dream • Plan • Achieve"
            width={800}
            height={170}
            priority
            className="h-16 w-auto object-contain sm:h-20 md:h-24 lg:h-28"
          />
        </Link>
      </div>
    </div>
  );
}

/** Navigation rail — newspaper-style horizontal nav */
function NavRail({
  pathname,
  onMenuClick,
}: {
  pathname: string;
  onMenuClick: () => void;
}) {
  return (
    <div className="border-b border-border bg-background relative">
      <div className="shell flex items-center justify-center">
        <nav className="no-scrollbar flex items-center justify-start sm:justify-center overflow-x-auto flex-1 pr-12 lg:pr-0">
          {mainNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "eyebrow relative shrink-0 px-3.5 sm:px-4 lg:px-5 py-3 text-foreground transition-colors hover:text-primary",
                  "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:transition-transform after:duration-200",
                  isActive
                    ? "text-primary after:scale-x-100"
                    : "after:scale-x-0 hover:after:scale-x-100",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {/* Mobile menu button aligned inside NavRail */}
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="absolute right-4 top-1/2 -translate-y-1/2 grid size-9 place-items-center text-foreground transition-colors hover:text-primary lg:hidden shrink-0"
        >
          <Menu className="size-5" />
        </button>
      </div>
    </div>
  );
}

/** Mobile drawer menu */
function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30"
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-background border-l border-border">
        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <Link href="/" onClick={onClose} className="font-display text-lg font-extrabold text-foreground">
            SAI
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="grid size-9 place-items-center text-foreground hover:text-primary transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border px-5 py-4">
          <SearchBar
            placeholder="Search…"
            onSubmit={(q) => {
              onClose();
              if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
            }}
          />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto">
          {mainNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between border-b border-border px-5 py-4 font-display text-base font-bold text-foreground transition-colors hover:text-primary",
                  isActive && "text-primary",
                )}
              >
                {item.label}
                <span className="text-border">→</span>
              </Link>
            );
          })}
        </nav>

        {/* Auth buttons */}
        <div className="grid grid-cols-2 gap-2 border-t border-border p-5">
          <Link
            href="/auth/login"
            className="border border-border py-2.5 text-center eyebrow text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-primary py-2.5 text-center eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setScrolled(window.scrollY > 8);
  }, [pathname]);

  const isAuthPage = pathname.startsWith("/auth/");

  if (isAuthPage) {
    const isSignup = pathname === "/auth/signup";
    const isLogin = pathname === "/auth/login";

    return (
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="shell flex h-14 sm:h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-block transition-transform hover:scale-[1.01]">
              <Image
                src="/logo/logo.png"
                alt="Abroad Bulletin — Dream • Plan • Achieve"
                width={320}
                height={68}
                priority
                className="h-8 sm:h-10 w-auto object-contain"
              />
            </Link>
            <Link
              href="/"
              className="hidden sm:inline-flex items-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors border-l border-border pl-4"
            >
              ← Back to home
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isSignup ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  Already have an account?
                </span>
                <Link
                  href="/auth/login"
                  className="h-8 sm:h-9 px-3.5 inline-flex items-center justify-center rounded-md border border-border text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors bg-background"
                >
                  Sign in
                </Link>
              </div>
            ) : isLogin ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  Don&apos;t have an account?
                </span>
                <Link
                  href="/auth/signup"
                  className="h-8 sm:h-9 px-3.5 inline-flex items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-navy transition-colors"
                >
                  Get started
                </Link>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="h-8 sm:h-9 px-3.5 inline-flex items-center justify-center rounded-md border border-border text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors bg-background"
              >
                Back to login
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn("sticky top-0 z-50 transition-shadow", scrolled && "shadow-[0_1px_0_0_var(--color-border)]")}>
      {/* 1. Utility bar */}
      <UtilityBar
        onSearchClick={() => setSearchOpen((o) => !o)}
        searchOpen={searchOpen}
      />

      {/* 2. Masthead — hidden on scroll to save space */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          scrolled ? "max-h-0 opacity-0" : "max-h-52 opacity-100",
        )}
      >
        <Masthead />
      </div>

      {/* 3. Navigation rail */}
      <NavRail pathname={pathname} onMenuClick={() => setMenuOpen(true)} />

      {/* Search panel */}
      {searchOpen && (
        <div className="border-b border-border bg-background">
          <div className="shell py-3">
            <SearchBar
              placeholder="Search universities, scholarships, news, countries…"
              autoFocus
              onSubmit={(q) => {
                setSearchOpen(false);
                if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
