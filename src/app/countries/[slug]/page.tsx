import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { prisma } from "@/lib/prisma";
import { consultants } from "@/data/consultants";
import { NewsCard } from "@/components/cards/NewsCards";
import { UniversityCard } from "@/components/cards/UniversityCard";
import { ScholarshipCard } from "@/components/cards/ScholarshipCard";
import { DeadlineTrackerCard } from "@/components/cards/DeadlineTrackerCard";
import { ConsultantCard } from "@/components/cards/ConsultantCard";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdBanner, InlineAd } from "@/components/editorial/AdComponents";
import { getPublishedArticlesByCountry } from "@/lib/articles";
import type { ImmigrationDeadline } from "@/data/immigrationDeadlines";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const country = await prisma.country.findUnique({ where: { id: slug } });
  if (!country) return { title: "Country not found" };
  return {
    title: `Study in ${country.name} — Universities, Scholarships & Visa`,
    description: `Everything international students need to know about studying in ${country.name}. ${country.universitiesCount} universities, avg. tuition ${country.averageTuition}.`,
  };
}

const countryImages: Record<string, string> = {
  canada: "/images/news-canada-hero.jpg",
  uk: "/images/news-uk.jpg",
  usa: "/images/news-library.jpg",
  australia: "/images/news-australia.jpg",
  germany: "/images/news-germany.jpg",
  ireland: "/images/news-uk.jpg",
  netherlands: "/images/news-germany.jpg",
  france: "/images/news-library.jpg",
};

export default async function CountryDetailPage({ params }: Props) {
  const { slug } = await params;
  const country = await prisma.country.findUnique({
    where: { id: slug },
    include: {
      universities: true,
      immigrationDeadlines: true,
      scholarships: {
        include: {
          scholarship: true,
        },
      },
    },
  });

  if (!country) notFound();

  const countryUniversities = country.universities.map((u) => ({
    id: u.slug,
    name: u.name,
    initials: u.initials,
    country: country.name,
    city: u.city,
    ranking: u.ranking,
    tuition: u.tuition,
    tuitionValue: u.tuitionValue,
    courses: u.courses,
    scholarships: u.scholarships,
    intake: u.intake,
    degree: (u.degree as "Bachelors" | "Masters" | "Both") || "Both",
    ielts: u.ielts,
  }));

  // Database-level query: only fetch published articles belonging to this country
  const countryNews = await getPublishedArticlesByCountry(country.id);

  const countryScholarships = country.scholarships.map((s) => ({
    id: s.scholarship.slug,
    name: s.scholarship.name,
    organization: s.scholarship.organization,
    country: country.name,
    funding: s.scholarship.funding,
    degree: s.scholarship.degree,
    deadline: s.scholarship.deadlineString,
    daysLeft: 30,
    eligibility: s.scholarship.eligibility,
    type: (s.scholarship.type === "FULLY_FUNDED" ? "Fully Funded" : s.scholarship.type === "PARTIAL" ? "Partial" : "Tuition Waiver") as any,
  }));

  const countryDeadlines: ImmigrationDeadline[] = country.immigrationDeadlines.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    country: country.name,
    countryCode: country.code,
    deadline: d.deadlineDate.toISOString().split("T")[0],
    deadlineType: (d.deadlineType === "VISA" ? "Visa" : d.deadlineType === "IMMIGRATION" ? "Immigration" : d.deadlineType === "POLICY" ? "Policy" : d.deadlineType === "APPLICATION" ? "Application" : "Registration") as any,
    status: (d.status === "CLOSING_SOON" ? "Closing Soon" : d.status === "UPCOMING" ? "Upcoming" : d.status === "UPDATED" ? "Updated" : "Passed") as any,
    importance: (d.importance === "CRITICAL" ? "Critical" : d.importance === "HIGH" ? "High" : "Medium") as any,
    description: d.description,
    source: d.source,
    lastUpdated: d.lastUpdated,
    tags: d.tags,
    applicationUrl: d.applicationUrl || undefined,
    content: d.content || undefined,
  }));

  const countryConsultants = consultants.filter((c) => c.destinations.includes(country.name) || c.country === country.name);
  const heroImage = countryImages[slug] ?? "/images/hero-campus.jpg";

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Country hero */}
        <div className="relative overflow-hidden border-b border-border">
          <Image
            src={heroImage}
            alt={`Study in ${country.name}`}
            width={1920}
            height={500}
            priority
            className="h-[280px] w-full object-cover lg:h-[360px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="shell pb-8 pt-4">
              <div className="flex items-end gap-4">
                <CountryFlag country={country.name} size="xl" className="mb-1" />
                <div>
                  <p className="eyebrow text-white/70">Study Destination</p>
                  <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                    Study in {country.name}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-b border-border bg-background">
          <div className="shell">
            <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
              {[
                { label: "Universities", value: country.universitiesCount },
                { label: "Avg. Tuition / yr", value: country.averageTuition },
                { label: "Main Intake", value: country.popularIntake },
                { label: "Monthly Updates", value: country.updatesCount },
              ].map(({ label, value }) => (
                <div key={label} className="border-r border-border px-5 py-4 last:border-r-0">
                  <p className="eyebrow text-muted-foreground">{label}</p>
                  <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top ad */}
        <div className="border-b border-border">
          <div className="shell py-3">
            <AdBanner slot="country-detail-inline-01" format="leaderboard" />
          </div>
        </div>

        <div className="shell py-10 lg:py-14">
          {/* Why study here */}
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h2 className="font-display text-2xl font-extrabold text-foreground">
                  Why Study in {country.name}?
                </h2>
              </div>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {country.name} is one of the most popular study-abroad destinations for
                international students, offering a high quality of education, diverse campus
                communities and strong post-study career pathways.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                This is illustrative editorial content. When CMS integration is complete,
                full destination intelligence will be available for each country.
              </p>

              {/* Quick facts */}
              <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6">
                {[
                  { label: "Universities Listed", value: String(country.universities) },
                  { label: "Avg Annual Tuition", value: country.averageTuition },
                  { label: "Popular Intake", value: country.popularIntake },
                  { label: "Cost of Living", value: "Moderate–High" },
                ].map(({ label, value }) => (
                  <div key={label} className="border-t-2 border-foreground pt-3">
                    <dt className="eyebrow text-muted-foreground">{label}</dt>
                    <dd className="mt-1 font-display text-lg font-bold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Sidebar quick links */}
            <div className="lg:col-span-4 lg:pl-8">
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h3 className="font-display text-xl font-extrabold text-foreground">Quick Links</h3>
              </div>
              <div className="mt-4 divide-y divide-border">
                {[
                  { label: `Universities in ${country.name}`, href: "/universities" },
                  { label: `Scholarships for ${country.name}`, href: "/scholarships" },
                  { label: `${country.name} Visa Guide`, href: "/visa" },
                  { label: `${country.name} Immigration Tracker`, href: "/immigration-tracker" },
                  { label: `Education Consultants for ${country.name}`, href: "/consultants" },
                ].map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group flex items-center justify-between py-3.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    <span>{label}</span>
                    <span className="text-border group-hover:text-primary">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Universities */}
          {countryUniversities.length > 0 && (
            <div className="mt-12">
              <SectionHeading
                eyebrow="University Discovery"
                title={`Universities in ${country.name}`}
                action="All universities"
                actionHref="/universities"
              />
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {countryUniversities.map((uni) => (
                  <UniversityCard key={uni.id} university={uni} />
                ))}
              </div>
            </div>
          )}

          {/* Immigration Deadlines */}
          {countryDeadlines.length > 0 && (
            <div className="mt-12 border-t border-border pt-10">
              <SectionHeading
                eyebrow="Immigration Intelligence"
                title={`Immigration Deadlines for ${country.name}`}
                action="All Tracker Dates"
                actionHref="/immigration-tracker"
              />
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {countryDeadlines.map((d) => (
                  <DeadlineTrackerCard key={d.id} deadline={d} />
                ))}
              </div>
            </div>
          )}

          {/* Inline ad */}
          <InlineAd slot="country-detail-inline-02" />

          {/* Scholarships */}
          {countryScholarships.length > 0 && (
            <div className="mt-8">
              <SectionHeading
                eyebrow="Funding"
                title={`Scholarships for ${country.name}`}
                action="All scholarships"
                actionHref="/scholarships"
              />
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {countryScholarships.map((s) => (
                  <ScholarshipCard key={s.id} scholarship={s} />
                ))}
              </div>
            </div>
          )}

          {/* Consultants & Agencies for Country */}
          {countryConsultants.length > 0 && (
            <div className="mt-12 border-t border-border pt-10">
              <SectionHeading
                eyebrow="Corporate Directory"
                title={`Education Consultants & Service Providers for ${country.name}`}
                action="Full Directory"
                actionHref="/consultants"
              />
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {countryConsultants.slice(0, 2).map((c) => (
                  <ConsultantCard key={c.id} consultant={c} />
                ))}
              </div>
            </div>
          )}

          {/* Latest news */}
          <div className="mt-12 border-t border-border pt-10">
            <SectionHeading
              eyebrow={slug === "canada" || slug === "uk" ? "Live Government News" : "Editorial"}
              title={`Latest from ${country.name}`}
              action="All news"
              actionHref="/news"
            />
            {countryNews.length > 0 ? (
              <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {countryNews.slice(0, 6).map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded border border-border bg-surface px-6 py-10 text-center">
                <p className="font-display text-lg font-bold text-foreground">
                  {slug === "canada" || slug === "uk"
                    ? "Live news feed is currently unavailable."
                    : "No recent news for this destination."}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {slug === "canada" || slug === "uk"
                    ? "The official government feed could not be reached. Please try again later."
                    : "Check back soon for updates."}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
