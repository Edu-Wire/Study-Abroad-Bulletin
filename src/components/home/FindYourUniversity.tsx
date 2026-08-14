"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { universities } from "@/data/mock";
import { SectionHeading } from "@/components/common/SectionHeading";
import { SearchBar } from "@/components/common/SearchBar";
import { UniversityCard } from "@/components/cards/UniversityCard";

const uniFilters = {
  Country: ["All", ...new Set(universities.map((u) => u.country))],
  City: ["All", ...new Set(universities.map((u) => u.city))],
  Course: ["All", ...new Set(universities.flatMap((u) => u.courses))],
  Degree: ["All", "Bachelors", "Masters", "Both"],
  Tuition: ["All", "Under 20,000", "20,000 – 40,000", "Over 40,000"],
  Ranking: ["All", "Top 25", "Top 50", "Top 100"],
  Intake: ["All", ...new Set(universities.map((u) => u.intake))],
  Scholarships: ["All", "Available"],
} as const;

type FilterKey = keyof typeof uniFilters;

const defaultFilters: Record<FilterKey, string> = {
  Country: "All",
  City: "All",
  Course: "All",
  Degree: "All",
  Tuition: "All",
  Ranking: "All",
  Intake: "All",
  Scholarships: "All",
};

export function FindYourUniversity() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, string>>(defaultFilters);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return universities.filter((u) => {
      if (
        q &&
        !`${u.name} ${u.city} ${u.country} ${u.courses.join(" ")}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (filters.Country !== "All" && u.country !== filters.Country) return false;
      if (filters.City !== "All" && u.city !== filters.City) return false;
      if (filters.Course !== "All" && !u.courses.includes(filters.Course)) return false;
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
  }, [query, filters]);

  const activeCount = Object.values(filters).filter((v) => v !== "All").length;

  return (
    <section className="border-b border-border bg-background">
      <div className="shell py-8 lg:py-14 min-w-0">
        <SectionHeading
          eyebrow="University Discovery"
          title="Find Your University"
          subtitle="Search and compare universities across eight countries — filter by course, ranking, tuition and intake."
          action="Advanced search"
          actionHref="/universities"
        />

        {/* Filter bar — editorial style with min-w-0 max-w-full overflow-hidden */}
        <div className="mt-6 w-full max-w-full min-w-0 overflow-hidden border border-border bg-surface p-3 sm:p-5">
          <SearchBar
            size="lg"
            value={query}
            onChange={setQuery}
            placeholder="Search university, course or destination..."
            className="bg-background"
          />

          {/* Compact editorial filter selects — horizontal scroll on mobile */}
          <div className="no-scrollbar mt-3 flex w-full max-w-full min-w-0 items-center gap-2 overflow-x-auto pb-1 overscroll-contain touch-pan-x">
            {(Object.keys(uniFilters) as FilterKey[]).map((key) => (
              <label key={key} className="shrink-0">
                <span className="sr-only">{key}</span>
                <select
                  value={filters[key]}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, [key]: e.target.value }))
                  }
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
              {results.length} universities
              {activeCount > 0 && ` · ${activeCount} filter${activeCount !== 1 ? "s" : ""} active`}
            </p>
            {(activeCount > 0 || query) && (
              <button
                onClick={() => {
                  setQuery("");
                  setFilters(defaultFilters);
                }}
                className="eyebrow text-primary hover:text-foreground transition-colors"
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
            {results.slice(0, 6).map((university) => (
              <UniversityCard key={university.id} university={university} />
            ))}
          </div>
        )}

        {results.length > 6 && (
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
