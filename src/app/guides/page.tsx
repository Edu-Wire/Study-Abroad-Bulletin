import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { SectionHeading } from "@/components/common/SectionHeading";
import { GuideCard } from "@/components/cards/MiscCards";
import { AdBanner } from "@/components/editorial/AdComponents";
import { getPublishedGuides } from "@/lib/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Study Abroad Guides — SOP, Visa, IELTS, Scholarships & More",
  description: "Practical, step-by-step guides for international students. Covering SOPs, visa applications, IELTS preparation, accommodation, scholarships and careers.",
};

export default async function GuidesPage() {
  const guides = await getPublishedGuides();
  return <div className="min-h-screen bg-background pb-16 lg:pb-0"><Header /><main>
    <div className="border-b border-border bg-background"><div className="shell py-4 lg:py-5"><p className="eyebrow text-primary">Resources</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">Study Abroad Guides</h1><p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">Practical, step-by-step guidance from shortlisting to arrival. Written for international students at every stage of the journey.</p></div></div>
    <div className="border-b border-border"><div className="shell py-3"><AdBanner slot="guides-listing-top" format="leaderboard" /></div></div>
    <div className="shell py-10 lg:py-14"><SectionHeading eyebrow="The Student Guide" title="All Guides" /><div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{guides.map((guide) => <GuideCard key={guide.id} guide={guide} />)}</div></div>
    <div className="border-t border-border bg-surface"><div className="shell py-10"><div className="section-rule mb-3" /><div className="mt-3 mb-6"><h2 className="font-display text-2xl font-extrabold text-foreground">Popular Guide Topics</h2></div><div className="flex flex-wrap gap-2">{["SOP Writing", "LOR Guide", "IELTS Preparation", "TOEFL Tips", "University Shortlisting", "Application Process", "Student Visa", "Part-Time Jobs", "Accommodation Guide", "Cost of Living", "Scholarships", "Post-Study Work", "Career Guidance"].map((topic) => <Link key={topic} href="/guides" className="border border-border bg-background px-4 py-2 eyebrow text-muted-foreground hover:border-primary hover:text-primary transition-colors">{topic}</Link>)}</div></div></div>
  </main><Footer /><MobileBottomNav /></div>;
}