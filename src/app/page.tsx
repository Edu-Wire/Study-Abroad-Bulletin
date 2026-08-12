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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Breaking strip above hero */}
        <BreakingStrip />

        {/* Ad placement — homepage top */}
        <div className="border-b border-border bg-background">
          <div className="shell py-3">
            <AdBanner slot="homepage-top" format="leaderboard" />
          </div>
        </div>

        {/* Front page hero — newspaper style */}
        <Hero />

        {/* Today's Briefing */}
        <TodaysBriefing />

        {/* Ad between Briefing and Latest News */}
        <div className="border-b border-border bg-surface">
          <div className="shell py-4">
            <AdBanner slot="homepage-between-briefing-news" format="leaderboard" />
          </div>
        </div>

        {/* Latest News + sidebar */}
        <LatestNews />

        {/* Explore Destinations */}
        <ExploreDestinations />

        {/* University discovery */}
        <FindYourUniversity />

        {/* Ad between universities and scholarships */}
        <div className="border-b border-border bg-surface">
          <div className="shell py-4">
            <AdBanner slot="homepage-between-news-universities" format="leaderboard" />
          </div>
        </div>

        {/* Scholarships */}
        <ScholarshipSpotlight />

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
          <div className="shell py-10">
            <NewsletterCard />
          </div>
        </section>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
