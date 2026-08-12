import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { InlineAd } from "@/components/editorial/AdComponents";
import { ShieldCheck, FileText, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Editorial Standards & Sourcing Policy | Study Abroad Intelligence",
  description:
    "Review the editorial guidelines, verification procedures, corrections policy, and commercial disclosures governing Study Abroad Intelligence.",
};

export default function EditorialStandardsPage() {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Page Header */}
        <div className="border-b border-border bg-background">
          <div className="shell py-10 lg:py-14">
            <p className="eyebrow text-primary">Trust & Governance</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Editorial Standards
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Our principles for sourcing, fact-checking, clear labeling of sponsored content, and maintaining reader trust across all publication coverage.
            </p>
          </div>
        </div>

        <div className="shell py-12 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Main Content — 8 cols */}
            <div className="lg:col-span-8 lg:pr-12 lg:border-r lg:border-border">
              {/* How We Report */}
              <section className="mb-12">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">How We Report</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Study Abroad Intelligence provides news, policy updates, scholarship tracking, and educational intelligence for international students. Our journalists and editors prioritize accuracy, clarity, and timeliness above speed.
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  We do not issue legal or official government advice. Where stories discuss immigration policies or student visa regulations, we provide attribution to relevant official immigration departments and university admissions boards.
                </p>
              </section>

              {/* Sourcing & Fact Checking */}
              <section className="mb-12 border-t border-border pt-10">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">Sourcing & Verification</h2>
                <div className="mt-6 space-y-6">
                  <div className="border border-border bg-surface p-5">
                    <h3 className="font-display text-lg font-bold text-foreground">Primary Sourcing</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Our news stories rely on primary sources including official government gazettes, IRCC, UKVI, Department of Home Affairs, university press releases, and verified institutional notices.
                    </p>
                  </div>

                  <div className="border border-border bg-surface p-5">
                    <h3 className="font-display text-lg font-bold text-foreground">Verification Standards</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Before reporting policy shifts or visa changes, information is cross-verified against official department releases or institutional documentation to prevent misinformation.
                    </p>
                  </div>
                </div>
              </section>

              {/* Inline Ad Slot */}
              <InlineAd slot="editorial-standards-inline" />

              {/* Editorial / Advertisement / Sponsored Distinction */}
              <section className="mb-12">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">Content Disclosures & Commercial Content</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  To ensure complete transparency, Study Abroad Intelligence maintains strict visual and textual distinctions between editorial reporting, commercial advertisements, and sponsored partner content.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="border-t-2 border-foreground bg-surface p-4">
                    <span className="eyebrow text-foreground">EDITORIAL</span>
                    <h4 className="mt-2 font-display text-sm font-bold text-foreground">Independent Reporting</h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Produced independently by our editorial team. Never influenced by advertisers or commercial sponsors.
                    </p>
                  </div>

                  <div className="border-t-2 border-primary bg-primary-soft/30 p-4">
                    <span className="eyebrow text-primary">SPONSORED</span>
                    <h4 className="mt-2 font-display text-sm font-bold text-foreground">Partner Content</h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Created in collaboration with verified corporate partners. Explicitly tagged with SPONSORED badge.
                    </p>
                  </div>

                  <div className="border-t-2 border-border bg-muted/20 p-4">
                    <span className="eyebrow text-muted-foreground">ADVERTISEMENT</span>
                    <h4 className="mt-2 font-display text-sm font-bold text-foreground">Display Ads</h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Standard ad server placements clearly designated as ADVERTISEMENT in designated slots.
                    </p>
                  </div>
                </div>
              </section>

              {/* Corrections Policy */}
              <section className="border-t border-border pt-10">
                <div className="section-rule mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-foreground">Corrections & Updates</h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  When a factual error occurs, we correct it promptly and transparently. Substantive corrections to news stories will include a note at the end of the article detailing the date and nature of the revision.
                </p>
                <div className="mt-6 border border-border p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-base font-bold text-foreground">Report a Correction or Tip</p>
                    <p className="text-xs text-muted-foreground mt-1">Found an error or updated policy information? Contact our desk.</p>
                  </div>
                  <Link
                    href="/contact"
                    className="shrink-0 bg-primary px-4 py-2 eyebrow text-primary-foreground text-xs hover:opacity-90 transition-opacity"
                  >
                    Contact Editorial →
                  </Link>
                </div>
              </section>
            </div>

            {/* Sidebar — 4 cols */}
            <aside className="lg:col-span-4">
              <div className="border border-border bg-surface p-6 mb-8">
                <ShieldCheck className="size-8 text-primary mb-3" />
                <h3 className="font-display text-lg font-extrabold text-foreground">Commitment to Readers</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Our publication is built on reader trust. We welcome feedback regarding our coverage, fact-checking, or disclosures.
                </p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="eyebrow text-muted-foreground text-xs">Editorial Contact</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">editorial@studyabroadintelligence.com</p>
                </div>
              </div>

              <div className="border border-border p-6">
                <h3 className="font-display text-base font-bold text-foreground mb-3">Quick Links</h3>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                      About the Publication →
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                      Submit a News Tip →
                    </Link>
                  </li>
                  <li>
                    <Link href="/consultants" className="text-muted-foreground hover:text-primary transition-colors">
                      Corporate Partner Directory →
                    </Link>
                  </li>
                </ul>
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
