import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BookmarkButton } from "@/components/common/BookmarkButton";
import { CountryFlag } from "@/components/common/CountryFlag";
import { universities, news } from "@/data/mock";
import { AdSidebar } from "@/components/editorial/AdComponents";
import { CompactNewsCard } from "@/components/cards/NewsCards";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const uni = universities.find((u) => u.id === slug);
  if (!uni) return { title: "University not found" };
  return {
    title: `${uni.name} — Rankings, Tuition & Admissions`,
    description: `${uni.name} in ${uni.city}, ${uni.country}. World rank #${uni.ranking}. Tuition: ${uni.tuition}.`,
  };
}

export function generateStaticParams() {
  return universities.map((u) => ({ slug: u.id }));
}

export default async function UniversityProfilePage({ params }: Props) {
  const { slug } = await params;
  const uni = universities.find((u) => u.id === slug);
  if (!uni) notFound();

  const relatedNews = news.filter((a) => a.country === uni.country).slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* University profile header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-8 lg:py-10">
            <nav className="mb-5 flex items-center gap-2 eyebrow text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span>·</span>
              <Link href="/universities" className="hover:text-primary transition-colors">Universities</Link>
              <span>·</span>
              <span className="text-foreground">{uni.name}</span>
            </nav>

            <div className="flex items-start gap-5">
              <span
                aria-hidden
                className="grid size-16 shrink-0 place-items-center bg-navy font-display text-xl font-bold text-navy-foreground"
              >
                {uni.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-primary">University Profile</p>
                <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {uni.name}
                </h1>
                <p className="eyebrow mt-2 text-muted-foreground flex items-center gap-1.5">
                  <CountryFlag country={uni.country} size="sm" />
                  <span>{uni.city}, {uni.country}</span>
                </p>
              </div>
              <BookmarkButton label={`Save ${uni.name}`} />
            </div>

            {/* Key stats bar */}
            <div className="mt-6 grid grid-cols-2 gap-0 border-t border-border pt-5 sm:grid-cols-4">
              {[
                { label: "World Rank", value: `#${uni.ranking}` },
                { label: "Annual Tuition", value: uni.tuition },
                { label: "IELTS Min", value: uni.ielts },
                { label: "Degree Types", value: uni.degree },
              ].map(({ label, value }) => (
                <div key={label} className="border-r border-border pr-5 mr-5 last:border-r-0 last:mr-0 last:pr-0 pb-3 sm:pb-0">
                  <p className="eyebrow text-muted-foreground">{label}</p>
                  <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Profile content */}
            <div className="lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
              {/* About */}
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h2 className="font-display text-2xl font-extrabold text-foreground">About</h2>
              </div>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {uni.name} is a leading research university based in {uni.city},{" "}
                {uni.country}. Ranked #{uni.ranking} in the world, it offers a range of
                programmes across {uni.courses.join(", ")} and related disciplines.
                This is illustrative demo content — full profiles will be populated via
                CMS integration.
              </p>

              {/* Popular courses */}
              <div className="mt-10">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Popular Programmes</h2>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {uni.courses.map((course) => (
                    <div key={course} className="border-t-2 border-foreground pt-3">
                      <p className="font-display text-base font-bold text-foreground">{course}</p>
                      <p className="eyebrow mt-1 text-muted-foreground">{uni.degree} · {uni.intake}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admissions */}
              <div className="mt-10">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Admissions</h2>
                </div>
                <dl className="mt-5 divide-y divide-border">
                  {[
                    { label: "World Ranking", value: `#${uni.ranking}` },
                    { label: "Annual Tuition", value: uni.tuition },
                    { label: "Next Intake", value: uni.intake },
                    { label: "IELTS Minimum", value: uni.ielts },
                    { label: "Degree Types", value: uni.degree },
                    { label: "Scholarships", value: uni.scholarships ? "Available for international students" : "Not currently available" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-6 py-3">
                      <dt className="eyebrow text-muted-foreground">{label}</dt>
                      <dd className="text-sm font-semibold text-foreground text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Related news */}
              {relatedNews.length > 0 && (
                <div className="mt-10">
                  <div className="section-rule mb-3" />
                  <div className="mt-3">
                    <h2 className="font-display text-2xl font-extrabold text-foreground">
                      Latest from {uni.country}
                    </h2>
                  </div>
                  <div className="mt-5 divide-y divide-border">
                    {relatedNews.map((article) => (
                      <CompactNewsCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 lg:pl-8">
              {/* CTA */}
              <div className="border border-border bg-navy p-6">
                <p className="eyebrow text-primary mb-2">Apply Now</p>
                <h3 className="font-display text-xl font-extrabold text-navy-foreground">
                  {uni.name}
                </h3>
                <p className="eyebrow mt-1 text-navy-foreground/60">{uni.intake}</p>
                <dl className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <dt className="eyebrow text-navy-foreground/60">Tuition</dt>
                    <dd className="text-sm font-semibold text-navy-foreground">{uni.tuition}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="eyebrow text-navy-foreground/60">Rank</dt>
                    <dd className="text-sm font-semibold text-navy-foreground">#{uni.ranking}</dd>
                  </div>
                </dl>
                <Link
                  href="/universities"
                  className="mt-5 flex h-11 items-center justify-center bg-primary eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Apply / More Info →
                </Link>
              </div>

              {/* Ad */}
              <div className="mt-8">
                <AdSidebar slot="university-detail-sidebar" format="rectangle" />
              </div>

              {/* More universities */}
              <div className="mt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">
                    More Universities
                  </h3>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {universities
                    .filter((u) => u.id !== uni.id)
                    .slice(0, 5)
                    .map((u) => (
                      <Link
                        key={u.id}
                        href={`/universities/${u.id}`}
                        className="group flex items-center justify-between py-3.5 gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {u.name}
                          </p>
                          <p className="eyebrow text-muted-foreground">{u.city}, {u.country}</p>
                        </div>
                        <span className="eyebrow text-muted-foreground shrink-0">#{u.ranking}</span>
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
