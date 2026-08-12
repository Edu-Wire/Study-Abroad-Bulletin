"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SearchBar } from "@/components/common/SearchBar";
import { FilterBar } from "@/components/common/FilterBar";
import { CountryFlag } from "@/components/common/CountryFlag";
import { news, universities, scholarships, countries, guides } from "@/data/mock";

const tabs = ["All", "Universities", "Scholarships", "News", "Guides", "Countries"] as const;
type SearchTab = (typeof tabs)[number];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<SearchTab>("All");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    const params = new URLSearchParams(window.location.search);
    if (val.trim()) {
      params.set("q", val);
    } else {
      params.delete("q");
    }
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return { universities: [], scholarships: [], news: [], guides: [], countries: [] };
    return {
      universities: universities.filter((u) =>
        `${u.name} ${u.city} ${u.country} ${u.initials}`.toLowerCase().includes(q),
      ),
      scholarships: scholarships.filter((s) =>
        `${s.name} ${s.organization} ${s.country} ${s.type}`.toLowerCase().includes(q),
      ),
      news: news.filter((n) =>
        `${n.headline} ${n.summary} ${n.country} ${n.category}`.toLowerCase().includes(q),
      ),
      guides: guides.filter((g) =>
        `${g.title} ${g.description} ${g.category}`.toLowerCase().includes(q),
      ),
      countries: countries.filter((c) =>
        c.name.toLowerCase().includes(q),
      ),
    };
  }, [q]);

  const totalCount =
    results.universities.length +
    results.scholarships.length +
    results.news.length +
    results.guides.length +
    results.countries.length;

  const popularSearches = [
    "Canada Study Permit", "UK Student Visa", "IELTS", "Fully Funded Scholarships",
    "Computer Science", "Harvard", "Oxford", "Germany", "Post-Study Work",
  ];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Search header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-8 lg:py-10">
            <p className="eyebrow text-primary">Search</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Search Study Abroad Intelligence
            </h1>
            <div className="mt-6 max-w-2xl">
              <SearchBar
                size="lg"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search universities, scholarships, news, guides…"
                autoFocus
              />
            </div>
            {q && (
              <p className="mt-3 eyebrow text-muted-foreground">
                {totalCount} result{totalCount !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Popular searches — shown when no query */}
        {!q && (
          <div className="shell py-10">
            <div className="section-rule mb-3" />
            <div className="mt-3 mb-5">
              <h2 className="font-display text-xl font-extrabold text-foreground">Popular Searches</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleQueryChange(term)}
                  className="border border-border bg-surface px-4 py-2 eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Browse by category */}
            <div className="mt-12">
              <div className="section-rule mb-3" />
              <div className="mt-3 mb-6">
                <h2 className="font-display text-xl font-extrabold text-foreground">Browse by Category</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Universities", count: universities.length, href: "/universities", desc: "Search & compare global universities" },
                  { label: "Scholarships", count: scholarships.length, href: "/scholarships", desc: "Fully funded & partial awards" },
                  { label: "Countries", count: countries.length, href: "/countries", desc: "Study-abroad destinations" },
                  { label: "News", count: news.length, href: "/news", desc: "Latest study-abroad updates" },
                  { label: "Guides", count: guides.length, href: "/guides", desc: "Step-by-step editorial guides" },
                  { label: "Visa Updates", count: 8, href: "/visa", desc: "Immigration policy changes" },
                ].map(({ label, count, href, desc }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group border-t-2 border-foreground pt-4 pb-4 hover:border-primary transition-colors"
                  >
                    <p className="eyebrow text-primary">{count} items</p>
                    <h3 className="mt-1 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {label}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search results */}
        {q && (
          <div className="shell py-8 lg:py-12">
            <FilterBar options={tabs} value={tab} onChange={(v) => setTab(v as SearchTab)} />

            <div className="mt-8 space-y-10">
              {/* News results */}
              {(tab === "All" || tab === "News") && results.news.length > 0 && (
                <div>
                  <div className="section-rule mb-3" />
                  <div className="mt-3 mb-5">
                    <p className="eyebrow text-muted-foreground">
                      News — {results.news.length} results
                    </p>
                  </div>
                  <div className="space-y-4">
                    {results.news.map((article) => (
                      <Link
                        key={article.id}
                        href={`/news/${article.slug}`}
                        className="group grid grid-cols-[80px_minmax(0,1fr)] gap-4 border-b border-border pb-4 sm:grid-cols-[120px_minmax(0,1fr)]"
                      >
                        <Image
                          src={article.image}
                          alt={article.headline}
                          width={120}
                          height={80}
                          className="aspect-[3/2] w-full object-cover"
                        />
                        <div className="min-w-0">
                          <span className="eyebrow text-primary">{article.category}</span>
                          <h3 className="mt-1.5 font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {article.headline}
                          </h3>
                          <p className="meta mt-1 text-muted-foreground">{article.date}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Universities results */}
              {(tab === "All" || tab === "Universities") && results.universities.length > 0 && (
                <div>
                  <div className="section-rule mb-3" />
                  <div className="mt-3 mb-5">
                    <p className="eyebrow text-muted-foreground">
                      Universities — {results.universities.length} results
                    </p>
                  </div>
                  <div className="space-y-2">
                    {results.universities.map((u) => (
                      <Link
                        key={u.id}
                        href={`/universities/${u.id}`}
                        className="group flex items-center gap-4 border border-border bg-surface px-4 py-3 hover:border-primary transition-colors"
                      >
                        <span className="grid size-10 shrink-0 place-items-center bg-navy font-display text-xs font-bold text-navy-foreground">
                          {u.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {u.name}
                          </h3>
                          <p className="eyebrow text-muted-foreground">{u.city}, {u.country} · Rank #{u.ranking}</p>
                        </div>
                        <span className="eyebrow text-muted-foreground shrink-0">{u.tuition}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Scholarships results */}
              {(tab === "All" || tab === "Scholarships") && results.scholarships.length > 0 && (
                <div>
                  <div className="section-rule mb-3" />
                  <div className="mt-3 mb-5">
                    <p className="eyebrow text-muted-foreground">
                      Scholarships — {results.scholarships.length} results
                    </p>
                  </div>
                  <div className="space-y-2">
                    {results.scholarships.map((s) => (
                      <Link
                        key={s.id}
                        href={`/scholarships/${s.id}`}
                        className="group flex items-center justify-between gap-4 border border-border bg-surface px-4 py-3 hover:border-primary transition-colors"
                      >
                        <div className="min-w-0">
                          <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {s.name}
                          </h3>
                          <p className="eyebrow text-muted-foreground">{s.organization} · {s.country}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className={`eyebrow border px-2 py-0.5 ${s.type === "Fully Funded" ? "border-success/25 bg-success-soft text-success" : "border-border bg-background text-muted-foreground"}`}>
                            {s.type}
                          </span>
                          <p className="eyebrow mt-1 text-muted-foreground">{s.daysLeft} days</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Countries */}
              {(tab === "All" || tab === "Countries") && results.countries.length > 0 && (
                <div>
                  <div className="section-rule mb-3" />
                  <div className="mt-3 mb-5">
                    <p className="eyebrow text-muted-foreground">
                      Countries — {results.countries.length} results
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {results.countries.map((c) => (
                      <Link
                        key={c.id}
                        href={`/countries/${c.id}`}
                        className="group flex items-center gap-3 border border-border bg-surface px-4 py-3 hover:border-primary transition-colors"
                      >
                        <CountryFlag country={c.name} size="sm" />
                        <div>
                          <p className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                            {c.name}
                          </p>
                          <p className="eyebrow text-muted-foreground">{c.universities} universities</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Guides */}
              {(tab === "All" || tab === "Guides") && results.guides.length > 0 && (
                <div>
                  <div className="section-rule mb-3" />
                  <div className="mt-3 mb-5">
                    <p className="eyebrow text-muted-foreground">
                      Guides — {results.guides.length} results
                    </p>
                  </div>
                  <div className="space-y-2">
                    {results.guides.map((g) => (
                      <Link
                        key={g.id}
                        href={`/guides/${g.id}`}
                        className="group flex items-center justify-between gap-4 border border-border bg-surface px-4 py-3 hover:border-primary transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="eyebrow text-primary">{g.category}</span>
                          <h3 className="mt-0.5 font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {g.title}
                          </h3>
                        </div>
                        <span className="eyebrow text-muted-foreground shrink-0">{g.readingTime}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {totalCount === 0 && q && (
                <div className="py-16 text-center">
                  <p className="font-display text-xl font-bold text-muted-foreground">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different search term or browse by category above.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Header />
          <div className="shell py-20 text-center text-muted-foreground eyebrow">
            Loading search results…
          </div>
          <Footer />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
