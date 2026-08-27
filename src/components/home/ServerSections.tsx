import Image from "next/image";
import Link from "next/link";
import {
  images,
  countries,
  scholarships,
  visaUpdates,
  guides,
  deadlines,
} from "@/data/mock";
import type { NewsArticle } from "@/data/mock";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CountryFlag } from "@/components/common/CountryFlag";
import {
  FeaturedNewsCard,
  CompactNewsCard,
} from "@/components/cards/NewsCards";
import { CountryCard } from "@/components/cards/CountryCard";
import { ScholarshipCard } from "@/components/cards/ScholarshipCard";
import { GuideCard, DeadlineCard, VisaUpdateCard } from "@/components/cards/MiscCards";
import { InlineAd } from "@/components/editorial/AdComponents";

// ─── HERO / FRONT PAGE ───────────────────────────────────────────────────────

/** Format the current date editorial style: "WEDNESDAY, 12 AUGUST 2026" */
function getEditionDate(): string {
  const now = new Date();
  return now
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

interface HeroProps {
  articles: NewsArticle[];
}

export function Hero({ articles }: HeroProps) {
  const [lead, second, third, fourth, fifth] = articles;
  if (!lead) return null;
  const editionDate = getEditionDate();

  return (
    <section className="border-b border-border bg-background">
      <div className="shell py-5 lg:py-8 min-w-0">

        {/* Edition dateline — thin navy bottom border */}
        <div className="flex items-center justify-between border-b border-primary pb-2 mb-0 min-w-0">
          <span className="eyebrow font-bold text-primary tracking-wider truncate pr-2">{editionDate}</span>
          <span className="eyebrow font-bold text-primary tracking-wider hidden sm:block shrink-0">Global Edition</span>
        </div>

        {/* Main editorial grid — single column on mobile, ~70/30 on desktop */}
        <div className="mt-0 grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] min-w-0">

          {/* LEFT — Lead story */}
          <div className="min-w-0 lg:pr-8 lg:border-r lg:border-border pt-5 lg:pt-6">
            <article className="group min-w-0">
              {/* Category + breaking badge */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {lead.breaking && (
                  <span className="eyebrow text-primary-foreground bg-primary px-2 py-0.5 shrink-0">
                    Breaking
                  </span>
                )}
                <span className="eyebrow text-primary">{lead.category}</span>
                <span className="text-border">·</span>
                <div className="flex items-center gap-1">
                  <CountryFlag country={lead.country} size="xs" />
                  <span className="eyebrow text-muted-foreground">{lead.country}</span>
                </div>
              </div>

              {/* HEADLINE — fluid scale from mobile to desktop */}
              <h1 className="font-display font-extrabold text-foreground leading-[1.05] tracking-[-0.025em] text-[1.625rem] sm:text-[2.125rem] lg:text-[2.75rem] xl:text-[3rem] mb-3">
                <Link href={`/news/${lead.slug}`} className="headline-link">
                  {lead.headline}
                </Link>
              </h1>

              {/* Summary */}
              <p className="text-[0.9375rem] leading-relaxed text-muted-foreground mb-3 max-w-xl">
                {lead.summary}
              </p>

              {/* Meta */}
              <p className="meta text-muted-foreground mb-4">
                {lead.date}
                <span className="mx-2 opacity-40">·</span>
                {lead.readingTime}
                <span className="mx-2 opacity-40">·</span>
                Editorial Team
              </p>

              {/* Hero image — full column width, 3:2 ratio */}
              <Link href={`/news/${lead.slug}`} className="block overflow-hidden">
                <Image
                  src={lead.image}
                  alt={lead.headline}
                  width={900}
                  height={600}
                  priority
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  style={{ aspectRatio: "3/2" }}
                />
              </Link>
            </article>

            {/* Stats strip — three columns with thin vertical dividers */}
            <div className="mt-0 grid grid-cols-3 border-t border-border min-w-0">
              {[
                { value: "1,240", label: "Universities" },
                { value: "860", label: "Scholarships" },
                { value: "120+", label: "Updates / wk" },
              ].map(({ value, label }, i) => (
                <div
                  key={label}
                  className={`py-3 px-2 sm:py-4 sm:px-4 min-w-0 ${i < 2 ? "border-r border-border" : ""}`}
                >
                  <p className="font-display text-[1.375rem] sm:text-[1.75rem] lg:text-[2.5rem] font-extrabold text-foreground leading-none">
                    {value}
                  </p>
                  <p className="eyebrow mt-1.5 text-muted-foreground truncate">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Story stack. On mobile, shown below lead. */}
          <div className="min-w-0 lg:pl-8 border-t border-border pt-5 mt-5 lg:mt-0 lg:border-t-0 lg:pt-6">

            {/* Section heading */}
            <div className="border-t-2 border-primary pt-3 mb-0 min-w-0">
              <p className="eyebrow font-bold text-primary tracking-wider">More Top Stories</p>
            </div>
            <div className="border-b border-border mb-4" />

            <div className="divide-y divide-border min-w-0">
              {[second, third, fourth, fifth].filter(Boolean).map((article) => (
                <article key={article!.id} className="group py-4 first:pt-3 min-w-0">
                  <div className="flex gap-3 min-w-0">
                    {/* Text block */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className="eyebrow text-primary">{article!.category}</span>
                        <span className="text-border text-xs">·</span>
                        <div className="flex items-center gap-1">
                          <CountryFlag country={article!.country} size="xs" />
                          <span className="eyebrow text-muted-foreground">{article!.country}</span>
                        </div>
                      </div>
                      <h3 className="font-display font-bold text-foreground leading-[1.1] text-[1rem] sm:text-[1.0625rem]">
                        <Link href={`/news/${article!.slug}`} className="headline-link">
                          {article!.headline}
                        </Link>
                      </h3>
                      <p className="mt-1.5 text-[0.8125rem] text-muted-foreground leading-relaxed line-clamp-2">
                        {article!.summary}
                      </p>
                      <p className="meta mt-2 text-muted-foreground">
                        {article!.date}
                        <span className="mx-1.5 opacity-40">·</span>
                        {article!.readingTime}
                      </p>
                    </div>
                    {/* Thumbnail — fixed size, won't overflow */}
                    <Link
                      href={`/news/${article!.slug}`}
                      className="shrink-0 block overflow-hidden self-start mt-0.5"
                    >
                      <Image
                        src={article!.image}
                        alt={article!.headline}
                        width={88}
                        height={66}
                        className="object-cover"
                        style={{ width: 88, height: 66, minWidth: 0 }}
                      />
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Quick Access */}
            <div className="mt-5 border-t-2 border-primary pt-3 min-w-0">
              <p className="eyebrow font-bold text-primary tracking-wider mb-3">Quick Access</p>
              <div className="grid grid-cols-2 gap-0 border border-border min-w-0">
                {[
                  { label: "Find Universities", href: "/universities" },
                  { label: "Scholarships", href: "/scholarships" },
                  { label: "Visa Updates", href: "/visa" },
                  { label: "Study Guides", href: "/guides" },
                ].map(({ label, href }, i) => (
                  <Link
                    key={label}
                    href={href}
                    className={`group flex items-center justify-between px-3 py-3 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors min-w-0 ${i % 2 === 0 ? "border-r border-border" : ""
                      } ${i < 2 ? "border-b border-border" : ""
                      }`}
                  >
                    <span className="truncate pr-1">{label}</span>
                    <span aria-hidden className="text-primary group-hover:text-primary-foreground shrink-0">&rarr;</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── BREAKING STRIP ──────────────────────────────────────────────────────────

interface BreakingStripProps {
  article: NewsArticle | null;
}

export function BreakingStrip({ article }: BreakingStripProps) {
  if (!article) return null;
  return (
    <div className="border-b border-primary bg-primary">
      <div className="shell flex items-center justify-between gap-3 py-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="eyebrow shrink-0 text-primary-foreground border border-primary-foreground/40 px-2 py-0.5">
            Breaking
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-primary-foreground truncate">
            {article.headline}
          </p>
        </div>
        <Link
          href={`/news/${article.slug}`}
          className="eyebrow shrink-0 text-primary-foreground/80 hover:text-primary-foreground transition-colors whitespace-nowrap"
        >
          View Story →
        </Link>
      </div>
    </div>
  );
}

// ─── TODAY'S BRIEFING ─────────────────────────────────────────────────────────

interface TodaysBriefingProps {
  articles: NewsArticle[];
}

export function TodaysBriefing({ articles }: TodaysBriefingProps) {
  // Deduplicate stories for the briefing — take one per category
  const categorised: NewsArticle[] = [];
  const seen = new Set<string>();
  for (const article of articles) {
    if (!seen.has(article.category)) {
      categorised.push(article);
      seen.add(article.category);
    }
    if (categorised.length >= 5) break;
  }

  return (
    <section className="border-b border-border bg-surface">
      <div className="shell py-7 lg:py-12 min-w-0">
        {/* Mobile: stack heading then list. Desktop: side-by-side 3/9 columns */}
        <div className="grid gap-0 lg:grid-cols-12 min-w-0">

          {/* Left — section heading column */}
          <div className="min-w-0 lg:col-span-3 lg:pr-8 lg:border-r lg:border-border mb-5 lg:mb-0">
            <div className="section-rule mb-3" />
            <p className="eyebrow text-primary mb-2">12 August 2026</p>
            <h2 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl leading-tight">
              Today&apos;s<span className="hidden lg:inline"><br /></span> Briefing
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              The stories students need to know today — curated by our editorial team.
            </p>
            <Link
              href="/news"
              className="mt-4 inline-flex items-center gap-1.5 eyebrow text-primary hover:text-foreground transition-colors"
            >
              All stories <span aria-hidden>&rarr;</span>
            </Link>
          </div>

          {/* Right — numbered briefing list */}
          <div className="min-w-0 lg:col-span-9 lg:pl-8">
            <div className="divide-y divide-border min-w-0">
              {categorised.map((article, i) => (
                <article key={article.id} className="group grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-4 first:pt-0 last:pb-0 min-w-0">
                  {/* Large number */}
                  <span className="font-display text-2xl sm:text-3xl font-extrabold text-border leading-none tabular-nums mt-0.5 select-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="eyebrow text-primary">{article.category}</span>
                      <span className="text-border text-xs">·</span>
                      <div className="flex items-center gap-1">
                        <CountryFlag country={article.country} size="xs" />
                        <span className="eyebrow text-muted-foreground">{article.country}</span>
                      </div>
                    </div>
                    <h3 className="font-display text-[0.9375rem] sm:text-base lg:text-lg font-bold text-foreground leading-snug">
                      <Link href={`/news/${article.slug}`} className="headline-link">
                        {article.headline}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {article.summary}
                    </p>
                    <p className="meta mt-2 text-muted-foreground">
                      {article.date}
                      <span className="mx-1.5 opacity-40">·</span>
                      {article.readingTime}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── EXPLORE DESTINATIONS ────────────────────────────────────────────────────

export function ExploreDestinations() {
  return (
    <section className="border-b border-border bg-background">
      <div className="shell py-7 lg:py-12 min-w-0">
        <SectionHeading
          eyebrow="Destinations"
          title="Explore Destinations"
          subtitle="Eight leading study-abroad destinations — compared on cost, intake and university choice."
          action="All destinations"
          actionHref="/countries"
        />

        {/* Editorial destination grid: first 2 large, rest compact */}
        <div className="mt-6 grid gap-0 lg:grid-cols-12 min-w-0">

          {/* Featured two destinations — single col on mobile, 2-col on sm */}
          <div className="min-w-0 lg:col-span-8 lg:pr-8 lg:border-r lg:border-border">
            <div className="grid gap-5 sm:grid-cols-2 min-w-0">
              {countries.slice(0, 2).map((country) => (
                <CountryCard key={country.id} country={country} />
              ))}
            </div>
          </div>

          {/* Compact list remaining destinations */}
          <div className="min-w-0 mt-6 lg:mt-0 lg:col-span-4 lg:pl-8">
            <p className="eyebrow text-muted-foreground mb-3 border-b border-border pb-2">More Destinations</p>
            <div className="divide-y divide-border min-w-0">
              {countries.slice(2).map((country) => (
                <Link
                  key={country.id}
                  href={`/countries/${country.id}`}
                  className="group flex items-center justify-between py-3 hover:text-primary transition-colors min-w-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlag country={country.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-none truncate">
                        {country.name}
                      </p>
                      <p className="eyebrow text-muted-foreground mt-0.5">{country.universities} universities</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-semibold text-foreground">{country.averageTuition}</p>
                    <p className="eyebrow text-muted-foreground mt-0.5">{country.popularIntake}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              href="/countries"
              className="mt-4 inline-flex items-center gap-1.5 eyebrow text-primary hover:text-foreground transition-colors"
            >
              View all destinations <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SCHOLARSHIP SPOTLIGHT ────────────────────────────────────────────────────

export function ScholarshipSpotlight() {
  const closingSoon = scholarships
    .filter((s) => s.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const featured = scholarships.filter((s) => s.daysLeft > 14).slice(0, 3);
  const highlightedScholarship = featured[0];

  return (
    <section className="border-b border-border bg-surface">
      <div className="shell py-7 lg:py-12 min-w-0">
        <SectionHeading
          eyebrow="Funding"
          title="Scholarship Spotlight"
          subtitle="Selected awards currently open to international students."
          action="All scholarships"
          actionHref="/scholarships"
        />

        {/* Featured layout — one large + list */}
        {highlightedScholarship && (
          <div className="mt-6 grid gap-0 lg:grid-cols-12 min-w-0">
            {/* Large featured scholarship */}
            <div className="min-w-0 lg:col-span-4 lg:pr-8 lg:border-r lg:border-border">
              <div className="border-t-2 border-primary pt-5 pb-5 min-w-0">
                <span className="eyebrow text-primary border border-primary/20 bg-primary-soft px-2 py-0.5 inline-block">
                  {highlightedScholarship.type}
                </span>
                <h3 className="mt-3 font-display text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                  <Link href={`/scholarships/${highlightedScholarship.id}`} className="headline-link">
                    {highlightedScholarship.name}
                  </Link>
                </h3>
                <p className="eyebrow mt-2 text-muted-foreground">{highlightedScholarship.organization}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 min-w-0">
                  {[
                    { label: "Country", value: highlightedScholarship.country },
                    { label: "Degree", value: highlightedScholarship.degree },
                    { label: "Funding", value: highlightedScholarship.funding },
                    { label: "Deadline", value: highlightedScholarship.deadline },
                  ].map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                      <dt className="eyebrow text-muted-foreground truncate">{label}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-foreground truncate">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm text-muted-foreground">{highlightedScholarship.eligibility}</p>
                <Link
                  href={`/scholarships/${highlightedScholarship.id}`}
                  className="mt-4 inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-primary px-4 py-2.5 eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  View Scholarship <span aria-hidden>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Supporting scholarships — compact editorial rows */}
            <div className="min-w-0 lg:col-span-8 lg:mt-0 lg:pl-8 border-t border-border pt-5 mt-5 lg:pt-0 lg:border-t-0">
              <div className="divide-y divide-border min-w-0">
                {featured.slice(1).map((s) => (
                  <article key={s.id} className="py-4 group min-w-0">
                    <div className="flex items-start justify-between gap-4 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="eyebrow text-muted-foreground border border-border bg-background px-2 py-0.5">{s.type}</span>
                          <div className="flex items-center gap-1">
                            <CountryFlag country={s.country} size="xs" />
                            <span className="eyebrow text-muted-foreground">{s.country}</span>
                          </div>
                        </div>
                        <h3 className="mt-1.5 font-display text-base font-bold text-foreground leading-snug">
                          <Link href={`/scholarships/${s.id}`} className="headline-link">{s.name}</Link>
                        </h3>
                        <p className="eyebrow mt-1 text-muted-foreground">{s.organization}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-xl font-bold text-foreground">{s.daysLeft}</p>
                        <p className="eyebrow text-muted-foreground">days left</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Closing soon */}
        {closingSoon.length > 0 && (
          <div className="mt-8 min-w-0">
            <div className="flex items-center gap-3 mb-5">
              <div className="section-rule flex-1" />
              <span className="eyebrow text-primary shrink-0 text-center">Closing Soon — Deadlines Within 14 Days</span>
              <div className="section-rule flex-1" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
              {closingSoon.map((scholarship) => (
                <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── VISA UPDATES ─────────────────────────────────────────────────────────────

export function VisaUpdatesSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="shell py-7 lg:py-12 min-w-0">
        <SectionHeading
          eyebrow="Policy"
          title="Visa & Immigration"
          subtitle="Immigration and study-permit changes across major destinations."
          action="All visa updates"
          actionHref="/visa"
        />

        {/* Editorial rows — no card grid */}
        <div className="mt-6 grid gap-0 lg:grid-cols-12 min-w-0">
          {/* Lead visa story */}
          <div className="min-w-0 lg:col-span-5 lg:pr-8 lg:border-r lg:border-border">
            {visaUpdates[0] && (
              <article className="group border-t-2 border-primary pt-4 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CountryFlag country={visaUpdates[0].country} size="sm" />
                  <span className="eyebrow text-foreground font-bold">{visaUpdates[0].country}</span>
                  {visaUpdates[0].urgent && (
                    <span className="eyebrow text-primary-foreground bg-primary px-2 py-0.5 shrink-0">Urgent</span>
                  )}
                </div>
                <span className="eyebrow text-muted-foreground border border-border bg-surface px-2 py-0.5 inline-block mb-3">
                  {visaUpdates[0].visaType}
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-snug">
                  <Link href="/visa" className="headline-link">
                    {visaUpdates[0].headline}
                  </Link>
                </h3>
                <p className="meta mt-3 text-muted-foreground">
                  {visaUpdates[0].date}
                  <span className="mx-2 opacity-40">·</span>
                  Status: Updated
                </p>
                <Link href="/visa" className="mt-4 inline-flex items-center gap-1.5 eyebrow text-primary hover:text-foreground transition-colors">
                  Read Update <span aria-hidden>&rarr;</span>
                </Link>
              </article>
            )}
          </div>

          {/* Remaining visa stories as compact rows */}
          <div className="min-w-0 mt-5 lg:mt-0 lg:col-span-7 lg:pl-8 border-t border-border pt-5 lg:pt-0 lg:border-t-0">
            <div className="divide-y divide-border min-w-0">
              {visaUpdates.slice(1).map((update) => (
                <article key={update.id} className="group grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-4 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 pt-0.5">
                    <CountryFlag country={update.country} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="eyebrow text-foreground font-bold">{update.country}</span>
                      <span className="eyebrow text-muted-foreground border border-border px-1.5 py-0.5">{update.visaType}</span>
                      {update.urgent && <span className="eyebrow text-primary">Urgent</span>}
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-foreground leading-snug">
                      <Link href="/visa" className="headline-link">{update.headline}</Link>
                    </h3>
                    <p className="meta mt-1.5 text-muted-foreground">{update.date}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── GUIDES SECTION ───────────────────────────────────────────────────────────

export function GuidesSection() {
  const [featured, ...supporting] = guides;

  return (
    <section className="border-b border-border bg-surface">
      <div className="shell py-7 lg:py-12 min-w-0">
        <SectionHeading
          eyebrow="The Student Guide"
          title="Study Abroad Guides"
          subtitle="Practical, step-by-step guidance — from shortlisting to arrival."
          action="All guides"
          actionHref="/guides"
        />

        <div className="mt-6 grid gap-0 lg:grid-cols-12 min-w-0">

          {/* Featured guide — large */}
          {featured && (
            <div className="min-w-0 lg:col-span-4 lg:pr-8 lg:border-r lg:border-border">
              <article className="group border-t-2 border-foreground pt-4 transition-colors hover:border-primary min-w-0">
                <span className="eyebrow text-primary">{featured.category}</span>
                <h3 className="mt-2 font-display text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                  <Link href={`/guides/${featured.id}`} className="headline-link">
                    {featured.title}
                  </Link>
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {featured.description}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="eyebrow text-muted-foreground">{featured.readingTime}</span>
                  <Link
                    href={`/guides/${featured.id}`}
                    className="eyebrow text-primary hover:text-foreground transition-colors"
                  >
                    Read Guide →
                  </Link>
                </div>
              </article>
            </div>
          )}

          {/* Supporting guides — compact rows in 2 columns on sm+ */}
          <div className="min-w-0 mt-5 lg:mt-0 lg:col-span-8 lg:pl-8 border-t border-border pt-5 lg:pt-0 lg:border-t-0">
            <div className="grid gap-0 sm:grid-cols-2 min-w-0">
              {supporting.slice(0, 6).map((guide, i) => (
                <article
                  key={guide.id}
                  className={`group border-t border-border py-4 pr-0 sm:pr-5 transition-colors min-w-0 ${i % 2 === 1 ? "sm:border-l sm:pl-5" : ""
                    }`}
                >
                  <span className="eyebrow text-primary">{guide.category}</span>
                  <h3 className="mt-1.5 font-display text-sm sm:text-base font-bold text-foreground leading-snug">
                    <Link href={`/guides/${guide.id}`} className="headline-link">
                      {guide.title}
                    </Link>
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="eyebrow text-muted-foreground">{guide.readingTime}</span>
                    <Link href={`/guides/${guide.id}`} className="eyebrow text-primary hover:text-foreground transition-colors">
                      Read →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── UPCOMING DEADLINES ───────────────────────────────────────────────────────

export function UpcomingDeadlines() {
  return (
    <section className="border-b border-border bg-background">
      <div className="shell py-7 lg:py-12 min-w-0">
        <div className="grid gap-8 lg:grid-cols-12 min-w-0">
          {/* Deadlines — editorial timeline list */}
          <div className="min-w-0 lg:col-span-7">
            <SectionHeading
              eyebrow="Plan Ahead"
              title="Upcoming Deadlines"
              subtitle="University and scholarship dates approaching in the next eight weeks."
              action="All deadlines"
              actionHref="/news"
            />
            <div className="mt-4 min-w-0">
              {deadlines.map((deadline) => {
                const urgent = deadline.daysLeft <= 10;
                const [dayStr, ...rest] = deadline.deadline.split(" ");
                const monthYear = rest.join(" ");
                return (
                  <article
                    key={deadline.id}
                    className="grid grid-cols-[2.75rem_1px_minmax(0,1fr)_auto] sm:grid-cols-[3.5rem_1px_minmax(0,1fr)_auto] items-start gap-2 sm:gap-3 border-b border-border py-4 min-w-0"
                  >
                    {/* Date block */}
                    <div className="text-center shrink-0">
                      <p className={`font-display text-2xl sm:text-3xl font-extrabold leading-none ${urgent ? "text-primary" : "text-foreground"}`}>
                        {dayStr}
                      </p>
                      <p className="eyebrow mt-0.5 text-muted-foreground">{monthYear}</p>
                    </div>

                    {/* Vertical divider */}
                    <div className={`self-stretch w-px ${urgent ? "bg-primary" : "bg-border"}`} />

                    {/* Content */}
                    <div className="min-w-0 pl-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`eyebrow border px-2 py-0.5 ${deadline.type === "Scholarship"
                          ? "border-primary/20 bg-primary-soft text-primary"
                          : "border-border bg-surface text-muted-foreground"
                          }`}>
                          {deadline.type}
                        </span>
                        <div className="flex items-center gap-1">
                          <CountryFlag country={deadline.country} size="xs" />
                          <span className="eyebrow text-muted-foreground">{deadline.country}</span>
                        </div>
                      </div>
                      <h3 className="mt-1.5 font-display text-sm font-bold text-foreground sm:text-base">
                        {deadline.title}
                      </h3>
                    </div>

                    {/* Days left */}
                    <div className="text-right shrink-0">
                      <p className={`font-display text-lg sm:text-xl font-bold ${urgent ? "text-primary" : "text-foreground"}`}>
                        {deadline.daysLeft}
                      </p>
                      <p className="eyebrow text-muted-foreground">days</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Careers sidebar */}
          <div className="min-w-0 lg:col-span-5 lg:border-l lg:border-border lg:pl-8">
            <div className="section-rule mb-3" />
            <div className="mt-3">
              <p className="eyebrow text-primary mb-2">From Study to Career</p>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                What Comes After Graduation?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Post-study work rights, graduate job markets and career pathways for international graduates.
              </p>
            </div>
            <div className="mt-5 divide-y divide-border min-w-0">
              {[
                { title: "Post-Study Work Rights by Country", href: "/visa" },
                { title: "Graduate Employment Outcomes", href: "/news" },
                { title: "International Internship Guide", href: "/guides" },
                { title: "Salary Guide for International Graduates", href: "/guides" },
              ].map(({ title, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="group flex items-center justify-between py-3.5 text-sm font-semibold text-foreground hover:text-primary transition-colors min-w-0"
                >
                  <span className="headline-link min-w-0 pr-2 truncate">{title}</span>
                  <span aria-hidden className="text-base opacity-0 group-hover:opacity-100 transition-opacity shrink-0">&rarr;</span>
                </Link>
              ))}
            </div>

            {/* Inline ad */}
            <div className="mt-8 min-w-0">
              <p className="ad-label mb-1.5 text-muted-foreground">Advertisement</p>
              <div className="flex h-[120px] items-center justify-center border border-dashed border-border bg-surface">
                <span className="ad-label text-muted-foreground/40">Sidebar Ad — homepage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── IMMIGRATION TRACKER SPOTLIGHT ───────────────────────────────────────────

export function ImmigrationTrackerSpotlight() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="shell py-7 lg:py-12 min-w-0">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-center min-w-0">
          <div className="min-w-0 lg:col-span-8">
            <p className="eyebrow text-primary mb-2">Student Intelligence Tool</p>
            <h2 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl lg:text-4xl tracking-tight">
              Immigration Deadline Tracker
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-2xl">
              Track important student visa policy updates, proof-of-funds deadline changes, and application submission windows across major international study destinations.
            </p>
          </div>
          <div className="min-w-0 lg:col-span-4 lg:text-right">
            <Link
              href="/immigration-tracker"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-primary px-6 py-3 eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <span>View Deadline Tracker</span>
              <span aria-hidden className="text-base">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── DIRECTORY SPOTLIGHT ──────────────────────────────────────────────────────

export function ConsultantsSpotlight() {
  return (
    <section className="border-b border-border bg-background">
      <div className="shell py-7 lg:py-12 min-w-0">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-center min-w-0">
          <div className="min-w-0 lg:col-span-8">
            <p className="eyebrow text-primary mb-2">Verified Partner Network</p>
            <h2 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl lg:text-4xl tracking-tight">
              Study Abroad Directory
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-2xl">
              Find education consultants, university admissions advisors, test prep experts, and student accommodation service providers around the globe.
            </p>
          </div>
          <div className="min-w-0 lg:col-span-4 lg:text-right">
            <Link
              href="/consultants"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 border border-foreground bg-background px-6 py-3 eyebrow text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <span>Explore Directory</span>
              <span aria-hidden className="text-base">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
