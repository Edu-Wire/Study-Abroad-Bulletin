"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import type {
  University,
  PaginationMeta,
  PaginatedUniversitiesResponse,
} from "@/contracts/universities";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SearchBar } from "@/components/common/SearchBar";
import { UniversityCard } from "@/components/cards/UniversityCard";

type FilterKey =
  | "Country"
  | "City"
  | "Course"
  | "Degree"
  | "Tuition"
  | "Ranking"
  | "Intake"
  | "Scholarships";

type FilterValues = Record<FilterKey, string>;

const defaultFilters: FilterValues = {
  Country: "All",
  City: "All",
  Course: "All",
  Degree: "All",
  Tuition: "All",
  Ranking: "All",
  Intake: "All",
  Scholarships: "All",
};

const STANDARD_COUNTRIES = [
  "All",
  "Australia",
  "Canada",
  "France",
  "Germany",
  "Ireland",
  "Netherlands",
  "United Kingdom",
  "United States",
];

interface FindYourUniversityProps {
  initialData?: University[];
  initialPagination?: PaginationMeta;
  showAll?: boolean;
  showHeading?: boolean;
  pageSize?: number;
}

export function FindYourUniversity({
  initialData,
  initialPagination,
  showAll = false,
  showHeading = true,
  pageSize = 18,
}: FindYourUniversityProps = {}) {
  const [universities, setUniversities] = useState<University[]>(initialData ?? []);
  const [pagination, setPagination] = useState<PaginationMeta>(
    initialPagination ?? {
      page: 1,
      limit: pageSize,
      total: initialData?.length ?? 0,
      totalPages: initialData ? Math.ceil(initialData.length / pageSize) || 1 : 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  );

  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(initialPagination?.page ?? 1);

  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const prevQuery = useRef(query);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: FilterKey, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    setQuery("");
    setFilters(defaultFilters);
    setCurrentPage(1);
  };

  // Pure API-driven fetching on mount, pagination change, or filter change
  useEffect(() => {
    const controller = new AbortController();
    const queryChanged = query !== prevQuery.current;
    prevQuery.current = query;

    const timeoutId = setTimeout(
      async () => {
        setIsLoading(true);
        try {
          const params = new URLSearchParams();
          params.set("page", String(currentPage));
          params.set("limit", String(showAll ? pageSize : 6));
          if (query.trim()) params.set("q", query.trim());
          if (filters.Country !== "All") params.set("country", filters.Country);
          if (filters.City !== "All") params.set("city", filters.City);
          if (filters.Course !== "All") params.set("course", filters.Course);
          if (filters.Degree !== "All") params.set("degree", filters.Degree);
          if (filters.Tuition !== "All") params.set("tuition", filters.Tuition);
          if (filters.Ranking !== "All") params.set("ranking", filters.Ranking);
          if (filters.Intake !== "All") params.set("intake", filters.Intake);
          if (filters.Scholarships === "Available")
            params.set("scholarships", "true");

          const res = await fetch(`/api/universities?${params.toString()}`, {
            signal: controller.signal,
          });
          if (!res.ok) return;

          const json = (await res.json()) as PaginatedUniversitiesResponse;
          if (json.success && Array.isArray(json.data)) {
            setUniversities(json.data);
            if (json.pagination) {
              setPagination(json.pagination);
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
          console.error("[FindYourUniversity] fetch error:", err);
        } finally {
          setIsLoading(false);
        }
      },
      queryChanged ? 300 : 0
    );

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, filters, currentPage, pageSize, showAll]);

  // Dynamic filter lists
  const uniFilters: Record<FilterKey, string[]> = useMemo(() => {
    const combinedCountries = Array.from(
      new Set([
        ...STANDARD_COUNTRIES,
        ...universities.map((u) => u.country).filter(Boolean),
      ])
    );

    return {
      Country: combinedCountries,
      City: [
        "All",
        ...Array.from(new Set(universities.map((u) => u.city).filter(Boolean))),
      ],
      Course: [
        "All",
        ...Array.from(
          new Set(universities.flatMap((u) => u.courses ?? []).filter(Boolean))
        ),
      ],
      Degree: ["All", "Bachelors", "Masters", "Both"],
      Tuition: ["All", "Under 20,000", "20,000 – 40,000", "Over 40,000"],
      Ranking: ["All", "Top 25", "Top 50", "Top 100"],
      Intake: [
        "All",
        ...Array.from(new Set(universities.map((u) => u.intake).filter(Boolean))),
      ],
      Scholarships: ["All", "Available"],
    };
  }, [universities]);

  const filterKeys = Object.keys(uniFilters) as FilterKey[];
  const activeCount = Object.values(filters).filter((v) => v !== "All").length;

  const totalPages = pagination.totalPages;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    resultsContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const startItem =
    pagination.total === 0 ? 0 : (safeCurrentPage - 1) * pagination.limit + 1;
  const endItem = Math.min(safeCurrentPage * pagination.limit, pagination.total);

  return (
    <section className="border-b border-border bg-background">
      <div
        ref={resultsContainerRef}
        className={`shell min-w-0 ${
          showHeading ? "py-8 lg:py-14" : "py-6 lg:py-10"
        }`}
      >
        {showHeading && (
          <SectionHeading
            eyebrow="University Discovery"
            title="Find Your University"
            subtitle="Search and compare universities across eight countries — filter by course, ranking, tuition and intake."
            action="Advanced search"
            actionHref="/universities"
          />
        )}

        {/* Filter bar */}
        <div
          className={`w-full max-w-full min-w-0 overflow-hidden border border-border bg-surface p-3 sm:p-5 ${
            showHeading ? "mt-6" : "mt-0"
          }`}
        >
          <SearchBar
            size="lg"
            value={query}
            onChange={handleQueryChange}
            placeholder="Search university, course or destination..."
            className="bg-background"
          />

          {/* Compact editorial filter selects — horizontal scroll on mobile */}
          <div className="no-scrollbar mt-3 flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto pb-1 overscroll-contain touch-pan-x">
            {filterKeys.map((key) => (
              <label key={key} className="shrink-0">
                <span className="sr-only">{key}</span>
                <select
                  value={filters[key]}
                  onChange={(e) => handleFilterChange(key, e.target.value)}
                  className={`h-9 border bg-background px-2 text-xs font-semibold outline-none transition-colors cursor-pointer ${
                    filters[key] === "All"
                      ? "border-border text-muted-foreground"
                      : "border-primary text-primary"
                  }`}
                >
                  {uniFilters[key].map((option) => (
                    <option key={option} value={option}>
                      {option === "All" ? key : `${key}: ${option}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="eyebrow text-muted-foreground flex items-center gap-2">
              {showAll && pagination.total > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {startItem}–{endItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">
                    {pagination.total}
                  </span>{" "}
                  universities
                </>
              ) : (
                <>
                  <span className="font-semibold text-foreground">
                    {pagination.total}
                  </span>{" "}
                  universities
                </>
              )}
              {activeCount > 0 &&
                ` · ${activeCount} filter${activeCount !== 1 ? "s" : ""} active`}
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    Updating...
                  </span>
                </span>
              )}
            </p>
            {(activeCount > 0 || query) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="eyebrow text-primary hover:text-foreground transition-colors cursor-pointer"
              >
                Clear all →
              </button>
            )}
          </div>
        </div>

        {/* Results grid */}
        <div className="mt-7 min-w-0">
          {isLoading && universities.length === 0 ? (
            /* Skeleton Loading Cards */
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 min-w-0">
              {Array.from({ length: showAll ? 6 : 6 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="animate-pulse border border-border bg-surface p-5 rounded-none flex flex-col justify-between h-64"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-border/60 rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-border/60 rounded w-3/4" />
                        <div className="h-3 bg-border/40 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div className="h-10 bg-border/30 rounded" />
                      <div className="h-10 bg-border/30 rounded" />
                    </div>
                  </div>
                  <div className="h-3 bg-border/30 rounded w-1/3 mt-4" />
                </div>
              ))}
            </div>
          ) : universities.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-lg font-bold text-muted-foreground">
                No universities match these filters.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try widening your search criteria or clearing active filters.
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 min-w-0 transition-opacity duration-200 ${
                isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {universities.map((university) => (
                <UniversityCard key={university.id} university={university} />
              ))}
            </div>
          )}
        </div>

        {/* Server-Side Pagination Bar */}
        {showAll && totalPages > 1 && (
          <nav
            aria-label="Universities pagination"
            className="mt-10 border-t border-border pt-6 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="text-xs text-muted-foreground">
              Page{" "}
              <span className="font-semibold text-foreground">
                {safeCurrentPage}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={safeCurrentPage <= 1 || isLoading}
                aria-label="First page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage <= 1 || isLoading
                    ? "opacity-30 pointer-events-none text-muted-foreground"
                    : "text-foreground hover:border-primary hover:text-primary bg-background cursor-pointer"
                }`}
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1 || isLoading}
                aria-label="Previous page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage <= 1 || isLoading
                    ? "opacity-30 pointer-events-none text-muted-foreground"
                    : "text-foreground hover:border-primary hover:text-primary bg-background cursor-pointer"
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - safeCurrentPage) <= 1
                )
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                    acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-1.5 sm:px-2 text-xs text-muted-foreground select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handlePageChange(p)}
                      className={`min-w-[34px] h-9 px-2.5 inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        safeCurrentPage === p
                          ? "bg-primary text-primary-foreground pointer-events-none shadow-xs"
                          : "border border-border text-foreground hover:border-primary hover:text-primary bg-background"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              {/* Next Page */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages || isLoading}
                aria-label="Next page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage >= totalPages || isLoading
                    ? "opacity-30 pointer-events-none text-muted-foreground"
                    : "text-foreground hover:border-primary hover:text-primary bg-background cursor-pointer"
                }`}
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={safeCurrentPage >= totalPages || isLoading}
                aria-label="Last page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage >= totalPages || isLoading
                    ? "opacity-30 pointer-events-none text-muted-foreground"
                    : "text-foreground hover:border-primary hover:text-primary bg-background cursor-pointer"
                }`}
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}

        {/* Homepage Preview Link */}
        {!showAll && pagination.total > 6 && (
          <div className="mt-8 border-t border-border pt-6 text-center">
            <Link
              href="/universities"
              className="inline-flex items-center gap-2 border border-border bg-surface px-6 py-2.5 eyebrow text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              View all {pagination.total} universities →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
