"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  X,
  ArrowRight,
  Newspaper,
  GraduationCap,
  Award,
  Globe,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { news, universities, scholarships, countries, guides } from "@/data/mock";
import type { NewsArticle, University, Scholarship, Country, Guide } from "@/data/mock";

// ─── types ────────────────────────────────────────────────────────────────────

type ResultItem =
  | { kind: "news"; data: NewsArticle }
  | { kind: "university"; data: University }
  | { kind: "scholarship"; data: Scholarship }
  | { kind: "country"; data: Country }
  | { kind: "guide"; data: Guide };

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_PER_KIND = 2;

// ─── search logic ─────────────────────────────────────────────────────────────

function searchAll(rawQuery: string): ResultItem[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const results: ResultItem[] = [];

  const matchedNews = news.filter((n) =>
    `${n.headline} ${n.summary} ${n.category} ${n.country}`
      .toLowerCase()
      .includes(q),
  );
  matchedNews
    .slice(0, MAX_PER_KIND)
    .forEach((data) => results.push({ kind: "news", data }));

  const matchedUnis = universities.filter((u) =>
    `${u.name} ${u.city} ${u.country} ${u.initials} ${u.courses.join(" ")}`
      .toLowerCase()
      .includes(q),
  );
  matchedUnis
    .slice(0, MAX_PER_KIND)
    .forEach((data) => results.push({ kind: "university", data }));

  const matchedScholarships = scholarships.filter((s) =>
    `${s.name} ${s.organization} ${s.country} ${s.type}`
      .toLowerCase()
      .includes(q),
  );
  matchedScholarships
    .slice(0, MAX_PER_KIND)
    .forEach((data) => results.push({ kind: "scholarship", data }));

  const matchedCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(q),
  );
  matchedCountries
    .slice(0, MAX_PER_KIND)
    .forEach((data) => results.push({ kind: "country", data }));

  const matchedGuides = guides.filter((g) =>
    `${g.title} ${g.description} ${g.category}`.toLowerCase().includes(q),
  );
  matchedGuides
    .slice(0, MAX_PER_KIND)
    .forEach((data) => results.push({ kind: "guide", data }));

  return results;
}

function countAll(q: string): number {
  if (!q || q.length < 2) return 0;
  return (
    news.filter((n) =>
      `${n.headline} ${n.summary} ${n.category} ${n.country}`
        .toLowerCase()
        .includes(q),
    ).length +
    universities.filter((u) =>
      `${u.name} ${u.city} ${u.country} ${u.initials}`
        .toLowerCase()
        .includes(q),
    ).length +
    scholarships.filter((s) =>
      `${s.name} ${s.organization} ${s.country} ${s.type}`
        .toLowerCase()
        .includes(q),
    ).length +
    countries.filter((c) => c.name.toLowerCase().includes(q)).length +
    guides.filter((g) =>
      `${g.title} ${g.description} ${g.category}`.toLowerCase().includes(q),
    ).length
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function hrefFor(item: ResultItem): string {
  switch (item.kind) {
    case "news":
      return `/news/${item.data.slug}`;
    case "university":
      return `/universities/${item.data.id}`;
    case "scholarship":
      return `/scholarships/${item.data.id}`;
    case "country":
      return `/countries/${item.data.id}`;
    case "guide":
      return `/guides/${item.data.id}`;
  }
}

function labelFor(item: ResultItem): string {
  switch (item.kind) {
    case "news":
      return item.data.headline;
    case "university":
      return item.data.name;
    case "scholarship":
      return item.data.name;
    case "country":
      return item.data.name;
    case "guide":
      return item.data.title;
  }
}

function metaFor(item: ResultItem): string {
  switch (item.kind) {
    case "news":
      return `${item.data.category} · ${item.data.country}`;
    case "university":
      return `${item.data.city}, ${item.data.country} · Rank #${item.data.ranking}`;
    case "scholarship":
      return `${item.data.organization} · ${item.data.country}`;
    case "country":
      return `${item.data.universities} universities`;
    case "guide":
      return `${item.data.category} · ${item.data.readingTime}`;
  }
}

function KindIcon({ kind }: { kind: ResultItem["kind"] }) {
  const cls = "size-3.5 shrink-0 mt-0.5 text-muted-foreground";
  switch (kind) {
    case "news":
      return <Newspaper className={cls} />;
    case "university":
      return <GraduationCap className={cls} />;
    case "scholarship":
      return <Award className={cls} />;
    case "country":
      return <Globe className={cls} />;
    case "guide":
      return <BookOpen className={cls} />;
  }
}

// ─── component ────────────────────────────────────────────────────────────────

export function SearchWithDropdown({
  placeholder = "Search universities, scholarships, news, countries…",
  size = "md",
  autoFocus,
  onClose,
}: {
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = searchAll(query);
  const hasResults = results.length > 0;
  const totalMatches = countAll(q);
  const showDropdown = open && q.length >= 2;

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setActiveIndex(-1);
      setQuery("");
      onClose?.();
      router.push(href);
    },
    [router, onClose],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setOpen(false);
      onClose?.();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;
    // results.length items + 1 "see all" row = results.length + 1 total
    const total = results.length; // "see all" is at index results.length

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, total));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < results.length) {
        navigate(hrefFor(results[activeIndex]));
      } else {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const heights = { sm: "h-9", md: "h-11", lg: "h-12" } as const;

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Input */}
      <form
        onSubmit={handleSubmit}
        role="search"
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-background px-3 transition-colors focus-within:border-primary",
          heights[size],
        )}
      >
        <button
          type="submit"
          aria-label="Submit search"
          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          <Search className="size-4" />
        </button>
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls={showDropdown ? "search-dropdown" : undefined}
          aria-expanded={showDropdown}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setOpen(false);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id="search-dropdown"
          role="listbox"
          aria-label="Search suggestions"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+4px)] z-[200]",
            "max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background shadow-lg",
          )}
        >
          {hasResults ? (
            <>
              <ul className="divide-y divide-border">
                {results.map((item, idx) => {
                  const isActive = activeIndex === idx;
                  return (
                    <li
                      key={`${item.kind}-${idx}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <Link
                        href={hrefFor(item)}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(hrefFor(item));
                        }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-2.5 transition-colors",
                          isActive ? "bg-surface" : "hover:bg-surface",
                        )}
                      >
                        <KindIcon kind={item.kind} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground leading-snug">
                            {labelFor(item)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {metaFor(item)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* See-all footer */}
              <div
                className={cn(
                  "border-t border-border",
                  activeIndex === results.length ? "bg-surface" : "",
                )}
              >
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                  className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-primary hover:underline transition-colors"
                >
                  <span>
                    See all{" "}
                    {totalMatches > results.length ? `${totalMatches} ` : ""}
                    results for &ldquo;{query.trim()}&rdquo;
                  </span>
                  <ArrowRight className="size-3.5 shrink-0" />
                </Link>
              </div>
            </>
          ) : (
            /* No-results state */
            <div className="px-4 py-5 text-center">
              <p className="text-sm font-semibold text-muted-foreground">
                No results for &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different term or{" "}
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                  className="text-primary hover:underline"
                >
                  view full search
                </Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
