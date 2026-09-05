import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { getPublishedGuides, getGuideBySlug } from "@/lib/articles";
import { AdSidebar, InlineAd } from "@/components/editorial/AdComponents";

export const dynamic = "force-dynamic";
interface Props { params: Promise<{ slug: string }>; }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const guide = await getGuideBySlug(slug); return guide ? { title: `${guide.title} — Study Abroad Guide`, description: guide.description } : { title: "Guide not found" }; }
export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params; const guide = await getGuideBySlug(slug); if (!guide) notFound();
  const moreGuides = (await getPublishedGuides()).filter((g) => g.id !== slug).slice(0, 6);
  const bodyParagraphs = guide.content ? guide.content.replace(/<\/?(p|div|br)[^>]*>/gi, "\n").replace(/<[^>]+>/g, "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : [];
  return <div className="min-h-screen bg-background pb-16 lg:pb-0"><Header /><main><article>
    <header className="border-b border-border bg-background"><div className="shell py-8 lg:py-10"><nav className="mb-5 flex items-center gap-2 eyebrow text-muted-foreground"><Link href="/" className="hover:text-primary transition-colors">Home</Link><span>·</span><Link href="/guides" className="hover:text-primary transition-colors">Guides</Link><span>·</span><span className="text-foreground">{guide.category}</span></nav><span className="eyebrow text-primary">{guide.category}</span><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">{guide.title}</h1><p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{guide.description}</p><p className="meta mt-4 text-muted-foreground">By Editorial Team<span className="mx-1.5 opacity-40">·</span>{guide.readingTime}</p></div></header>
    <div className="shell py-10 lg:py-14"><div className="grid gap-8 lg:grid-cols-12"><div className="min-w-0 lg:col-span-8 lg:pr-12 lg:border-r lg:border-border"><div className="article-prose">{bodyParagraphs.length > 0 ? bodyParagraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>) : <p>{guide.description}</p>}</div><InlineAd slot="guide-detail-inline-01" />
    {moreGuides.length > 0 && <div className="mt-12 border-t border-border pt-8"><div className="section-rule mb-3" /><div className="mt-3"><h2 className="font-display text-2xl font-extrabold text-foreground">More Guides</h2></div><div className="mt-6 divide-y divide-border">{moreGuides.map((g) => <Link key={g.id} href={`/guides/${g.id}`} className="group flex items-start justify-between gap-4 py-4"><div><span className="eyebrow text-primary">{g.category}</span><p className="mt-1 font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">{g.title}</p><p className="mt-1 text-sm text-muted-foreground line-clamp-1">{g.description}</p></div><span className="eyebrow text-muted-foreground shrink-0">{g.readingTime}</span></Link>)}</div></div>}</div>
    <aside className="lg:col-span-4 lg:pl-8"><div className="border border-border bg-surface p-5"><p className="eyebrow text-muted-foreground mb-4">Guide Details</p><dl className="divide-y divide-border"><div className="flex justify-between py-2.5"><dt className="eyebrow text-muted-foreground">Category</dt><dd className="text-sm font-semibold text-foreground">{guide.category}</dd></div><div className="flex justify-between py-2.5"><dt className="eyebrow text-muted-foreground">Reading Time</dt><dd className="text-sm font-semibold text-foreground">{guide.readingTime}</dd></div><div className="flex justify-between py-2.5"><dt className="eyebrow text-muted-foreground">Author</dt><dd className="text-sm font-semibold text-foreground">Editorial Team</dd></div></dl></div><div className="mt-8"><AdSidebar slot="guide-detail-sidebar" format="rectangle" /></div></aside>
    </div></div></article></main><Footer /><MobileBottomNav /></div>;
}