"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { news } from "@/data/mock";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CountryFlag } from "@/components/common/CountryFlag";

export function LatestNews() {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", "Visa", "Admissions", "Scholarships", "Universities", "Student Life", "Career"];

  const filtered = activeCategory === "All"
    ? news
    : news.filter((a) => a.category === activeCategory);

  const [leadArticle, ...rest] = filtered;

  return (
    <section className="border-b border-border bg-background">
      <div className="shell py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-12">

          {/* Main content — 8 cols */}
          <div className="lg:col-span-8">
            <SectionHeading
              title="Latest News"
              subtitle="The most recent study-abroad developments."
              action="All stories"
              actionHref="/news"
            />

            {/* Category filter tabs */}
            <div className="no-scrollbar mt-5 flex items-center gap-0 overflow-x-auto border-b border-border">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`eyebrow relative shrink-0 px-3.5 py-3 transition-colors hover:text-primary
                    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:transition-transform after:duration-200
                    ${activeCategory === cat
                      ? "text-primary after:scale-x-100"
                      : "text-muted-foreground after:scale-x-0 hover:after:scale-x-100"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Editorial news index */}
            <div className="mt-6">
              {/* Lead story with small thumbnail */}
              {leadArticle && (
                <article className="group grid grid-cols-[minmax(0,1fr)_120px] sm:grid-cols-[minmax(0,1fr)_160px] gap-5 border-b-2 border-foreground pb-5 mb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {leadArticle.breaking && (
                        <span className="eyebrow text-primary-foreground bg-primary px-2 py-0.5">Breaking</span>
                      )}
                      <span className="eyebrow text-primary">{leadArticle.category}</span>
                      <span className="text-border text-xs">·</span>
                      <div className="flex items-center gap-1">
                        <CountryFlag country={leadArticle.country} size="xs" />
                        <span className="eyebrow text-muted-foreground">{leadArticle.country}</span>
                      </div>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground leading-tight">
                      <Link href={`/news/${leadArticle.slug}`} className="headline-link">
                        {leadArticle.headline}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3">
                      {leadArticle.summary}
                    </p>
                    <p className="meta mt-3 text-muted-foreground">
                      {leadArticle.date}
                      <span className="mx-1.5 opacity-40">·</span>
                      {leadArticle.readingTime}
                    </p>
                  </div>
                  {/* Small controlled thumbnail */}
                  <Link href={`/news/${leadArticle.slug}`} className="block overflow-hidden self-start shrink-0">
                    <Image
                      src={leadArticle.image}
                      alt={leadArticle.headline}
                      width={320}
                      height={213}
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ aspectRatio: "3/2" }}
                    />
                  </Link>
                </article>
              )}

              {/* Compact numbered story rows — no images */}
              <div className="divide-y divide-border">
                {rest.slice(0, 7).map((article, i) => (
                  <article key={article.id} className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3.5">
                    <span className="font-display text-xl font-extrabold text-border leading-none mt-0.5 tabular-nums select-none">
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="eyebrow text-primary">{article.category}</span>
                        <span className="text-border text-xs">·</span>
                        <div className="flex items-center gap-1">
                          <CountryFlag country={article.country} size="xs" />
                          <span className="eyebrow text-muted-foreground">{article.country}</span>
                        </div>
                      </div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-foreground leading-snug">
                        <Link href={`/news/${article.slug}`} className="headline-link">
                          {article.headline}
                        </Link>
                      </h3>
                      <p className="meta mt-1 text-muted-foreground">
                        {article.date}
                        <span className="mx-1.5 opacity-40">·</span>
                        {article.readingTime}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <Link
                  href="/news"
                  className="eyebrow text-primary hover:text-foreground transition-colors"
                >
                  View all stories →
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar — Most Read + Trending — 4 cols */}
          <div className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8">

            {/* Most Read */}
            <div className="section-rule mb-3" />
            <div className="mt-3">
              <h3 className="font-display text-lg font-extrabold text-foreground">Most Read This Week</h3>
            </div>
            <div className="mt-4">
              {news.slice(0, 5).map((article, i) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-b border-border py-3.5"
                >
                  <span className="font-display text-base font-extrabold text-border leading-none mt-0.5 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <span className="eyebrow text-primary">{article.category}</span>
                    <p className="mt-1 text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {article.headline}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Trending topics */}
            <div className="mt-8">
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h3 className="font-display text-lg font-extrabold text-foreground">Trending Topics</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Canada Study Permit",
                  "UK Scholarships 2027",
                  "US Fall Applications",
                  "Germany Student Visa",
                  "IELTS Preparation",
                  "SOP Writing",
                  "Australia Work Rights",
                  "Computer Science",
                ].map((topic) => (
                  <Link
                    key={topic}
                    href="/search"
                    className="border border-border bg-surface px-3 py-1.5 eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </div>

            {/* Ad slot */}
            <div className="mt-8">
              <p className="ad-label mb-1.5 text-muted-foreground">Advertisement</p>
              <div className="flex h-[250px] items-center justify-center border border-dashed border-border bg-surface">
                <span className="ad-label text-center text-muted-foreground/40">
                  Sidebar Ad<br />300×250
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
