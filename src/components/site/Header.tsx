"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { SearchWithDropdown } from "@/components/common/SearchWithDropdown";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/api/auth";

const mainNav = [
  { label: "News", href: "/news" },
  { label: "Universities", href: "/universities" },
  { label: "Countries", href: "/countries" },
  { label: "Scholarships", href: "/scholarships" },
  { label: "Visa", href: "/visa" },
  { label: "Tracker", href: "/immigration-tracker" },
  { label: "Directory", href: "/consultants" },
  { label: "Guides", href: "/guides" },
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

/** Top utility bar — thin, all-caps, restrained. Visible on desktop (lg+). */
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

    // The session cookie is HttpOnly, so it cannot be sniffed from JavaScript.
    // Ask the server instead; this drives presentation only.
    let cancelled = false;
    getCurrentUser()
      .then((res) => {
        if (!cancelled) setIsLoggedIn(Boolean(res.success && res.user));
      })
      .catch(() => {
        if (!cancelled) setIsLoggedIn(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hidden lg:block border-b border-border bg-background">
      <div className="shell flex h-8 items-center justify-between gap-4">
        {/* Left — edition label */}
        <p className="eyebrow text-muted-foreground">
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
            <span>Search</span>
          </button>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="eyebrow text-primary font-bold transition-colors hover:text-navy"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Masthead — publication identity. Visible on desktop (lg+), hidden on scroll to save space. */
function Masthead() {
  return (
    <div className="hidden lg:block border-b border-border bg-background">
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

/** Mobile header bar — clean 56px bar with logo + search toggle + hamburger. Visible on <lg. */
function MobileHeader({
  onSearchClick,
  searchOpen,
  onMenuClick,
}: {
  onSearchClick: () => void;
  searchOpen: boolean;
  onMenuClick: () => void;
}) {
  return (
    <div className="lg:hidden border-b border-border bg-background">
      <div className="shell flex h-14 items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="shrink-0 inline-block" aria-label="Home">
          <Image
            src="/logo/logo.png"
            alt="Abroad Bulletin"
            width={320}
            height={68}
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={onSearchClick}
            className="grid size-10 place-items-center text-foreground transition-colors hover:text-primary rounded-md"
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
            className="grid size-10 place-items-center text-foreground transition-colors hover:text-primary rounded-md"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Navigation rail — desktop full centered nav. Strictly hidden on mobile to prevent overflow. */
function NavRail({ pathname }: { pathname: string }) {
  return (
    <div className="hidden lg:block border-b border-border bg-background">
      <div className="shell flex items-center justify-center">
        <nav
          className="flex items-center justify-center"
          aria-label="Main navigation"
        >
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
                  "eyebrow relative shrink-0 px-5 py-3 text-foreground transition-colors hover:text-primary",
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
      </div>
    </div>
  );
}

/** Mobile drawer menu — accessible slideout dialog */
function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Focus close button when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard: Escape closes drawer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Backdrop */}
      <button
        aria-label="Close menu"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-default w-full h-full border-0"
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xs flex-col bg-background border-l border-border shadow-2xl">
        {/* Drawer header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0">
          <Link href="/" onClick={onClose} className="shrink-0">
            <Image
              src="/logo/logo.png"
              alt="Abroad Bulletin"
              width={200}
              height={42}
              className="h-8 w-auto object-contain"
            />
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="grid size-10 place-items-center text-foreground hover:text-primary transition-colors rounded-md"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border px-4 py-3 shrink-0">
          <SearchWithDropdown
            placeholder="Search…"
            onClose={onClose}
          />
        </div>

        {/* Nav items — scrollable */}
        <nav className="flex-1 overflow-y-auto" aria-label="Drawer navigation">
          {mainNav.map((item, idx) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                ref={idx === 0 ? firstLinkRef : undefined}
                onClick={onClose}
                className={cn(
                  "flex items-center justify-between border-b border-border px-4 py-4 font-display text-base font-bold text-foreground transition-colors hover:text-primary hover:bg-surface",
                  isActive && "text-primary bg-primary-soft/40",
                )}
              >
                <span>{item.label}</span>
                <span className="text-muted-foreground text-lg">›</span>
              </Link>
            );
          })}

          {/* Additional links */}
          {[
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className="flex items-center justify-between border-b border-border px-4 py-3.5 eyebrow text-muted-foreground transition-colors hover:text-primary hover:bg-surface"
            >
              <span>{item.label}</span>
              <span className="text-muted-foreground">›</span>
            </Link>
          ))}
        </nav>

        {/* Auth buttons */}
        <div className="grid grid-cols-2 gap-2 border-t border-border p-4 shrink-0">
          <Link
            href="/auth/login"
            onClick={onClose}
            className="h-11 flex items-center justify-center border border-border eyebrow text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            onClick={onClose}
            className="h-11 flex items-center justify-center bg-primary eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  useRouter();
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
            <Link href="/" className="inline-block transition-transform hover:scale-[1.01] shrink-0">
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

          <div className="flex items-center gap-3 shrink-0">
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
      {/* 1. Utility bar — desktop only */}
      <UtilityBar
        onSearchClick={() => setSearchOpen((o) => !o)}
        searchOpen={searchOpen}
      />

      {/* 2. Masthead — desktop only, hidden on scroll */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          scrolled ? "max-h-0 opacity-0" : "max-h-52 opacity-100",
        )}
      >
        <Masthead />
      </div>

      {/* 3. Mobile header bar — logo + icons */}
      <MobileHeader
        onSearchClick={() => setSearchOpen((o) => !o)}
        searchOpen={searchOpen}
        onMenuClick={() => setMenuOpen(true)}
      />

      {/* 4. Navigation rail — desktop full centered nav only (hidden on mobile) */}
      <NavRail pathname={pathname} />

      {/* Search panel */}
      {searchOpen && (
        <div className="border-b border-border bg-background">
          <div className="shell py-3">
            <SearchWithDropdown
              placeholder="Search universities, scholarships, news, countries…"
              autoFocus
              onClose={() => setSearchOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
