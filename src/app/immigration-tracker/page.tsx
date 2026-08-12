"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { DeadlineTrackerCard } from "@/components/cards/DeadlineTrackerCard";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdBanner, AdSidebar, InlineAd } from "@/components/editorial/AdComponents";
import { immigrationDeadlines } from "@/data/immigrationDeadlines";
import { Search, X, RotateCcw } from "lucide-react";

export default function ImmigrationTrackerPage() {
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
    return immigrationDeadlines
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
  }, [selectedCountry, selectedType, selectedStatus, searchQuery, sortBy]);

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
              Important student visa, immigration policy changes and application dates — organized by destination and updated daily.
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
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search deadlines, visa rules, or countries..."
                      className="h-10 w-full border border-border bg-background pl-10 pr-9 text-sm outline-none focus:border-primary transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Selectors */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="eyebrow text-muted-foreground mb-1 block">Country</label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="h-9 w-full border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary"
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c === "All" ? "All Countries" : c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow text-muted-foreground mb-1 block">Type</label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="h-9 w-full border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary"
                      >
                        {deadlineTypes.map((t) => (
                          <option key={t} value={t}>
                            {t === "All" ? "All Types" : t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow text-muted-foreground mb-1 block">Status</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="h-9 w-full border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s === "All" ? "All Statuses" : s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Active Filter Bar & Clear */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex items-center gap-2">
                      <span className="eyebrow text-muted-foreground">Sort By:</span>
                      <div className="flex items-center gap-1">
                        {[
                          { id: "soonest", label: "Soonest" },
                          { id: "latest", label: "Latest" },
                          { id: "updated", label: "Recently Updated" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSortBy(s.id as any)}
                            className={`eyebrow border px-2.5 py-1 text-[0.6875rem] transition-colors ${
                              sortBy === s.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="eyebrow text-primary hover:underline flex items-center gap-1 text-xs"
                      >
                        <RotateCcw className="size-3" />
                        <span>Clear Filters</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* No Results Fallback */}
              {filteredDeadlines.length === 0 && (
                <div className="border border-dashed border-border bg-surface p-12 text-center">
                  <p className="font-display text-lg font-bold text-foreground">No deadlines match your filter</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try broadening your search query or country selection.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-2 bg-primary px-4 py-2 eyebrow text-primary-foreground"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}

              {/* Closing Soon Section */}
              {closingSoonDeadlines.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="section-rule flex-1" />
                    <span className="eyebrow text-primary shrink-0">Priority — Closing Soon</span>
                    <div className="section-rule flex-1" />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {closingSoonDeadlines.map((item) => (
                      <DeadlineTrackerCard key={item.id} deadline={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Ad */}
              {filteredDeadlines.length > 0 && (
                <InlineAd slot="immigration-tracker-inline" />
              )}

              {/* All / Upcoming Deadlines */}
              {otherDeadlines.length > 0 && (
                <div className="mt-8">
                  <SectionHeading
                    title="All Tracked Deadlines"
                    subtitle="Visa rule changes, residence permit deadlines and application windows."
                  />
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    {otherDeadlines.map((item) => (
                      <DeadlineTrackerCard key={item.id} deadline={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar — 4 cols */}
            <aside className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8">
              {/* Quick Filter by Country */}
              <div>
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-xl font-extrabold text-foreground">Filter by Destination</h3>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {countries.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCountry(c)}
                      className={`h-9 border px-3 text-left eyebrow text-xs transition-colors flex items-center justify-between ${
                        selectedCountry === c
                          ? "border-primary bg-primary-soft text-primary font-bold"
                          : "border-border bg-surface text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {c !== "All" && <CountryFlag country={c} size="xs" />}
                        <span>{c === "All" ? "All Destinations" : c}</span>
                      </div>
                      <span className="text-[0.625rem] opacity-60">
                        {c === "All"
                          ? immigrationDeadlines.length
                          : immigrationDeadlines.filter((d) => d.country === c).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Ad */}
              <div className="mt-8">
                <AdSidebar slot="immigration-tracker-sidebar" format="rectangle" />
              </div>

              {/* Reference Quick Links */}
              <div className="mt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">Visa Resources</h3>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {[
                    { label: "Visa & Immigration News", href: "/visa" },
                    { label: "Student Financial Proof Rules", href: "/guides" },
                    { label: "Country Admission Hubs", href: "/countries" },
                    { label: "Scholarships Closing Soon", href: "/scholarships" },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="group flex items-center justify-between py-3 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <span>{link.label}</span>
                      <span className="text-border group-hover:text-primary">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Newsletter CTA Block */}
        <section className="border-t border-border bg-navy text-navy-foreground py-12">
          <div className="shell">
            <div className="max-w-2xl">
              <p className="eyebrow text-primary mb-2">Immigration Alert Digest</p>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                Get instant policy change notifications.
              </h2>
              <p className="mt-2 text-sm text-navy-foreground/70">
                Receive crucial visa deadline updates directly in your inbox as soon as official changes are published.
              </p>
              <form className="mt-5 flex flex-col gap-2 sm:flex-row max-w-md">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  className="h-10 flex-1 border border-white/20 bg-white/5 px-3 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="h-10 bg-primary px-5 eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Subscribe →
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
