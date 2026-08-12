import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ScholarshipCard } from "@/components/cards/ScholarshipCard";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdBanner, AdSidebar } from "@/components/editorial/AdComponents";
import { scholarships } from "@/data/mock";

export const metadata: Metadata = {
  title: "Scholarships — Fully Funded & Partial Awards for International Students",
  description:
    "Discover scholarships for international students. Browse fully funded, partial, and tuition waiver awards by country and degree level.",
};

export default function ScholarshipsPage() {
  const closingSoon = scholarships
    .filter((s) => s.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const open = scholarships.filter((s) => s.daysLeft > 14);
  const [highlight, ...rest] = open;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5">
            <p className="eyebrow text-primary">Funding</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Scholarships
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Selected awards open to international students. Sorted by application deadline.
            </p>
          </div>
        </div>

        {/* Top ad */}
        <div className="border-b border-border">
          <div className="shell py-3">
            <AdBanner slot="scholarships-listing-top" format="leaderboard" />
          </div>
        </div>

        <div className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main */}
            <div className="lg:col-span-8">
              {/* Featured scholarship */}
              {highlight && (
                <div className="mb-10 pb-10 border-b border-border">
                  <div className="section-rule mb-3" />
                  <div className="mt-3">
                    <p className="eyebrow text-muted-foreground mb-4">Featured Scholarship</p>
                  </div>
                  <div className="border-t-2 border-primary pt-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="eyebrow border border-primary/20 bg-primary-soft text-primary px-2 py-0.5">
                        {highlight.type}
                      </span>
                      <span className="eyebrow text-muted-foreground">{highlight.country}</span>
                    </div>
                    <h2 className="font-display text-2xl font-extrabold text-foreground leading-tight sm:text-3xl">
                      <Link href={`/scholarships/${highlight.id}`} className="headline-link">
                        {highlight.name}
                      </Link>
                    </h2>
                    <p className="eyebrow mt-2 text-muted-foreground">{highlight.organization}</p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{highlight.eligibility}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-border pt-4">
                      {[
                        { label: "Funding", value: highlight.funding },
                        { label: "Degree", value: highlight.degree },
                        { label: "Deadline", value: highlight.deadline },
                        { label: "Days Left", value: `${highlight.daysLeft} days` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <dt className="eyebrow text-muted-foreground">{label}</dt>
                          <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <Link
                      href={`/scholarships/${highlight.id}`}
                      className="mt-5 inline-flex items-center gap-2 bg-primary px-5 py-2.5 eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      View Scholarship →
                    </Link>
                  </div>
                </div>
              )}

              {/* Open scholarships grid */}
              <SectionHeading title="Open Scholarships" subtitle="Currently accepting applications." />
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {rest.map((s, i) => (
                  <Fragment key={s.id}>
                    <ScholarshipCard scholarship={s} />
                    {i === 3 && (
                      <div className="md:col-span-2">
                        <AdBanner slot="scholarships-listing-inline" format="native-article" />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>

              {/* Closing soon */}
              {closingSoon.length > 0 && (
                <div className="mt-12">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="section-rule flex-1" />
                    <span className="eyebrow text-primary shrink-0">Closing Soon — Deadline Within 14 Days</span>
                    <div className="section-rule flex-1" />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {closingSoon.map((s) => (
                      <ScholarshipCard key={s.id} scholarship={s} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8">
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h3 className="font-display text-xl font-extrabold text-foreground">Filter Scholarships</h3>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {["All Types", "Fully Funded", "Partial Funding", "Tuition Waiver"].map((type) => (
                  <button
                    key={type}
                    className="h-9 border border-border bg-surface px-3 text-left eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {["All Countries", "Canada", "United Kingdom", "Australia", "Germany", "Netherlands", "Ireland"].map((country) => (
                  <button
                    key={country}
                    className="h-9 border border-border bg-surface px-3 text-left eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {country !== "All Countries" && <CountryFlag country={country} size="xs" />}
                    <span>{country}</span>
                  </button>
                ))}
              </div>

              {/* Ad */}
              <div className="mt-8">
                <AdSidebar slot="scholarships-listing-sidebar" format="rectangle" />
              </div>

              {/* Upcoming deadlines */}
              <div className="mt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">All Deadlines</h3>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {scholarships
                    .sort((a, b) => a.daysLeft - b.daysLeft)
                    .map((s) => (
                      <Link
                        key={s.id}
                        href={`/scholarships/${s.id}`}
                        className="group flex items-center justify-between py-3 gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {s.name}
                          </p>
                          <p className="eyebrow text-muted-foreground">{s.deadline}</p>
                        </div>
                        <span className={`eyebrow shrink-0 ${s.daysLeft <= 14 ? "text-primary" : "text-muted-foreground"}`}>
                          {s.daysLeft}d
                        </span>
                      </Link>
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
