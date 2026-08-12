import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { CountryFlag } from "@/components/common/CountryFlag";
import { AdSidebar } from "@/components/editorial/AdComponents";
import { consultants } from "@/data/consultants";
import { ArticleShare } from "@/components/common/ArticleShare";
import { ShieldCheck, ExternalLink, MapPin, Mail, Phone, Globe, Star, Calendar } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const consultant = consultants.find((c) => c.slug === slug);
  if (!consultant) return { title: "Consultant Not Found | Study Abroad Intelligence" };
  return {
    title: `${consultant.name} — Verified Education Consultancy Profile`,
    description: consultant.description,
  };
}

export function generateStaticParams() {
  return consultants.map((c) => ({ slug: c.slug }));
}

export default async function ConsultantDetailPage({ params }: Props) {
  const { slug } = await params;
  const consultant = consultants.find((c) => c.slug === slug);
  if (!consultant) notFound();

  const relatedConsultants = consultants
    .filter((c) => c.slug !== slug && (c.country === consultant.country || c.destinations.some((d) => consultant.destinations.includes(d))))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Top Header Card */}
        <div className="border-b border-border bg-background">
          <div className="shell py-8 lg:py-10">
            <nav className="flex items-center gap-2 eyebrow text-muted-foreground mb-4">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <span>·</span>
              <Link href="/consultants" className="hover:text-primary transition-colors">Directory</Link>
              <span>·</span>
              <span className="text-foreground">{consultant.name}</span>
            </nav>

            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-16 items-center justify-center border border-border bg-surface text-4xl shrink-0">
                  {consultant.logo}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {consultant.sponsored && (
                      <span className="eyebrow border border-primary/30 bg-primary-soft text-primary px-2 py-0.5 text-xs">
                        SPONSORED
                      </span>
                    )}
                    {consultant.verified && (
                      <span className="eyebrow inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs">
                        <ShieldCheck className="size-3.5" />
                        VERIFIED PARTNER
                      </span>
                    )}
                    <span className="eyebrow text-muted-foreground">{consultant.country}</span>
                  </div>

                  <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
                    {consultant.name}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 text-foreground font-bold">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      {consultant.rating.toFixed(1)} ({consultant.reviewCount} client reviews)
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      Established {consultant.established}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={consultant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 eyebrow text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <span>Visit Official Website</span>
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </div>

            {/* Share bar */}
            <div className="mt-6 border-t border-border pt-4">
              <ArticleShare title={`${consultant.name} — Education Agency Profile`} />
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="shell py-10 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Left Column — 8 cols */}
            <div className="lg:col-span-8 lg:pr-10 lg:border-r lg:border-border">
              {/* Overview */}
              <section className="mb-10">
                <h2 className="font-display text-2xl font-extrabold text-foreground mb-4">
                  About {consultant.name}
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {consultant.description}
                </p>
                {consultant.aboutHtml && (
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {consultant.aboutHtml}
                  </p>
                )}
              </section>

              {/* Destinations Supported */}
              <section className="mb-10 border-t border-border pt-8">
                <h2 className="font-display text-xl font-extrabold text-foreground mb-4">
                  Study Destinations Supported
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {consultant.destinations.map((dest) => (
                    <div key={dest} className="flex items-center gap-3 border border-border bg-surface p-3.5">
                      <CountryFlag country={dest} size="md" />
                      <div>
                        <p className="font-display text-sm font-bold text-foreground">{dest}</p>
                        <p className="eyebrow text-xs text-muted-foreground">Admissions & Visa Support</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Services Offered */}
              <section className="mb-10 border-t border-border pt-8">
                <h2 className="font-display text-xl font-extrabold text-foreground mb-4">
                  Services & Expertise
                </h2>
                <div className="flex flex-wrap gap-2">
                  {consultant.services.map((service) => (
                    <span
                      key={service}
                      className="border border-border bg-surface px-3 py-1.5 eyebrow text-xs text-foreground font-semibold"
                    >
                      ✓ {service}
                    </span>
                  ))}
                </div>
              </section>

              {/* Office Locations */}
              <section className="border-t border-border pt-8">
                <h2 className="font-display text-xl font-extrabold text-foreground mb-4">
                  Office Locations & Cities Served
                </h2>
                <div className="border border-border bg-surface p-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="size-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">Head Office Address</p>
                      <p className="mt-1 text-sm text-muted-foreground">{consultant.address}</p>
                      <p className="mt-3 eyebrow text-xs text-muted-foreground">
                        Other Cities Served: {consultant.cities.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column / Sidebar — 4 cols */}
            <aside className="lg:col-span-4">
              {/* Contact Information Box */}
              <div className="border border-border bg-surface p-5 mb-8">
                <h3 className="font-display text-lg font-extrabold text-foreground mb-4 border-b border-border pb-3">
                  Contact Information
                </h3>
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Globe className="size-4 text-primary shrink-0" />
                    <a href={consultant.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">
                      {consultant.website}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="size-4 text-primary shrink-0" />
                    <a href={`mailto:${consultant.email}`} className="hover:text-primary truncate">
                      {consultant.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="size-4 text-primary shrink-0" />
                    <span>{consultant.phone}</span>
                  </div>
                </div>

                <a
                  href={consultant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex w-full items-center justify-center gap-2 bg-primary py-2.5 eyebrow text-primary-foreground text-xs hover:opacity-90 transition-opacity"
                >
                  <span>Inquire with Agency</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              {/* Sidebar Ad */}
              <AdSidebar slot="consultant-profile-sidebar" format="rectangle" />

              {/* Related Consultants */}
              {relatedConsultants.length > 0 && (
                <div className="mt-8">
                  <div className="section-rule mb-3" />
                  <div className="mt-3">
                    <h3 className="font-display text-lg font-extrabold text-foreground">Similar Agencies</h3>
                  </div>
                  <div className="mt-4 divide-y divide-border">
                    {relatedConsultants.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/consultants/${rel.slug}`}
                        className="group block py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span>{rel.logo}</span>
                          <span className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {rel.name}
                          </span>
                        </div>
                        <p className="eyebrow text-muted-foreground text-[0.6875rem] mt-1">
                          {rel.country} · ★ {rel.rating.toFixed(1)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
