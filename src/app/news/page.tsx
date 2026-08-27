import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { NewsCard } from "@/components/cards/NewsCards";
import { AdBanner } from "@/components/editorial/AdComponents";
import { getAllNews } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Study Abroad News — Universities, Scholarships, Visa & Admissions",
  description:
    "Daily coverage of universities, scholarships, visa policy and admissions news for international students.",
};

const PAGE_SIZE = 10;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function NewsPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawPage = parseInt(params.page || "1", 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const news = await getAllNews();
  const totalArticles = news.length;
  const totalPages = Math.max(1, Math.ceil(totalArticles / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Paginate articles
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageArticles = news.slice(startIndex, startIndex + PAGE_SIZE);

  // On page 1, show top story as lead feature; on later pages, show full grid
  const isFirstPage = safePage === 1;
  const featured = isFirstPage ? pageArticles[0] : null;
  const gridStories = isFirstPage ? pageArticles.slice(1) : pageArticles;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5">
            <p className="eyebrow text-primary">News & Updates</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Study Abroad News
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Daily coverage of universities, scholarships, visa policy and admissions for international students.
            </p>
          </div>
        </div>

        {/* Ad — news listing top */}
        <div className="border-b border-border bg-background">
          <div className="shell py-3">
            <AdBanner slot="news-listing-top" format="leaderboard" />
          </div>
        </div>

        {/* Main content */}
        <div className="shell py-10 lg:py-14">
          {totalArticles === 0 ? (
            <div className="py-20 text-center border border-dashed border-border rounded-lg bg-surface">
              <span aria-hidden className="mx-auto mb-3 block text-5xl text-muted-foreground/40">&#128240;</span>
              <p className="font-display text-xl font-bold text-foreground">No news articles published yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back soon or publish articles from the Admin panel.
              </p>
            </div>
          ) : (
            <>
              {/* 1. TOP FEATURED SECTION (Page 1 only: Lead Story + Most Read side-by-side) */}
              {isFirstPage && featured && (
                <div className="grid gap-8 lg:grid-cols-12 mb-12 pb-12 border-b border-border">
                  {/* Lead Story (8 cols) */}
                  <div className="lg:col-span-8">
                    <div className="section-rule mb-3" />
                    <p className="eyebrow text-muted-foreground mb-3">Lead Story</p>
                    <NewsCard article={featured} variant="featured" />
                  </div>

                  {/* Most Read + Topics Sidebar (4 cols) */}
                  <aside className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8 flex flex-col justify-between">
                    <div>
                      <div className="section-rule mb-3" />
                      <h2 className="font-display text-xl font-extrabold text-foreground mt-3">Most Read</h2>
                      <div className="mt-4 divide-y divide-border">
                        {news.slice(0, 4).map((article, i) => (
                          <Link
                            key={article.id}
                            href={`/news/${article.slug}`}
                            className="group grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 py-3"
                          >
                            <span className="font-display text-base font-extrabold text-border tabular-nums">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <span className="eyebrow text-primary">{article.category}</span>
                              <p className="mt-0.5 text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {article.headline}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-border">
                      <h3 className="font-display text-sm font-extrabold text-foreground mb-3">Explore Topics</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {["Canada", "UK", "Australia", "Germany", "Scholarships", "Visa", "Admissions"].map((topic) => (
                          <span
                            key={topic}
                            className="border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer rounded-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              )}

              {/* 2. FULL-WIDTH 3-COLUMN NEWS GRID (Fills all space cleanly) */}
              <div>
                <div className="section-rule mb-3" />
                <div className="flex items-center justify-between mb-6">
                  <p className="eyebrow text-muted-foreground">
                    {isFirstPage ? "Latest Stories" : `All Stories · Page ${safePage} of ${totalPages}`}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Showing {startIndex + 1}–{Math.min(startIndex + pageArticles.length, totalArticles)} of {totalArticles} articles
                  </span>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {gridStories.map((article, index) => (
                    <Fragment key={article.id}>
                      <NewsCard article={article} />
                      {/* Inject banner ad after 6th story if present */}
                      {index === 5 && (
                        <div className="sm:col-span-2 lg:col-span-3 py-2">
                          <AdBanner slot="news-listing-between-stories" format="native-article" />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>

                {/* 3. PAGINATION BAR */}
                {totalPages > 1 && (
                  <nav
                    aria-label="News pagination"
                    className="mt-14 pt-8 border-t border-border flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="text-xs text-muted-foreground">
                      Page <span className="font-semibold text-foreground">{safePage}</span> of{" "}
                      <span className="font-semibold text-foreground">{totalPages}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* First Page */}
                      <Link
                        href={safePage > 1 ? `/news?page=1` : "#"}
                        aria-disabled={safePage <= 1}
                        className={`p-2 rounded-md border border-border transition-colors ${
                          safePage <= 1
                            ? "opacity-30 pointer-events-none text-muted-foreground"
                            : "text-foreground hover:border-primary hover:text-primary bg-background"
                        }`}
                        title="First Page"
                      >
                        <span aria-hidden className="text-base">&laquo;</span>
                      </Link>

                      {/* Previous Page */}
                      <Link
                        href={safePage > 1 ? `/news?page=${safePage - 1}` : "#"}
                        aria-disabled={safePage <= 1}
                        className={`p-2 rounded-md border border-border transition-colors ${
                          safePage <= 1
                            ? "opacity-30 pointer-events-none text-muted-foreground"
                            : "text-foreground hover:border-primary hover:text-primary bg-background"
                        }`}
                        title="Previous Page"
                      >
                        <span aria-hidden className="text-base">&lsaquo;</span>
                      </Link>

                      {/* Numbered Page Buttons */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground select-none">
                              …
                            </span>
                          ) : (
                            <Link
                              key={p}
                              href={`/news?page=${p}`}
                              className={`min-w-[34px] h-9 px-2.5 inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                                safePage === p
                                  ? "bg-primary text-primary-foreground pointer-events-none shadow-xs"
                                  : "border border-border text-foreground hover:border-primary hover:text-primary bg-background"
                              }`}
                            >
                              {p}
                            </Link>
                          )
                        )}

                      {/* Next Page */}
                      <Link
                        href={safePage < totalPages ? `/news?page=${safePage + 1}` : "#"}
                        aria-disabled={safePage >= totalPages}
                        className={`p-2 rounded-md border border-border transition-colors ${
                          safePage >= totalPages
                            ? "opacity-30 pointer-events-none text-muted-foreground"
                            : "text-foreground hover:border-primary hover:text-primary bg-background"
                        }`}
                        title="Next Page"
                      >
                        <span aria-hidden className="text-base">&rsaquo;</span>
                      </Link>

                      {/* Last Page */}
                      <Link
                        href={safePage < totalPages ? `/news?page=${totalPages}` : "#"}
                        aria-disabled={safePage >= totalPages}
                        className={`p-2 rounded-md border border-border transition-colors ${
                          safePage >= totalPages
                            ? "opacity-30 pointer-events-none text-muted-foreground"
                            : "text-foreground hover:border-primary hover:text-primary bg-background"
                        }`}
                        title="Last Page"
                      >
                        <span aria-hidden className="text-base">&raquo;</span>
                      </Link>
                    </div>
                  </nav>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}


