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
    <div className="min-h-screen bg-background pb-16 lg:pb-0 min-w-0 w-full max-w-full overflow-x-clip">
      <Header />
      <main className="min-w-0">
        {/* University profile header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-6 sm:py-8 lg:py-10 min-w-0">
            {/* Breadcrumbs — flexible wrap */}
            <nav className="mb-4 sm:mb-5 flex flex-wrap items-center gap-1.5 sm:gap-2 eyebrow text-muted-foreground min-w-0">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span>·</span>
              <Link href="/universities" className="hover:text-primary transition-colors">Universities</Link>
              <span>·</span>
              <span className="text-foreground truncate max-w-[200px] sm:max-w-none">{uni.name}</span>
            </nav>

            {/* Title & Info Block */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-5 min-w-0">
              <div className="flex items-start gap-3.5 sm:gap-5 min-w-0 flex-1">
                <span
                  aria-hidden
                  className="grid size-12 sm:size-16 shrink-0 place-items-center bg-navy font-display text-base sm:text-xl font-bold text-navy-foreground"
                >
                  {uni.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="eyebrow text-primary">University Profile</p>
                  <h1 className="mt-1 font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground break-words leading-tight">
                    {uni.name}
                  </h1>
                  <p className="eyebrow mt-2 text-muted-foreground flex items-center gap-1.5">
                    <CountryFlag country={uni.country} size="sm" />
                    <span>{uni.city}, {uni.country}</span>
                  </p>
                </div>
              </div>
              <div className="self-start sm:self-auto shrink-0">
                <BookmarkButton label={`Save ${uni.name}`} />
              </div>
            </div>

            {/* Key stats bar — clean responsive grid */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4 sm:gap-0 min-w-0">
              {[
                { label: "World Rank", value: `#${uni.ranking}` },
                { label: "Annual Tuition", value: uni.tuition },
                { label: "IELTS Min", value: uni.ielts },
                { label: "Degree Types", value: uni.degree },
              ].map(({ label, value }) => (
                <div key={label} className="min-w-0 sm:border-r sm:border-border sm:pr-5 sm:mr-5 last:sm:border-r-0 last:sm:mr-0 last:sm:pr-0">
                  <p className="eyebrow text-muted-foreground truncate">{label}</p>
                  <p className="mt-1 font-display text-lg sm:text-xl font-bold text-foreground truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="shell py-8 sm:py-10 lg:py-14 min-w-0">
          <div className="grid gap-8 lg:grid-cols-12 min-w-0">
            {/* Profile content */}
            <div className="min-w-0 lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
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
              <div className="mt-10 min-w-0">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Popular Programmes</h2>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 min-w-0">
                  {uni.courses.map((course) => (
                    <div key={course} className="border-t-2 border-foreground pt-3 min-w-0">
                      <p className="font-display text-base font-bold text-foreground truncate">{course}</p>
                      <p className="eyebrow mt-1 text-muted-foreground truncate">{uni.degree} · {uni.intake}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admissions */}
              <div className="mt-10 min-w-0">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Admissions</h2>
                </div>
                <dl className="mt-5 divide-y divide-border min-w-0">
                  {[
                    { label: "World Ranking", value: `#${uni.ranking}` },
                    { label: "Annual Tuition", value: uni.tuition },
                    { label: "Next Intake", value: uni.intake },
                    { label: "IELTS Minimum", value: uni.ielts },
                    { label: "Degree Types", value: uni.degree },
                    { label: "Scholarships", value: uni.scholarships ? "Available for international students" : "Not currently available" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-6 py-3 min-w-0">
                      <dt className="eyebrow text-muted-foreground">{label}</dt>
                      <dd className="text-sm font-semibold text-foreground sm:text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Related news */}
              {relatedNews.length > 0 && (
                <div className="mt-10 min-w-0">
                  <div className="section-rule mb-3" />
                  <div className="mt-3">
                    <h2 className="font-display text-2xl font-extrabold text-foreground">
                      Latest from {uni.country}
                    </h2>
                  </div>
                  <div className="mt-5 divide-y divide-border min-w-0">
                    {relatedNews.map((article) => (
                      <CompactNewsCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="min-w-0 lg:col-span-4 lg:pl-8">
              {/* CTA */}
              <div className="border border-border bg-navy p-5 sm:p-6 min-w-0">
                <p className="eyebrow text-primary mb-2">Apply Now</p>
                <h3 className="font-display text-xl font-extrabold text-navy-foreground">
                  {uni.name}
                </h3>
                <p className="eyebrow mt-1 text-navy-foreground/60">{uni.intake}</p>
                <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 min-w-0">
                  <div className="flex justify-between min-w-0">
                    <dt className="eyebrow text-navy-foreground/60">Tuition</dt>
                    <dd className="text-sm font-semibold text-navy-foreground">{uni.tuition}</dd>
                  </div>
                  <div className="flex justify-between min-w-0">
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
              <div className="mt-8 min-w-0">
                <AdSidebar slot="university-detail-sidebar" format="rectangle" />
              </div>

              {/* More universities */}
              <div className="mt-8 min-w-0">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">
                    More Universities
                  </h3>
                </div>
                <div className="mt-4 divide-y divide-border min-w-0">
                  {universities
                    .filter((u) => u.id !== uni.id)
                    .slice(0, 5)
                    .map((u) => (
                      <Link
                        key={u.id}
                        href={`/universities/${u.id}`}
                        className="group flex items-center justify-between py-3.5 gap-3 min-w-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {u.name}
                          </p>
                          <p className="eyebrow text-muted-foreground truncate">{u.city}, {u.country}</p>
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
