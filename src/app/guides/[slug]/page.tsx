import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { guides } from "@/data/mock";
import { AdSidebar, InlineAd } from "@/components/editorial/AdComponents";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides.find((g) => g.id === slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.title} — Study Abroad Guide`,
    description: guide.description,
  };
}

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.id }));
}

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find((g) => g.id === slug);
  if (!guide) notFound();

  const related = guides.filter((g) => g.id !== slug && g.category === guide.category).slice(0, 4);
  const moreGuides = guides.filter((g) => g.id !== slug).slice(0, 6);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        <article>
          {/* Guide header */}
          <header className="border-b border-border bg-background">
            <div className="shell py-8 lg:py-10">
              <nav className="mb-5 flex items-center gap-2 eyebrow text-muted-foreground">
                <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                <span>·</span>
                <Link href="/guides" className="hover:text-primary transition-colors">Guides</Link>
                <span>·</span>
                <span className="text-foreground">{guide.category}</span>
              </nav>

              <span className="eyebrow text-primary">{guide.category}</span>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                {guide.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {guide.description}
              </p>
              <p className="meta mt-4 text-muted-foreground">
                By Editorial Team
                <span className="mx-1.5 opacity-40">·</span>
                {guide.readingTime}
              </p>
            </div>
          </header>

          {/* Content */}
          <div className="shell py-10 lg:py-14">
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Article body */}
              <div className="min-w-0 lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
                <div className="article-prose">
                  <p>
                    {guide.description} This guide is demo editorial content. Full
                    step-by-step guidance will be available when the CMS integration
                    is complete. Use this as a framework and always verify requirements
                    with official sources.
                  </p>

                  <h2>Getting Started</h2>
                  <p>
                    The process begins well before your application deadline — ideally
                    12–18 months in advance for competitive programmes. Understand the
                    full timeline before you commit to specific targets.
                  </p>

                  <h2>Key Considerations</h2>
                  <p>
                    Every student's situation is different. Use this guide as a starting
                    framework and always verify requirements directly with the institutions
                    or authorities you are applying to.
                  </p>

                  <ul>
                    <li>Start early — timelines are longer than expected</li>
                    <li>Verify all requirements with official sources</li>
                    <li>Keep copies of all submitted documents</li>
                    <li>Track deadlines in a calendar</li>
                  </ul>

                  <h2>Expert Tips</h2>
                  <p>
                    International students who plan thoroughly and begin early have
                    consistently better outcomes. Use the resources available through
                    Study Abroad Intelligence to stay informed at every stage.
                  </p>

                  <blockquote>
                    Always verify information directly with official government and
                    institutional sources before making decisions.
                  </blockquote>
                </div>

                {/* Inline ad */}
                <InlineAd slot="guide-detail-inline-01" />

                {/* Table of Contents box */}
                <div className="mt-8 border border-border bg-surface p-5">
                  <p className="eyebrow text-muted-foreground mb-3">In This Guide</p>
                  <ul className="space-y-2">
                    {["Getting Started", "Key Considerations", "Expert Tips", "Common Mistakes", "Resources"].map((section) => (
                      <li key={section}>
                        <a href="#" className="text-sm text-foreground hover:text-primary transition-colors">
                          → {section}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Related guides in same category */}
                {related.length > 0 && (
                  <div className="mt-12 border-t border-border pt-8">
                    <div className="section-rule mb-3" />
                    <div className="mt-3">
                      <h2 className="font-display text-2xl font-extrabold text-foreground">
                        Related Guides
                      </h2>
                    </div>
                    <div className="mt-6 divide-y divide-border">
                      {related.map((g) => (
                        <Link
                          key={g.id}
                          href={`/guides/${g.id}`}
                          className="group flex items-start justify-between gap-4 py-4"
                        >
                          <div>
                            <span className="eyebrow text-primary">{g.category}</span>
                            <p className="mt-1 font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                              {g.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{g.description}</p>
                          </div>
                          <span className="eyebrow text-muted-foreground shrink-0">{g.readingTime}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="lg:col-span-4 lg:pl-8">
                {/* Guide details card */}
                <div className="border border-border bg-surface p-5">
                  <p className="eyebrow text-muted-foreground mb-4">Guide Details</p>
                  <dl className="divide-y divide-border">
                    <div className="flex justify-between py-2.5">
                      <dt className="eyebrow text-muted-foreground">Category</dt>
                      <dd className="text-sm font-semibold text-foreground">{guide.category}</dd>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <dt className="eyebrow text-muted-foreground">Reading Time</dt>
                      <dd className="text-sm font-semibold text-foreground">{guide.readingTime}</dd>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <dt className="eyebrow text-muted-foreground">Author</dt>
                      <dd className="text-sm font-semibold text-foreground">Editorial Team</dd>
                    </div>
                  </dl>
                </div>

                {/* Sidebar ad */}
                <div className="mt-8">
                  <AdSidebar slot="guide-detail-sidebar" format="rectangle" />
                </div>

                {/* More guides */}
                <div className="mt-8">
                  <div className="section-rule mb-3" />
                  <div className="mt-3">
                    <h3 className="font-display text-lg font-extrabold text-foreground">More Guides</h3>
                  </div>
                  <div className="mt-4 divide-y divide-border">
                    {moreGuides.map((g) => (
                      <Link
                        key={g.id}
                        href={`/guides/${g.id}`}
                        className="group flex items-center justify-between py-3 gap-3"
                      >
                        <div>
                          <span className="eyebrow text-primary">{g.category}</span>
                          <p className="mt-0.5 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {g.title}
                          </p>
                        </div>
                        <span className="eyebrow text-muted-foreground shrink-0">{g.readingTime}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </article>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
