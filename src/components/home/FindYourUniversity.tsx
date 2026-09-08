"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { University } from "@/contracts/universities";
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

interface FindYourUniversityProps {
  universities: University[];
  showAll?: boolean;
  showHeading?: boolean;
  pageSize?: number;
}

export function FindYourUniversity({
  universities,
  showAll = false,
  showHeading = true,
  pageSize = 18,
}: FindYourUniversityProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

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

  // Build filter options dynamically from whichever dataset is active
  const uniFilters: Record<FilterKey, string[]> = useMemo(() => ({
    Country:      ["All", ...new Set(universities.map((u) => u.country))],
    City:         ["All", ...new Set(universities.map((u) => u.city))],
    Course:       ["All", ...new Set(universities.flatMap((u) => u.courses ?? []))],
    Degree:       ["All", "Bachelors", "Masters", "Both"],
    Tuition:      ["All", "Under 20,000", "20,000 – 40,000", "Over 40,000"],
    Ranking:      ["All", "Top 25", "Top 50", "Top 100"],
    Intake:       ["All", ...new Set(universities.map((u) => u.intake).filter(Boolean))],
    Scholarships: ["All", "Available"],
  }), [universities]);

  const filterKeys = Object.keys(uniFilters) as FilterKey[];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return universities.filter((u) => {
      const coursesList = u.courses ?? [];
      if (
        q &&
        !`${u.name} ${u.city} ${u.country} ${coursesList.join(" ")}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (filters.Country !== "All" && u.country !== filters.Country) return false;
      if (filters.City !== "All" && u.city !== filters.City) return false;
      if (filters.Course !== "All" && !coursesList.includes(filters.Course)) return false;
      if (filters.Degree !== "All" && u.degree !== filters.Degree) return false;
      if (filters.Intake !== "All" && u.intake !== filters.Intake) return false;
      if (filters.Scholarships === "Available" && !u.scholarships) return false;
      if (filters.Tuition === "Under 20,000" && u.tuitionValue >= 20000) return false;
      if (
        filters.Tuition === "20,000 – 40,000" &&
        (u.tuitionValue < 20000 || u.tuitionValue > 40000)
      )
        return false;
      if (filters.Tuition === "Over 40,000" && u.tuitionValue <= 40000) return false;
      if (filters.Ranking === "Top 25" && u.ranking > 25) return false;
      if (filters.Ranking === "Top 50" && u.ranking > 50) return false;
      if (filters.Ranking === "Top 100" && u.ranking > 100) return false;
      return true;
    });
  }, [universities, query, filters]);

  const activeCount = Object.values(filters).filter((v) => v !== "All").length;

  const totalPages = Math.ceil(results.length / pageSize);
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const paginatedResults = useMemo(() => {
    if (!showAll) return results.slice(0, 6);
    const start = (safeCurrentPage - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }, [results, showAll, safeCurrentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    resultsContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startItem = results.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, results.length);

  return (
    <section className="border-b border-border bg-background">
      <div
        ref={resultsContainerRef}
        className={`shell min-w-0 ${showHeading ? "py-8 lg:py-14" : "py-6 lg:py-10"}`}
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

        {/* Filter bar — editorial style with min-w-0 max-w-full overflow-hidden */}
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
                  className={`h-9 border bg-background px-2 text-xs font-semibold outline-none transition-colors cursor-pointer
                    ${filters[key] === "All"
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
            <p className="eyebrow text-muted-foreground">
              {showAll && results.length > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-semibold text-foreground">
                    {startItem}–{endItem}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-foreground">
                    {results.length}
                  </span>{" "}
                  universities
                </>
              ) : (
                <>
                  {results.length} universities
                </>
              )}
              {activeCount > 0 && ` · ${activeCount} filter${activeCount !== 1 ? "s" : ""} active`}
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

        {/* Results */}
        {results.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-lg font-bold text-muted-foreground">
              No universities match these filters.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try widening your search criteria.
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 min-w-0">
            {paginatedResults.map((university) => (
              <UniversityCard key={university.id} university={university} />
            ))}
          </div>
        )}

        {/* Pagination Bar (when showAll is enabled and there are multiple pages) */}
        {showAll && totalPages > 1 && (
          <nav
            aria-label="Universities pagination"
            className="mt-10 border-t border-border pt-6 flex items-center justify-between gap-4 flex-wrap"
          >
            <div className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{safeCurrentPage}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={safeCurrentPage <= 1}
                aria-label="First page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage <= 1
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
                disabled={safeCurrentPage <= 1}
                aria-label="Previous page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage <= 1
                    ? "opacity-30 pointer-events-none text-muted-foreground"
                    : "text-foreground hover:border-primary hover:text-primary bg-background cursor-pointer"
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Numbered Page Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
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
                disabled={safeCurrentPage >= totalPages}
                aria-label="Next page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage >= totalPages
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
                disabled={safeCurrentPage >= totalPages}
                aria-label="Last page"
                className={`p-2 rounded-md border border-border transition-colors ${
                  safeCurrentPage >= totalPages
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

        {/* Homepage Preview Link (only when showAll is false and there are > 6 results) */}
        {!showAll && results.length > 6 && (
          <div className="mt-8 border-t border-border pt-6 text-center">
            <Link
              href="/universities"
              className="inline-flex items-center gap-2 border border-border bg-surface px-6 py-2.5 eyebrow text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              View all {results.length} universities →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
