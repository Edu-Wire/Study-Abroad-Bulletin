"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ConsultantCard } from "@/components/cards/ConsultantCard";
import { AdBanner, AdSidebar } from "@/components/editorial/AdComponents";
import { consultants } from "@/data/consultants";
import { Search, X, RotateCcw, ShieldCheck } from "lucide-react";

export default function ConsultantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedDestination, setSelectedDestination] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"recommended" | "featured" | "alphabetical">("recommended");

  const countries = ["All", "United Kingdom", "Canada", "Germany", "Australia", "United States", "Ireland"];
  const services = ["All", "University Admissions", "Visa Assistance", "Test Preparation", "SOP & LOR Editing", "Accommodation", "Career Guidance"];
  const destinations = ["All", "Canada", "United Kingdom", "United States", "Australia", "Germany", "Ireland"];

  const hasActiveFilters =
    searchQuery !== "" || selectedCountry !== "All" || selectedService !== "All" || selectedDestination !== "All" || verifiedOnly;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCountry("All");
    setSelectedService("All");
    setSelectedDestination("All");
    setVerifiedOnly(false);
    setSortBy("recommended");
  };

  const filteredConsultants = useMemo(() => {
    return consultants
      .filter((c) => {
        if (selectedCountry !== "All" && c.country !== selectedCountry) return false;
        if (selectedService !== "All" && !c.services.includes(selectedService)) return false;
        if (selectedDestination !== "All" && !c.destinations.includes(selectedDestination)) return false;
        if (verifiedOnly && !c.verified) return false;
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchName = c.name.toLowerCase().includes(q);
          const matchDesc = c.description.toLowerCase().includes(q);
          const matchCities = c.cities.some((ci) => ci.toLowerCase().includes(q));
          const matchServices = c.services.some((s) => s.toLowerCase().includes(q));
          if (!matchName && !matchDesc && !matchCities && !matchServices) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "featured") {
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        }
        if (sortBy === "alphabetical") {
          return a.name.localeCompare(b.name);
        }
        // Recommended — sponsored/featured/rating priority
        const scoreA = (a.sponsored ? 3 : 0) + (a.featured ? 2 : 0) + a.rating;
        const scoreB = (b.sponsored ? 3 : 0) + (b.featured ? 2 : 0) + b.rating;
        return scoreB - scoreA;
      });
  }, [selectedCountry, selectedService, selectedDestination, verifiedOnly, searchQuery, sortBy]);

  const featuredPartners = filteredConsultants.filter((c) => c.featured || c.sponsored);
  const regularConsultants = filteredConsultants.filter((c) => !c.featured && !c.sponsored);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Editorial Page Header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5">
            <p className="eyebrow text-primary">Corporate Directory</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Agency & Consultant Directory
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Vetted study-abroad agencies, education advisors and admissions specialists worldwide. Filter by location and service.
            </p>
          </div>
        </div>

        {/* Top Ad */}
        <div className="border-b border-border">
          <div className="shell py-3">
            <AdBanner slot="directory-top" format="leaderboard" />
          </div>
        </div>

        <div className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main Content — 8 cols */}
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
                      placeholder="Search agencies by name, city, service or destination..."
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
                      <label className="eyebrow text-muted-foreground mb-1 block">Agency Location</label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="h-9 w-full border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary"
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c === "All" ? "All Locations" : c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow text-muted-foreground mb-1 block">Primary Service</label>
                      <select
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="h-9 w-full border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary"
                      >
                        {services.map((s) => (
                          <option key={s} value={s}>
                            {s === "All" ? "All Services" : s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="eyebrow text-muted-foreground mb-1 block">Target Destination</label>
                      <select
                        value={selectedDestination}
                        onChange={(e) => setSelectedDestination(e.target.value)}
                        className="h-9 w-full border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary"
                      >
                        {destinations.map((d) => (
                          <option key={d} value={d}>
                            {d === "All" ? "All Destinations" : d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Options & Sort Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Verified Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={verifiedOnly}
                          onChange={(e) => setVerifiedOnly(e.target.checked)}
                          className="size-4 accent-primary"
                        />
                        <span className="eyebrow text-xs text-foreground flex items-center gap-1">
                          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          Verified Only
                        </span>
                      </label>

                      {/* Sort Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="eyebrow text-muted-foreground text-xs">Sort:</span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="h-7 border border-border bg-background px-2 text-[0.6875rem] font-semibold outline-none focus:border-primary"
                        >
                          <option value="recommended">Recommended</option>
                          <option value="featured">Featured First</option>
                          <option value="alphabetical">Alphabetical</option>
                        </select>
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

              {/* No Results */}
              {filteredConsultants.length === 0 && (
                <div className="border border-dashed border-border bg-surface p-12 text-center">
                  <p className="font-display text-lg font-bold text-foreground">No agency listings found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try clearing your filters or choosing a different target country.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-2 bg-primary px-4 py-2 eyebrow text-primary-foreground"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}

              {/* Featured Partners Section */}
              {featuredPartners.length > 0 && (
                <div className="mb-10">
                  <SectionHeading
                    eyebrow="Corporate Partners"
                    title="Featured Education Consultants"
                    subtitle="Verified agencies with proven international admissions success."
                  />
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    {featuredPartners.map((item) => (
                      <ConsultantCard key={item.id} consultant={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* All Listings Section */}
              {regularConsultants.length > 0 && (
                <div className="mt-10">
                  <SectionHeading
                    title="All Directory Listings"
                    subtitle="Verified study-abroad counseling practices and service providers."
                  />
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    {regularConsultants.map((item) => (
                      <ConsultantCard key={item.id} consultant={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar — 4 cols */}
            <aside className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8">
              {/* Partner Callout / Listing Ad Card */}
              <div className="border border-border bg-surface p-5 mb-8">
                <p className="eyebrow text-primary mb-1">Partner Placements</p>
                <h3 className="font-display text-lg font-extrabold text-foreground">
                  Are you an Education Agency?
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Join our verified corporate partner directory and connect with qualified international applicants looking for university guidance.
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1.5 bg-primary px-3.5 py-2 eyebrow text-primary-foreground text-xs hover:opacity-90 transition-opacity"
                >
                  <span>Apply for Verified Listing</span>
                  <span>→</span>
                </Link>
              </div>

              {/* Sidebar Ad */}
              <AdSidebar slot="directory-sidebar" format="rectangle" />

              {/* Quick Filter by Destination */}
              <div className="mt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">Agencies by Destination</h3>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {destinations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDestination(d)}
                      className={`h-9 border px-3 text-left eyebrow text-xs transition-colors flex items-center justify-between ${
                        selectedDestination === d
                          ? "border-primary bg-primary-soft text-primary font-bold"
                          : "border-border bg-surface text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      <span>{d === "All" ? "All Destinations" : `Consultants for ${d}`}</span>
                      <span className="text-[0.625rem] opacity-60">
                        {d === "All"
                          ? consultants.length
                          : consultants.filter((c) => c.destinations.includes(d)).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
