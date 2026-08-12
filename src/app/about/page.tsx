import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { InlineAd } from "@/components/editorial/AdComponents";
import { Newspaper, Target, Globe, ShieldCheck, Mail, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About Study Abroad Intelligence — Global Editorial Publication",
  description:
    "Learn about Study Abroad Intelligence, an independent publication covering international university admissions, scholarships, visa policy, and country destination intelligence.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page Header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-10 lg:py-14">
            <p className="eyebrow text-primary">About The Publication</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Study Abroad Intelligence
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              An independent editorial publication providing timely news, data analysis, scholarship tracking, and policy intelligence for international students worldwide.
            </p>
          </div>
        </div>

        <div className="shell py-12 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Main Content — 8 cols */}
            <div className="lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
              {/* Mission Section */}
              <section className="mb-12">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">Our Mission</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Navigating higher education abroad has become increasingly complex. Between shifting immigration policies, financial capacity requirements, application deadlines, and scholarship criteria, students require accurate, transparent, and structured intelligence.
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Study Abroad Intelligence was founded to bridge the information gap, offering clear editorial reporting, structured tools, and comprehensive destination guides to empower prospective students and parents.
                </p>
              </section>

              {/* What We Cover */}
              <section className="mb-12 border-t border-border pt-10">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">What We Cover</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {[
                    {
                      title: "University & Admissions Intelligence",
                      desc: "Tracking entry requirements, tuition structure updates, and international intake policies across global institutions.",
                    },
                    {
                      title: "Visa & Immigration Policy",
                      desc: "Timely reporting on study permits, post-study work rights, financial proof threshold shifts, and policy changes.",
                    },
                    {
                      title: "Scholarships & Funding Database",
                      desc: "Curated directory of fully funded, partial, government, and institutional awards for international applicants.",
                    },
                    {
                      title: "Country Destination Guides",
                      desc: "In-depth intelligence covering living costs, housing, intake schedules, and student work entitlements by nation.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="border border-border bg-surface p-5">
                      <h3 className="font-display text-base font-bold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Inline Ad Placement */}
              <InlineAd slot="about-inline" />

              {/* Our Editorial Approach */}
              <section className="mb-12">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">Our Editorial Approach</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  We adhere to rigorous editorial practices. Our coverage synthesizes official government press statements, university administrative gazettes, and immigration department publications.
                </p>
                <div className="mt-6 border-l-4 border-primary bg-surface p-5">
                  <p className="font-display text-base font-bold text-foreground">Independence & Trust</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    We maintain a strict boundary between editorial reporting and commercial advertising. Sponsored listings and advertisements are explicitly designated to preserve publication integrity.
                  </p>
                </div>
              </section>

              {/* Who We Serve */}
              <section className="border-t border-border pt-10">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">Who We Serve</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    { title: "Prospective Students", desc: "Applicants seeking undergraduate or postgraduate degrees abroad." },
                    { title: "Parents & Families", desc: "Families planning financial and safety logistics for overseas study." },
                    { title: "Education Advisors", desc: "Counselors needing reliable policy tracking across global destinations." },
                  ].map((user) => (
                    <div key={user.title} className="border border-border p-4">
                      <p className="eyebrow text-primary text-xs">{user.title}</p>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{user.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar — 4 cols */}
            <aside className="lg:col-span-4">
              {/* Publication Info Box */}
              <div className="border border-border bg-surface p-6 mb-8">
                <p className="eyebrow text-primary mb-2">Publication Overview</p>
                <h3 className="font-display text-xl font-extrabold text-foreground">
                  Independent Editorial Platform
                </h3>
                <dl className="mt-4 divide-y divide-border text-xs">
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-muted-foreground">Focus Area</dt>
                    <dd className="font-semibold text-foreground">Global Higher Ed</dd>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-muted-foreground">Destinations Covered</dt>
                    <dd className="font-semibold text-foreground">8 Primary Hubs</dd>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <dt className="text-muted-foreground">Editorial Policy</dt>
                    <dd className="font-semibold text-primary">
                      <Link href="/editorial-standards">View Standards →</Link>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Submit a Tip Card */}
              <div className="border border-border bg-background p-6 mb-8">
                <Mail className="size-6 text-primary mb-3" />
                <h3 className="font-display text-lg font-bold text-foreground">Submit a News Tip</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Have an update on university admissions, visa policy changes, or scholarship announcements? Contact our desk.
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1.5 bg-primary px-4 py-2 eyebrow text-primary-foreground text-xs hover:opacity-90 transition-opacity"
                >
                  <span>Submit News Tip</span>
                  <ArrowRight className="size-3.5" />
                </Link>
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
