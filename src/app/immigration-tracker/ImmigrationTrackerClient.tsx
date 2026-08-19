"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { DeadlineTrackerCard } from "@/components/cards/DeadlineTrackerCard";
import { AdBanner, AdSidebar, InlineAd } from "@/components/editorial/AdComponents";
import { Search, X, RotateCcw } from "lucide-react";
import type { ImmigrationDeadline } from "@/data/immigrationDeadlines";

interface Props {
  initialDeadlines: ImmigrationDeadline[];
}

export function ImmigrationTrackerClient({ initialDeadlines }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState<"soonest" | "latest" | "updated">("soonest");

  const countries = ["All", "Canada", "United Kingdom", "United States", "Australia", "Germany", "Ireland", "Netherlands", "France"];
  const deadlineTypes = ["All", "Visa", "Immigration", "Application", "Registration", "Policy"];
  const statuses = ["All", "Closing Soon", "Upcoming", "Updated", "Passed"];

  const hasActiveFilters =
    searchQuery !== "" || selectedCountry !== "All" || selectedType !== "All" || selectedStatus !== "All";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCountry("All");
    setSelectedType("All");
    setSelectedStatus("All");
    setSortBy("soonest");
  };

  const filteredDeadlines = useMemo(() => {
    return initialDeadlines
      .filter((d) => {
        if (selectedCountry !== "All" && d.country !== selectedCountry) return false;
        if (selectedType !== "All" && d.deadlineType !== selectedType) return false;
        if (selectedStatus !== "All" && d.status !== selectedStatus) return false;
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchTitle = d.title.toLowerCase().includes(q);
          const matchDesc = d.description.toLowerCase().includes(q);
          const matchCountry = d.country.toLowerCase().includes(q);
          const matchTags = d.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchCountry && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "soonest") {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (sortBy === "latest") {
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        }
        if (sortBy === "updated") {
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        }
        return 0;
      });
  }, [initialDeadlines, selectedCountry, selectedType, selectedStatus, searchQuery, sortBy]);

  const closingSoonDeadlines = filteredDeadlines.filter((d) => d.status === "Closing Soon");
  const otherDeadlines = filteredDeadlines.filter((d) => d.status !== "Closing Soon");

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Editorial Page Header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5">
            <p className="eyebrow text-primary">Student Intelligence Tool</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Immigration Deadline Tracker
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Important student visa, immigration policy changes and application dates — live from PostgreSQL database and organized by destination.
            </p>
          </div>
        </div>

        {/* Top Ad */}
        <div className="border-b border-border">
          <div className="shell py-3">
            <AdBanner slot="immigration-tracker-top" format="leaderboard" />
          </div>
        </div>

        <div className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main Content Area — 8 cols */}
            <div className="lg:col-span-8">
              {/* Search & Filter Toolbar */}
              <div className="border border-border bg-surface p-5 mb-8">
                <div className="flex flex-col gap-4">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search deadlines by country, policy keyword or visa category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 pl-10 pr-10 bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Selects */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="eyebrow text-muted-foreground text-[10px] block mb-1">Country</label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="w-full h-9 px-2.5 bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow text-muted-foreground text-[10px] block mb-1">Type</label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full h-9 px-2.5 bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {deadlineTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow text-muted-foreground text-[10px] block mb-1">Status</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full h-9 px-2.5 bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow text-muted-foreground text-[10px] block mb-1">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full h-9 px-2.5 bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="soonest">Closing Soonest</option>
                        <option value="latest">Furthest Date</option>
                        <option value="updated">Recently Updated</option>
                      </select>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <span className="text-muted-foreground">
                        Showing {filteredDeadlines.length} of {initialDeadlines.length} deadlines
                      </span>
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Urgent / Closing Soon Grid */}
              {closingSoonDeadlines.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-primary">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h2 className="font-display text-xl font-bold tracking-tight text-foreground uppercase">
                      Urgent • Closing Soon
                    </h2>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {closingSoonDeadlines.map((d) => (
                      <DeadlineTrackerCard key={d.id} deadline={d} />
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Ad */}
              <div className="my-8">
                <InlineAd slot="immigration-tracker-top" />
              </div>

              {/* Upcoming and Remaining Deadlines */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                    All Active Dates & Deadlines ({otherDeadlines.length})
                  </h2>
                </div>

                {otherDeadlines.length === 0 && closingSoonDeadlines.length === 0 ? (
                  <div className="border border-border bg-surface p-12 text-center">
                    <p className="font-display text-lg font-bold text-foreground">No deadlines found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms.</p>
                    <button
                      onClick={clearFilters}
                      className="mt-4 px-4 py-2 bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {otherDeadlines.map((d) => (
                      <DeadlineTrackerCard key={d.id} deadline={d} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar — 4 cols */}
            <aside className="lg:col-span-4 space-y-8">
              <AdSidebar slot="immigration-tracker-sidebar" />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
