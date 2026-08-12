"use client";

import { TrendingList } from "@/components/common/TrendingList";
import { trending, popularGuides } from "@/data/mock";

export function Sidebar() {
  return (
    <aside className="space-y-8">
      <TrendingList title="Trending this week" items={trending} numbered />
      <TrendingList title="Popular guides" items={popularGuides} hrefBase="/guides" />
      <section className="rounded-md border border-border bg-surface p-5">
        <p className="meta text-primary">Weekly briefing</p>
        <h3 className="mt-2 font-display text-lg font-bold text-foreground">
          One email. Every Monday.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Visa changes, deadlines and scholarship openings, summarised.
        </p>
        <form className="mt-4 space-y-2" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            required
            aria-label="Email address"
            placeholder="you@email.com"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="h-10 w-full rounded-md bg-navy text-sm font-semibold text-navy-foreground transition-colors hover:bg-primary"
          >
            Subscribe
          </button>
        </form>
      </section>
    </aside>
  );
}
