import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { FindYourUniversity } from "@/components/home/FindYourUniversity";
import { AdBanner } from "@/components/editorial/AdComponents";

export const metadata: Metadata = {
  title: "Universities — Search & Compare Global Universities",
  description:
    "Search and compare universities worldwide by country, course, ranking and tuition. Find your perfect university match.",
};

export default function UniversitiesPage() {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 min-w-0 w-full max-w-full overflow-x-clip">
      <Header />
      <main className="min-w-0">
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5 min-w-0">
            <p className="eyebrow text-primary">University Discovery</p>
            <h1 className="mt-1 font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground break-words">
              Find Your University
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Search and compare universities across eight countries. Filter by course,
              ranking, tuition and intake to find your perfect match.
            </p>
          </div>
        </div>

        {/* Top ad */}
        <div className="border-b border-border">
          <div className="shell py-3 min-w-0">
            <AdBanner slot="universities-listing-top" format="leaderboard" />
          </div>
        </div>

        {/* University discovery with filters */}
        <FindYourUniversity />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
