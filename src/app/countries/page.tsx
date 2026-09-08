import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { CountryCard } from "@/components/cards/CountryCard";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdBanner } from "@/components/editorial/AdComponents";
import { getCountries } from "@/lib/server/countries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Study Destinations — Compare Countries for International Students",
  description:
    "Compare study destinations worldwide. Explore universities, tuition costs, visa information and intake dates for Canada, UK, USA, Australia, Germany and more.",
};

export default async function CountriesPage() {
  const countries = (await getCountries()).map((country) => ({
    ...country,
    universities: country.universitiesCount,
    updates: country.updatesCount,
  }));
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-4 lg:py-5">
            <p className="eyebrow text-primary">Destinations</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Explore Destinations
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Eight leading study-abroad destinations, compared on university count,
              tuition cost and popular intake periods.
            </p>
          </div>
        </div>

        {/* Top ad */}
        <div className="border-b border-border">
          <div className="shell py-3">
            <AdBanner slot="countries-listing-top" format="leaderboard" />
          </div>
        </div>

        <div className="shell py-10 lg:py-14">
          {/* Featured destinations — large grid */}
          <SectionHeading title="All Destinations" subtitle="Click any destination to explore universities, visa information, scholarships and costs." />

          {/* Asymmetric layout: first 2 large, rest 4-col */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {countries.slice(0, 2).map((country) => (
              <CountryCard key={country.id} country={country} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {countries.slice(2).map((country) => (
              <CountryCard key={country.id} country={country} />
            ))}
          </div>

          {/* Comparison table */}
          <div className="mt-12">
            <SectionHeading title="Quick Comparison" subtitle="Key facts across all eight destinations." />
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-foreground">
                    <th className="eyebrow text-left py-3 pr-6 text-muted-foreground">Destination</th>
                    <th className="eyebrow text-left py-3 pr-6 text-muted-foreground">Universities</th>
                    <th className="eyebrow text-left py-3 pr-6 text-muted-foreground">Avg Tuition</th>
                    <th className="eyebrow text-left py-3 pr-6 text-muted-foreground">Main Intake</th>
                    <th className="eyebrow text-left py-3 text-muted-foreground">Updates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {countries.map((c) => (
                    <tr key={c.id} className="group hover:bg-surface transition-colors">
                      <td className="py-3 pr-6">
                        <div className="flex items-center gap-2">
                          <CountryFlag country={c.name} size="sm" />
                          <span className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-6 text-sm text-muted-foreground">{c.universities}</td>
                      <td className="py-3 pr-6 text-sm text-muted-foreground">{c.averageTuition}</td>
                      <td className="py-3 pr-6 text-sm text-muted-foreground">{c.popularIntake}</td>
                      <td className="py-3 text-sm text-muted-foreground">{c.updates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
