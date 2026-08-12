import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdSidebar, InlineAd } from "@/components/editorial/AdComponents";
import { immigrationDeadlines } from "@/data/immigrationDeadlines";
import { ArticleShare } from "@/components/common/ArticleShare";
import { Calendar, AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const deadline = immigrationDeadlines.find((d) => d.slug === slug);
  if (!deadline) return { title: "Deadline Not Found | Study Abroad Intelligence" };
  return {
    title: `${deadline.title} — ${deadline.country} Immigration Tracker`,
    description: deadline.description,
  };
}

export function generateStaticParams() {
  return immigrationDeadlines.map((d) => ({ slug: d.slug }));
}

export default async function ImmigrationDeadlineDetailPage({ params }: Props) {
  const { slug } = await params;
  const deadline = immigrationDeadlines.find((d) => d.slug === slug);
  if (!deadline) notFound();

  const formattedDeadlineDate = new Date(deadline.deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const relatedDeadlines = immigrationDeadlines
    .filter((d) => d.slug !== slug && (d.country === deadline.country || d.deadlineType === deadline.deadlineType))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Top Breadcrumb Header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-6">
            <nav className="flex items-center gap-2 eyebrow text-muted-foreground mb-4">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span>·</span>
              <Link href="/immigration-tracker" className="hover:text-primary transition-colors">Immigration Tracker</Link>
              <span>·</span>
              <span className="text-foreground">{deadline.country}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <CountryFlag country={deadline.country} size="sm" />
              <span className="eyebrow text-muted-foreground">{deadline.country}</span>
              <span className="text-border">·</span>
              <span className="eyebrow text-primary">{deadline.deadlineType}</span>
              <span className="text-border">·</span>
              <span className="eyebrow border border-primary/30 bg-primary-soft text-primary px-2 py-0.5">
                {deadline.status}
              </span>
            </div>

            <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl lg:text-5xl leading-tight">
              {deadline.title}
            </h1>

            {/* Byline & Share Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="eyebrow">Source: {deadline.source}</span>
                <span>·</span>
                <span className="eyebrow">Updated {deadline.lastUpdated}</span>
              </div>
              <ArticleShare title={deadline.title} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="shell py-10 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Left Content — 8 cols */}
            <article className="lg:col-span-8 lg:pr-10 lg:border-r lg:border-border">
              {/* Highlight Box */}
              <div className="border-l-4 border-primary bg-surface p-6 mb-8">
                <div className="flex items-center gap-2 text-primary eyebrow mb-2">
                  <Calendar className="size-4" />
                  <span>Key Target Date</span>
                </div>
                <p className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                  {formattedDeadlineDate}
                </p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {deadline.description}
                </p>
              </div>

              {/* What this means */}
              <div className="article-prose">
                <h2>What This Means for Students</h2>
                <p>{deadline.content}</p>

                <h2>Action Required</h2>
                <ul>
                  <li>Verify eligibility requirements with your educational institution.</li>
                  <li>Prepare certified documentation in advance of the deadline date.</li>
                  <li>Ensure financial accounts satisfy continuous holding periods.</li>
                  <li>Submit applications early to allow buffer time for official processing backlog.</li>
                </ul>

                {/* Important Advisory Callout */}
                <div className="my-8 border border-border bg-background p-5">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 eyebrow mb-2">
                    <AlertCircle className="size-4" />
                    <span>Editorial Advisory</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This immigration tracking entry is compiled for informational guidance purposes based on published regulations as of {deadline.lastUpdated}. Students should always verify specific rules on the official government portal before finalizing travel or application plans.
                  </p>
                </div>
              </div>

              {/* Official Source Link */}
              {deadline.applicationUrl && (
                <div className="mt-6 border-t border-border pt-5">
                  <a
                    href={deadline.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-border bg-surface px-4 py-2.5 eyebrow text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <span>Visit Official Portal ({deadline.source})</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              )}

              {/* Inline Ad */}
              <InlineAd slot="immigration-tracker-inline" />

              {/* Related Article */}
              {deadline.relatedArticle && (
                <div className="mt-8 border-t border-border pt-6">
                  <p className="eyebrow text-muted-foreground mb-2">Related Editorial News</p>
                  <Link
                    href={deadline.relatedArticle.href}
                    className="group block border border-border bg-surface p-4 hover:border-primary transition-colors"
                  >
                    <p className="font-display text-base font-bold text-foreground group-hover:text-primary">
                      {deadline.relatedArticle.title} →
                    </p>
                  </Link>
                </div>
              )}
            </article>

            {/* Sidebar — 4 cols */}
            <aside className="lg:col-span-4">
              {/* Country Hub Link Card */}
              <div className="border border-border bg-surface p-5 mb-8">
                <p className="eyebrow text-primary mb-1">Destination Intelligence</p>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Studying in {deadline.country}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Explore full university listings, scholarships, tuition costs and city guides for {deadline.country}.
                </p>
                <Link
                  href={`/countries/${deadline.country.toLowerCase().replace(/\s+/g, "-")}`}
                  className="mt-4 inline-flex items-center gap-1.5 bg-primary px-3.5 py-2 eyebrow text-primary-foreground text-xs hover:opacity-90 transition-opacity"
                >
                  <span>Explore {deadline.country} Hub</span>
                  <span>→</span>
                </Link>
              </div>

              {/* Sidebar Ad */}
              <AdSidebar slot="immigration-tracker-sidebar" format="rectangle" />

              {/* Related Deadlines */}
              {relatedDeadlines.length > 0 && (
                <div className="mt-8">
                  <div className="section-rule mb-3" />
                  <div className="mt-3">
                    <h3 className="font-display text-lg font-extrabold text-foreground">Other Deadlines</h3>
                  </div>
                  <div className="mt-4 divide-y divide-border">
                    {relatedDeadlines.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/immigration-tracker/${rel.slug}`}
                        className="group block py-3"
                      >
                        <span className="eyebrow text-primary text-xs">{rel.country} · {rel.deadlineType}</span>
                        <p className="mt-1 text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {rel.title}
                        </p>
                        <p className="eyebrow text-muted-foreground text-[0.6875rem] mt-1">{rel.deadline}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
