import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import type { University } from "@/contracts/universities";
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

async function getUniversities(): Promise<University[]> {
  try {
    const rows = await prisma.university.findMany({
      include: { country: true },
      orderBy: { ranking: "asc" },
    });

    return rows.map((u) => ({
      id:           u.id,
      sourceId:     u.sourceId,
      slug:         u.slug,
      name:         u.name,
      initials:     u.initials,
      country:      u.country?.name ?? "",
      countryId:    u.countryId,
      city:         u.city,
      ranking:      u.ranking,
      tuition:      u.tuition,
      tuitionValue: u.tuitionValue,
      courses:      u.courses,
      scholarships: u.scholarships,
      intake:       u.intake,
      degree:       (u.degree === "Bachelors" || u.degree === "Masters" ? u.degree : "Both") as "Bachelors" | "Masters" | "Both",
      ielts:        u.ielts,
      qsRanking:                          u.qsRanking,
      usNewsRanking:                      u.usNewsRanking,
      webomatricsNationalRanking:         u.webomatricsNationalRanking,
      webomatricsWorldRanking:            u.webomatricsWorldRanking,
      universityLogoExtension:            u.universityLogoExtension,
      universityAverageScholarship:       u.universityAverageScholarship
        ? Number(u.universityAverageScholarship)
        : null,
      universityAverageScholarshipRemarks: u.universityAverageScholarshipRemarks,
    }));
  } catch (err) {
    console.error("[universities/page] Failed to fetch from DB:", err);
    return [];
  }
}

export default async function UniversitiesPage() {
  const universities = await getUniversities();

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
        <FindYourUniversity initialData={universities} showAll showHeading={false} />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

