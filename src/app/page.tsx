import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { NewsletterCard } from "@/components/common/NewsletterCard";
import {
  Hero,
  BreakingStrip,
  TodaysBriefing,
  ExploreDestinations,
  ScholarshipSpotlight,
  VisaUpdatesSection,
  GuidesSection,
  UpcomingDeadlines,
  ImmigrationTrackerSpotlight,
  ConsultantsSpotlight,
} from "@/components/home/ServerSections";
import { LatestNews } from "@/components/home/LatestNews";
import { FindYourUniversity } from "@/components/home/FindYourUniversity";
import { AdBanner } from "@/components/editorial/AdComponents";
import { getAllNews, getBreakingArticle } from "@/lib/articles";
import { getUniversities, toFrontendUniversity } from "@/lib/server/universities";
import { getScholarships, toFrontendScholarship } from "@/lib/server/scholarships";

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
  const [articles, breakingArticle, apiUniversities, apiScholarships] = await Promise.all([
    getAllNews(),
    getBreakingArticle(),
    getUniversities(),
    getScholarships(),
  ]);
  const universities = apiUniversities.map(toFrontendUniversity);
  const scholarships = apiScholarships.map(toFrontendScholarship);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 min-w-0 overflow-x-clip">
      <Header />
      <main className="min-w-0">
        {/* Breaking strip above hero — powered by PostgreSQL */}
        <BreakingStrip article={breakingArticle} />

        {/* Ad placement — homepage top */}
        <div className="border-b border-border bg-background">
          <div className="shell py-3 min-w-0">
            <AdBanner slot="homepage-top" format="leaderboard" />
          </div>
        </div>

        {/* Front page hero — newspaper style, uses DB articles */}
        <Hero articles={articles} />

        {/* Today's Briefing — uses DB articles */}
        <TodaysBriefing articles={articles} />

        {/* Ad between Briefing and Latest News */}
        <div className="border-b border-border bg-surface">
          <div className="shell py-4 min-w-0">
            <AdBanner slot="homepage-between-briefing-news" format="leaderboard" />
          </div>
        </div>

        {/* Latest News + sidebar — uses DB articles */}
        <LatestNews articles={articles} />

        {/* Explore Destinations */}
        <ExploreDestinations />

        {/* University discovery */}
        <FindYourUniversity universities={universities} />

        {/* Ad between universities and scholarships */}
        <div className="border-b border-border bg-surface">
          <div className="shell py-4 min-w-0">
            <AdBanner slot="homepage-between-news-universities" format="leaderboard" />
          </div>
        </div>

        {/* Scholarships */}
        <ScholarshipSpotlight scholarships={scholarships} />

        {/* Visa updates */}
        <VisaUpdatesSection />

        {/* Immigration Tracker Feature Section */}
        <ImmigrationTrackerSpotlight />

        {/* Guides */}
        <GuidesSection />

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
