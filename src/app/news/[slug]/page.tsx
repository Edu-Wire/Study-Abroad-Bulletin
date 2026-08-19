import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdSidebar, InlineAd } from "@/components/editorial/AdComponents";
import { ArticleShare } from "@/components/common/ArticleShare";
import { getArticleBySlug, getAllNews } from "@/lib/articles";

// Force dynamic so slugs added via admin are immediately accessible
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.headline,
    description: article.summary,
    openGraph: {
      title: article.headline,
      description: article.summary,
      type: "article",
      images: [{ url: article.image }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.headline,
      description: article.summary,
    },
  };
}

// generateStaticParams is intentionally omitted.
// This page is fully dynamic so that RSS articles arriving after deployment
// are served without requiring a rebuild.

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  // Fetch the article (PostgreSQL PUBLISHED has priority over RSS)
  const [article, allNews] = await Promise.all([
    getArticleBySlug(slug),
    getAllNews(),
  ]);
  if (!article) notFound();

  const related = allNews.filter((a) => a.slug !== slug).slice(0, 3);
  const trending = allNews.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        <div className="shell py-10 lg:py-14">
          <div className="grid gap-0 lg:grid-cols-12">
            {/* Article body — 8 cols */}
            <article className="min-w-0 lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
              {/* Breadcrumb */}
              <nav className="mb-6 flex items-center gap-2 eyebrow text-muted-foreground">
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                <span>·</span>
                <Link href="/news" className="hover:text-primary transition-colors">News</Link>
                <span>·</span>
                <span className="text-foreground">{article.category}</span>
              </nav>

              {/* Article header */}
              <header>
                <div className="flex flex-wrap items-center gap-2">
                  {article.breaking && (
                    <span className="eyebrow border border-primary/30 bg-primary-soft text-primary px-2 py-0.5">
                      Breaking
                    </span>
                  )}
                  <span className="eyebrow text-primary">{article.category}</span>
                  <span className="text-border">·</span>
                  <div className="flex items-center gap-1">
                    {article.country !== "Global" && (
                      <CountryFlag country={article.country} size="xs" />
                    )}
                    <span className="eyebrow text-muted-foreground">{article.country}</span>
                  </div>
                </div>

                <h1 className="mt-4 font-display text-3xl leading-tight font-extrabold text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.1]">
                  {article.headline}
                </h1>

                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  {article.summary}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="eyebrow text-muted-foreground">
                      {article.isRss ? article.sourceName : "By Editorial Team"}
                    </p>
                    <span className="text-border">·</span>
                    <p className="eyebrow text-muted-foreground">{article.date}</p>
                    <span className="text-border">·</span>
                    <p className="eyebrow text-muted-foreground">{article.readingTime}</p>
                  </div>
                  <ArticleShare title={article.headline} />
                </div>
              </header>

              {/* Hero image */}
              <div className="mt-8 overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.headline}
                  width={1280}
                  height={720}
                  priority
                  className="aspect-[16/9] w-full object-cover"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Illustrative editorial image · Study Abroad Intelligence
                </p>
              </div>

              {/* Article body */}
              {article.isRss ? (
                /* RSS article: show real summary + clear source attribution */
                <div className="mt-8">
                  <div className="article-prose">
                    <p>{article.summary}</p>
                  </div>

                  {/* Source attribution block */}
                  <div className="mt-8 border border-border bg-surface p-6">
                    <p className="eyebrow text-muted-foreground mb-1">Original Source</p>
                    <p className="font-semibold text-foreground">{article.sourceName}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This article is sourced from the official IRCC government feed.
                      The summary above is provided by the original source.
                      Read the full article on the official IRCC website.
                    </p>
                    {article.sourceUrl && (
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 border border-primary px-4 py-2 eyebrow text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        Read original source →
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                /* Mock article: existing demo prose — unchanged */
                <div className="article-prose mt-8">
                  <p>
                    {article.summary} This represents the opening paragraph of the full
                    editorial article, which would be populated from the CMS when integrated.
                  </p>

                  <p>
                    The study-abroad landscape continues to evolve rapidly, with new policy
                    changes, scholarship opportunities, and university updates emerging
                    regularly across all major destinations. Students and education professionals
                    are closely monitoring these developments to make informed decisions.
                  </p>

                  <h2>Key Developments</h2>
                  <p>
                    International student numbers have continued to grow year-on-year, with
                    demand concentrated in English-speaking destinations, Germany, and the
                    Netherlands. Institutions are responding by expanding their international
                    admission pathways.
                  </p>

                  <p>
                    Policy makers and institutions alike are working to ensure that processes
                    remain accessible for qualified applicants while maintaining academic
                    standards and regulatory compliance.
                  </p>

                  <blockquote className="pull-quote my-8">
                    &ldquo;Students are encouraged to verify all information with official
                    sources before making decisions regarding their international education
                    journey.&rdquo;
                  </blockquote>

                  <p>
                    For the most up-to-date information, applicants should consult the official
                    portals of their target institutions and the relevant immigration
                    authorities. Study Abroad Intelligence provides editorial coverage as an
                    independent information resource.
                  </p>

                  <h2>What This Means for Students</h2>
                  <p>
                    Students currently in the application process, or planning to apply for
                    the upcoming intake, should review the updated requirements carefully.
                    Preparation timelines may need to be adjusted based on these changes.
                  </p>

                  <ul>
                    <li>Review updated eligibility criteria for your target programme</li>
                    <li>Check deadlines with official university admissions offices</li>
                    <li>Ensure financial documentation is current and accurate</li>
                    <li>Allow additional processing time where applicable</li>
                  </ul>

                  <p>
                    Additional coverage of this story will be published as further details
                    become available. This is demo content for editorial interface preview.
                    Full articles will be populated when the CMS integration is complete.
                  </p>
                </div>
              )}

              {/* Inline ad */}
              <InlineAd slot="article-inline-01" />

              {/* Tags */}
              <div className="mt-8 border-t border-border pt-6">
                <p className="eyebrow text-muted-foreground mb-3">Topics</p>
                <div className="flex flex-wrap gap-2">
                  {[article.category, article.country, "Study Abroad", "International Students"].map((tag) => (
                    <span
                      key={tag}
                      className="border border-border bg-surface px-3 py-1.5 eyebrow text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Related stories */}
              <div className="mt-12 border-t border-border pt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Related Stories</h2>
                </div>
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  {related.map((rel) => (
                    <article key={rel.id} className="group border-t-2 border-foreground pt-4 hover:border-primary transition-colors">
                      <Link href={`/news/${rel.slug}`} className="block overflow-hidden mb-3">
                        <Image
                          src={rel.image}
                          alt={rel.headline}
                          width={640}
                          height={400}
                          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </Link>
                      <span className="eyebrow text-primary">{rel.category}</span>
                      <h3 className="mt-2 font-display text-base font-bold text-foreground leading-snug">
                        <Link href={`/news/${rel.slug}`} className="headline-link">
                          {rel.headline}
                        </Link>
                      </h3>
                      <p className="meta mt-2 text-muted-foreground">{rel.date}</p>
                    </article>
                  ))}
                </div>
              </div>
            </article>

            {/* Sidebar — 4 cols */}
            <aside className="mt-10 lg:col-span-4 lg:mt-0 lg:pl-8">
              {/* Ad */}
              <AdSidebar slot="article-sidebar-top" format="rectangle" />

              {/* Most Read */}
              <div className="mt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">Most Read</h3>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {trending.map((a, i) => (
                    <Link
                      key={a.id}
                      href={`/news/${a.slug}`}
                      className="group grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 py-3"
                    >
                      <span className="font-display text-base font-extrabold text-border tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <span className="eyebrow text-primary">{a.category}</span>
                        <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {a.headline}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Second sidebar ad */}
              <div className="mt-8">
                <AdSidebar slot="article-sidebar-mid" format="rectangle" />
              </div>

              {/* Newsletter CTA */}
              <div className="mt-8 border border-border bg-navy p-6">
                <p className="eyebrow text-primary mb-2">Newsletter</p>
                <h3 className="font-display text-xl font-extrabold text-navy-foreground">
                  Get the weekly briefing.
                </h3>
                <p className="mt-2 text-sm text-navy-foreground/65">
                  Universities, scholarships and visa updates every week.
                </p>
                <form className="mt-4 flex flex-col gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Your email"
                    className="h-10 w-full border border-white/15 bg-white/5 px-3 text-sm text-navy-foreground placeholder:text-navy-foreground/40 outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="h-10 bg-primary eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Subscribe →
                  </button>
                </form>
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
