import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { NewsCard } from "@/components/cards/NewsCards";
import { AdBanner } from "@/components/editorial/AdComponents";
import { news } from "@/data/mock";

export const metadata: Metadata = {
  title: "Study Abroad News — Universities, Scholarships, Visa & Admissions",
  description:
    "Daily coverage of universities, scholarships, visa policy and admissions news for international students.",
};

export default function NewsPage() {
  const [featured, ...rest] = news;

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-8 lg:py-10">
            <p className="eyebrow text-primary">News & Updates</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Study Abroad News
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
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
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Stories */}
            <div className="lg:col-span-8">
              {/* Featured story */}
              {featured && (
                <div className="border-b border-border pb-10 mb-10">
                  <div className="section-rule mb-3" />
                  <div className="mt-3">
                    <p className="eyebrow text-muted-foreground mb-3">Lead Story</p>
                  </div>
                  <NewsCard article={featured} variant="featured" />
                </div>
              )}

              {/* Grid of remaining stories */}
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <p className="eyebrow text-muted-foreground mb-6">Latest Stories</p>
              </div>
              <div className="grid gap-8 sm:grid-cols-2">
                {rest.map((article, index) => (
                  <Fragment key={article.id}>
                    <NewsCard article={article} />
                    {/* Inject ad after 4th story */}
                    {index === 3 && (
                      <div className="sm:col-span-2">
                        <AdBanner slot="news-listing-between-stories" format="native-article" />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8">
              {/* Most read */}
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h2 className="font-display text-xl font-extrabold text-foreground">Most Read</h2>
              </div>
              <div className="mt-4 divide-y divide-border">
                {news.slice(0, 5).map((article, i) => (
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
                      <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {article.headline}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Ad sidebar */}
              <div className="mt-8">
                <p className="ad-label mb-1.5 text-muted-foreground">Advertisement</p>
                <div className="flex h-[250px] items-center justify-center border border-dashed border-border bg-surface">
                  <span className="ad-label text-center text-muted-foreground/40">
                    Sidebar Ad<br />news-listing-sidebar
                  </span>
                </div>
              </div>

              {/* Topics */}
              <div className="mt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">Explore Topics</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Canada", "UK", "Australia", "Germany", "IELTS", "Scholarships", "Visa", "SOP", "Admissions"].map((topic) => (
                    <span
                      key={topic}
                      className="border border-border bg-surface px-3 py-1.5 eyebrow text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
                    >
                      {topic}
                    </span>
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
