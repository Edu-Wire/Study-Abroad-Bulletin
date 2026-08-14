import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { BookmarkButton } from "@/components/common/BookmarkButton";
import { CountryFlag } from "@/components/common/CountryFlag";
import { scholarships } from "@/data/mock";
import { AdSidebar } from "@/components/editorial/AdComponents";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = scholarships.find((s) => s.id === slug);
  if (!s) return { title: "Scholarship not found" };
  return {
    title: `${s.name} — ${s.organization}`,
    description: `${s.type} scholarship for ${s.degree} students in ${s.country}. Deadline: ${s.deadline}.`,
  };
}

export function generateStaticParams() {
  return scholarships.map((s) => ({ slug: s.id }));
}

export default async function ScholarshipDetailPage({ params }: Props) {
  const { slug } = await params;
  const s = scholarships.find((sc) => sc.id === slug);
  if (!s) notFound();

  const closingSoon = s.daysLeft <= 14;
  const related = scholarships.filter((sc) => sc.id !== s.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Scholarship header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-8 lg:py-10">
            <nav className="mb-5 flex items-center gap-2 eyebrow text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span>·</span>
              <Link href="/scholarships" className="hover:text-primary transition-colors">Scholarships</Link>
              <span>·</span>
              <span className="text-foreground">{s.name}</span>
            </nav>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={`eyebrow border px-2 py-0.5 ${s.type === "Fully Funded"
                        ? "border-success/25 bg-success-soft text-success"
                        : "border-border bg-surface text-muted-foreground"
                      }`}
                  >
                    {s.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <CountryFlag country={s.country} size="xs" />
                    <span className="eyebrow text-muted-foreground">{s.country}</span>
                  </div>
                  {closingSoon && (
                    <span className="eyebrow text-primary border border-primary/30 bg-primary-soft px-2 py-0.5">
                      Closing Soon
                    </span>
                  )}
                </div>
                <p className="eyebrow text-primary">Scholarship</p>
                <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {s.name}
                </h1>
                <p className="eyebrow mt-2 text-muted-foreground">{s.organization}</p>
              </div>
              <BookmarkButton label={`Save ${s.name}`} />
            </div>

            {/* Key facts bar */}
            <div className="mt-6 grid grid-cols-2 gap-0 border-t border-border pt-5 sm:grid-cols-4">
              {[
                { label: "Funding", value: s.funding },
                { label: "Degree", value: s.degree },
                { label: "Deadline", value: s.deadline },
                { label: "Days Remaining", value: `${s.daysLeft} days`, urgent: closingSoon },
              ].map(({ label, value, urgent }) => (
                <div key={label} className="border-r border-border pr-5 mr-5 last:border-r-0 last:mr-0 last:pr-0 pb-3 sm:pb-0">
                  <p className="eyebrow text-muted-foreground">{label}</p>
                  <p className={`mt-1 font-display text-lg font-bold ${urgent ? "text-primary" : "text-foreground"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main */}
            <div className="lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h2 className="font-display text-2xl font-extrabold text-foreground">Eligibility</h2>
              </div>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{s.eligibility}</p>
              <p className="mt-4 text-base leading-relaxed text-foreground">
                This is illustrative demo content. Full scholarship details will be populated
                from the official source when CMS integration is complete. Always verify
                eligibility directly with the awarding organisation.
              </p>

              <div className="mt-10">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Funding Details</h2>
                </div>
                <dl className="mt-5 divide-y divide-border">
                  {[
                    { label: "Total Funding", value: s.funding },
                    { label: "Award Type", value: s.type },
                    { label: "Degree Level", value: s.degree },
                    { label: "Country", value: s.country },
                    { label: "Organisation", value: s.organization },
                    { label: "Application Deadline", value: s.deadline },
                    { label: "Days Remaining", value: `${s.daysLeft} days`, urgent: closingSoon },
                  ].map(({ label, value, urgent }) => (
                    <div key={label} className="flex justify-between gap-6 py-3">
                      <dt className="eyebrow text-muted-foreground">{label}</dt>
                      <dd className={`text-sm font-semibold text-right ${urgent ? "text-primary" : "text-foreground"}`}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-10">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Application Process</h2>
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    "Review the eligibility criteria carefully before applying",
                    "Prepare all required supporting documents",
                    "Submit your application through the official portal",
                    "Track your application status regularly",
                    "Await the awarding organisation's decision",
                  ].map((step, i) => (
                    <div key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-border pb-4">
                      <span className="font-display text-xl font-extrabold text-border tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related scholarships */}
              <div className="mt-12 border-t border-border pt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Related Scholarships</h2>
                </div>
                <div className="mt-6 divide-y divide-border">
                  {related.map((rel) => (
                    <Link key={rel.id} href={`/scholarships/${rel.id}`} className="group flex items-start justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <span className="eyebrow text-muted-foreground">{rel.type} · {rel.country}</span>
                        <p className="mt-1 font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {rel.name}
                        </p>
                        <p className="eyebrow mt-1 text-muted-foreground">{rel.organization}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`eyebrow ${rel.daysLeft <= 14 ? "text-primary" : "text-muted-foreground"}`}>
                          {rel.daysLeft} days
                        </p>
                        <p className="text-xs text-muted-foreground">{rel.deadline}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 lg:pl-8">
              {/* Apply CTA */}
              <div className="border border-border bg-navy p-6">
                <p className="eyebrow text-primary mb-2">Apply Now</p>
                <h3 className="font-display text-lg font-extrabold text-navy-foreground leading-tight">
                  {s.name}
                </h3>
                <p className="eyebrow mt-1 text-navy-foreground/60">{s.organization}</p>
                <dl className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <dt className="eyebrow text-navy-foreground/60">Funding</dt>
                    <dd className="text-xs font-semibold text-navy-foreground text-right">{s.funding}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="eyebrow text-navy-foreground/60">Deadline</dt>
                    <dd className={`text-xs font-semibold text-right ${closingSoon ? "text-primary" : "text-navy-foreground"}`}>
                      {s.deadline}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="eyebrow text-navy-foreground/60">Days Left</dt>
                    <dd className={`font-display text-lg font-bold ${closingSoon ? "text-primary" : "text-navy-foreground"}`}>
                      {s.daysLeft}
                    </dd>
                  </div>
                </dl>
                <a
                  href="#"
                  className="mt-5 flex h-11 items-center justify-center bg-primary eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Apply Now →
                </a>
              </div>

              {/* Ad */}
              <div className="mt-8">
                <AdSidebar slot="scholarship-detail-sidebar" format="rectangle" />
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
