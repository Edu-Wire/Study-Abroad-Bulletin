import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { VisaUpdateCard } from "@/components/cards/MiscCards";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdBanner, AdSidebar } from "@/components/editorial/AdComponents";
import { visaUpdates } from "@/data/mock";

export const metadata: Metadata = {
  title: "Visa Updates — Student Visa Changes & Immigration Policy",
  description:
    "Stay current with student visa changes and immigration policy updates for Canada, UK, Australia, Germany and more.",
};

export default function VisaPage() {
  const urgent = visaUpdates.filter((v) => v.urgent);
  const regular = visaUpdates.filter((v) => !v.urgent);

  const visaTableData = [
    { country: "Canada", type: "Student Direct Stream", processing: "8–12 weeks", work: "20 hrs/week" },
    { country: "United Kingdom", type: "Student Visa (T4)", processing: "3–8 weeks", work: "20 hrs/week" },
    { country: "United States", type: "F-1 Student Visa", processing: "3–5 months", work: "On-campus only" },
    { country: "Australia", type: "Student Visa (500)", processing: "4–6 weeks", work: "48 hrs/fortnight" },
    { country: "Germany", type: "National Visa (D)", processing: "6–12 weeks", work: "120 full days/yr" },
    { country: "Ireland", type: "Study Visa (C)", processing: "4–8 weeks", work: "20 hrs/week" },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-8 lg:py-10">
            <p className="eyebrow text-primary">Policy</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Visa & Immigration
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Immigration and study-permit changes across major destinations. Updated as
              new information is confirmed.
            </p>
          </div>
        </div>

        {/* Top ad */}
        <div className="border-b border-border">
          <div className="shell py-3">
            <AdBanner slot="visa-listing-top" format="leaderboard" />
          </div>
        </div>

        <div className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Main */}
            <div className="lg:col-span-8">
              {urgent.length > 0 && (
                <div className="mb-10">
                  <SectionHeading
                    eyebrow="Priority"
                    title="Urgent Visa Updates"
                    subtitle="Changes requiring immediate attention from applicants."
                  />
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {urgent.map((v) => (
                      <VisaUpdateCard key={v.id} update={v} />
                    ))}
                  </div>
                </div>
              )}

              <SectionHeading
                title="All Visa Updates"
                subtitle="Immigration and study-permit changes across all major destinations."
              />
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {visaUpdates.map((v) => (
                  <VisaUpdateCard key={v.id} update={v} />
                ))}
              </div>

              {/* Country visa requirements */}
              <div className="mt-12">
                <SectionHeading
                  eyebrow="Reference"
                  title="Visa Requirements by Country"
                />
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-foreground">
                        <th className="eyebrow text-left py-3 pr-6 text-muted-foreground">Country</th>
                        <th className="eyebrow text-left py-3 pr-6 text-muted-foreground">Visa Type</th>
                        <th className="eyebrow text-left py-3 pr-6 text-muted-foreground">Processing</th>
                        <th className="eyebrow text-left py-3 text-muted-foreground">Work Rights</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {visaTableData.map((row) => (
                        <tr key={row.country} className="hover:bg-surface transition-colors">
                          <td className="py-3 pr-6 font-display text-sm font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <CountryFlag country={row.country} size="xs" />
                              <span>{row.country}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-6 text-sm text-muted-foreground">{row.type}</td>
                          <td className="py-3 pr-6 text-sm text-muted-foreground">{row.processing}</td>
                          <td className="py-3 text-sm text-muted-foreground">{row.work}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 lg:border-l lg:border-border lg:pl-8">
              <div className="section-rule mb-3" />
              <div className="mt-3">
                <h3 className="font-display text-xl font-extrabold text-foreground">Filter by Country</h3>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {["All Countries", "Canada", "United Kingdom", "Australia", "Germany", "United States", "Ireland", "Netherlands"].map((c) => (
                  <button
                    key={c}
                    className="h-9 border border-border bg-surface px-3 text-left eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {c !== "All Countries" && <CountryFlag country={c} size="xs" />}
                    <span>{c}</span>
                  </button>
                ))}
              </div>

              {/* Filter by visa type */}
              <div className="mt-6">
                <h4 className="eyebrow text-muted-foreground mb-2">Filter by Type</h4>
                <div className="flex flex-col gap-2">
                  {["All Types", "Student Visa", "Work Permit", "Post-Study Work", "Spouse Visa"].map((t) => (
                    <button
                      key={t}
                      className="h-9 border border-border bg-surface px-3 text-left eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar ad */}
              <div className="mt-8">
                <AdSidebar slot="visa-listing-sidebar" format="rectangle" />
              </div>

              {/* Visa guide links */}
              <div className="mt-8">
                <div className="section-rule mb-3" />
                <div className="mt-3">
                  <h3 className="font-display text-lg font-extrabold text-foreground">Visa Guides</h3>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {[
                    "How to Apply for a Canada Study Permit",
                    "UK Student Visa Complete Guide",
                    "Australia Student Visa 500 Requirements",
                    "Germany Student Visa Application",
                    "Post-Study Work Rights Explained",
                  ].map((guide) => (
                    <a
                      key={guide}
                      href="/guides"
                      className="group flex items-center justify-between py-3 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      <span className="headline-link">{guide}</span>
                    </a>
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
