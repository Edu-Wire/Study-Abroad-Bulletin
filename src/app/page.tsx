import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { NewsletterCard } from "@/components/common/NewsletterCard";
import {
  BreakingStrip,
  ExploreDestinations,
  ScholarshipSpotlight,
  VisaUpdatesSection,
  GuidesSection,
  UpcomingDeadlines,
  ImmigrationTrackerSpotlight,
  ConsultantsSpotlight,
} from "@/components/home/ServerSections";
import { HomePersonalizedFeed } from "@/components/home/HomePersonalizedFeed";
import { UniversitiesPersonalizedWrapper } from "@/components/universities/UniversitiesPersonalizedWrapper";
import { AdBanner } from "@/components/editorial/AdComponents";
import { getAllNews, getBreakingArticle, getPublishedGuides, getPublishedVisaUpdates, getRecentArticleCount } from "@/lib/articles";
import { getUniversities, toFrontendUniversity } from "@/lib/server/universities";
import { getScholarships, toFrontendScholarship } from "@/lib/server/scholarships";
import { getCountries } from "@/lib/server/countries";
import { PersonalizedBanner } from "@/components/home/PersonalizedBanner";

export const metadata: Metadata = {
  title: "Study Abroad Intelligence — Universities, Scholarships & Visa News",
  description:
    "Discover universities, scholarships, visa updates and the latest study-abroad news for international students — all in one editorial platform.",
  openGraph: {
    title: "Study Abroad Intelligence — Universities, Scholarships & Visa News",
    description:
      "Discover universities, scholarships, visa updates and the latest study-abroad news for international students.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Study Abroad Intelligence",
    description:
      "Discover universities, scholarships, visa updates and study-abroad news.",
  },
};

// Force dynamic rendering so admin article changes appear immediately
// without waiting for a Next.js rebuild or cache revalidation.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch once at the page level; pass as props to server components below.
  const [articles, breakingArticle, apiUniversities, apiScholarships, visaUpdates, guides, apiCountries, updatesThisWeek] = await Promise.all([
    getAllNews(),
    getBreakingArticle(),
    getUniversities(),
    getScholarships(),
    getPublishedVisaUpdates(),
    getPublishedGuides(7),
    getCountries(),
    getRecentArticleCount(7),
  ]);
  const universities = apiUniversities.map(toFrontendUniversity);
  const scholarships = apiScholarships.map(toFrontendScholarship);
  const countries = apiCountries.map((c) => ({
    ...c,
    universities: c.universitiesCount,
    updates: c.updatesCount,
  }));

  const heroStats = {
    universities: universities.length,
    scholarships: scholarships.length,
    updatesThisWeek,
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 min-w-0 overflow-x-clip">
      <Header />
      {/* Personalized strip — visible only to logged-in students with a filled profile */}
      <PersonalizedBanner />
      <main className="min-w-0">
        {/* Breaking strip above hero — powered by PostgreSQL */}
        <BreakingStrip article={breakingArticle} />

        {/* Ad placement — homepage top */}
        <div className="border-b border-border bg-background">
          <div className="shell py-3 min-w-0">
            <AdBanner slot="homepage-top" format="leaderboard" />
          </div>
        </div>

        {/* Front page editorial news — dynamically personalized for logged-in students */}
        <HomePersonalizedFeed articles={articles} stats={heroStats} />

        {/* Explore Destinations */}
        <ExploreDestinations countries={countries} />

        {/* University discovery — personalized for student target country and study level */}
        <UniversitiesPersonalizedWrapper universities={universities} />

        {/* Ad between universities and scholarships */}
        <div className="border-b border-border bg-surface">
          <div className="shell py-4 min-w-0">
            <AdBanner slot="homepage-between-news-universities" format="leaderboard" />
          </div>
        </div>

        {/* Scholarships */}
        <ScholarshipSpotlight scholarships={scholarships} />

        {/* Visa updates */}
        <VisaUpdatesSection visaUpdates={visaUpdates} />

        {/* Immigration Tracker Feature Section */}
        <ImmigrationTrackerSpotlight />

        {/* Guides */}
        <GuidesSection guides={guides} />

        {/* Deadlines + Careers sidebar */}
        <UpcomingDeadlines />

        {/* Consultant & Agency Directory Feature Section */}
        <ConsultantsSpotlight />

        {/* Newsletter */}
        <section className="border-b border-border">
          <div className="shell py-8 sm:py-10 min-w-0">
            <NewsletterCard />
          </div>
        </section>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
