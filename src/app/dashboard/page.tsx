import type { Metadata } from "next";
import Link from "next/link";
import { Globe2, Bookmark, Bell, GraduationCap, Award } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { Tag, MetaLabel } from "@/components/common/Tag";
import { SectionHeading } from "@/components/common/SectionHeading";
import { NewsCard } from "@/components/cards/NewsCards";
import { news, scholarships } from "@/data/mock";

export const metadata: Metadata = {
  title: "Dashboard — Study Abroad Intelligence",
  description: "Your personalised study-abroad dashboard. Saved universities, upcoming deadlines and the latest updates.",
};

export default function DashboardPage() {
  const latestNews = news.slice(0, 3);
  const closingSoon = scholarships.filter((s) => s.daysLeft <= 37).slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        <section className="border-b border-border bg-surface">
          <div className="shell py-8 lg:py-10">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Globe2 className="size-6" />
              </span>
              <div>
                <p className="meta text-muted-foreground">Welcome back</p>
                <h1 className="font-display text-2xl font-extrabold text-foreground">
                  Your Dashboard
                </h1>
              </div>
            </div>
          </div>
        </section>

        <section className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-10">
              <div>
                <SectionHeading title="Latest Updates" subtitle="From areas you're tracking." />
                <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2">
                  {latestNews.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              </div>

              <div>
                <SectionHeading title="Deadlines Approaching" subtitle="Scholarships closing soon." />
                <div className="mt-6 divide-y divide-border border-t border-border">
                  {closingSoon.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold text-foreground">{s.name}</h3>
                        <MetaLabel className="mt-0.5 block">{s.deadline} · {s.daysLeft} days left</MetaLabel>
                      </div>
                      <Tag tone={s.daysLeft <= 14 ? "breaking" : "primary"}>
                        {s.daysLeft} days
                      </Tag>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-md border border-border bg-surface p-5">
                <h3 className="meta text-muted-foreground">Quick Actions</h3>
                <div className="mt-4 space-y-2">
                  {[
                    { label: "Browse Universities", href: "/universities", Icon: GraduationCap },
                    { label: "Find Scholarships", href: "/scholarships", Icon: Award },
                    { label: "Saved Items", href: "/dashboard", Icon: Bookmark },
                    { label: "Notifications", href: "/dashboard", Icon: Bell },
                  ].map(({ label, href, Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      className="flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-5">
                <h3 className="meta text-muted-foreground">Profile completion</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Complete your profile to get personalised recommendations.
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
                <p className="meta mt-2 text-muted-foreground">33% complete</p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
