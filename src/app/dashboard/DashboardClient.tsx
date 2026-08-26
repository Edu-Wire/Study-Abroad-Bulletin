"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bookmark,
  Bell,
  GraduationCap,
  Award,
  Sparkles,
  AlertCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { Tag, MetaLabel } from "@/components/common/Tag";
import { SectionHeading } from "@/components/common/SectionHeading";
import { NewsCard } from "@/components/cards/NewsCards";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { NewsArticle, NewsCategory } from "@/data/mock";
import {
  getStudentFeed,
  type StudentFeedResponse,
  type RecommendedArticleItem,
  type RecommendedDeadlineItem,
  type RecommendedScholarshipItem,
} from "@/lib/api/student";
import { getCurrentUser, type AuthUser } from "@/lib/api/auth";

// ============================================================================
// ADAPTER HELPERS (Mapping Live Feed Items to Component Formats)
// ============================================================================

function formatCategory(category: string): NewsCategory {
  const map: Record<string, NewsCategory> = {
    UNIVERSITIES: "Universities",
    ADMISSIONS: "Admissions",
    SCHOLARSHIPS: "Scholarships",
    VISA: "Visa",
    STUDENT_LIFE: "Student Life",
    CAREER: "Career",
  };
  return map[category] || "Universities";
}

function formatArticleDate(isoDate?: string): string {
  if (!isoDate) return "Recent";
  try {
    return new Date(isoDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Recent";
  }
}

function calculateDaysLeft(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (isNaN(target)) return null;
  const diff = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

function toNewsArticle(item: RecommendedArticleItem): NewsArticle {
  return {
    id: item.id,
    slug: item.slug,
    headline: item.headline,
    summary: item.summary,
    content: item.content,
    category: formatCategory(item.category),
    country:
      item.primaryCountry?.name ||
      item.countries?.[0]?.country?.name ||
      "Global",
    date: formatArticleDate(item.publishedAt || item.createdAt),
    readingTime: item.readingTime || "4 min read",
    image: item.image || "/images/news-campus.jpg",
    breaking: item.breaking,
    isRss: item.isRss,
    sourceUrl: item.sourceUrl || undefined,
    sourceName: item.sourceName || undefined,
  };
}

function calculateProfilePercentage(profile: StudentFeedResponse["profile"]): number {
  if (!profile) return 33;
  let score = 33; // base for account creation
  if (profile.targetCountries && profile.targetCountries.length > 0) score += 20;
  if (profile.studyLevel) score += 15;
  if (profile.degree) score += 12;
  if (profile.branch) score += 10;
  if (profile.interests && profile.interests.length > 0) score += 10;
  return Math.min(100, score);
}

// ============================================================================
// DASHBOARD CLIENT COMPONENT
// ============================================================================

export function DashboardClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [feed, setFeed] = useState<StudentFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Load User Session
  useEffect(() => {
    // Identity comes from the server only. Nothing about the user is cached in
    // localStorage, where it could be read or tampered with.
    let cancelled = false;

    getCurrentUser()
      .then((res) => {
        if (!cancelled && res.success && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {
        // An invalid session is handled by the server on the next navigation.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Fetch Live Personalized Feed from GET /api/student/feed
  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const feedData = await getStudentFeed();
      if (feedData.success) {
        setFeed(feedData);
      } else {
        setError("Failed to load personalized recommendations.");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing: untyped external/CMS payload shape. Tracked for follow-up typing.
    } catch (err: any) {
      console.error("Dashboard feed fetch error:", err);
      setError(
        err?.message || "Unable to connect to the recommendation server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    loadFeed();
  }, [loadFeed]);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : null;

  const articles = (feed?.data?.articles || []).slice(0, 4);
  const deadlines = (feed?.data?.deadlines || []).slice(0, 4);
  const scholarships = (feed?.data?.scholarships || []).slice(0, 3);
  const profileCompletion = calculateProfilePercentage(feed?.profile ?? null);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Header />
      <main>
        {/* Welcome Banner */}
        <section className="border-b border-border bg-surface">
          <div className="shell py-6 lg:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src="/logo/ab-logo.png"
                  alt="Abroad Bulletin AB Logo"
                  width={80}
                  height={80}
                  priority
                  className="h-12 w-auto object-contain shrink-0"
                />
                <div>
                  <p className="meta text-muted-foreground flex items-center gap-1.5">
                    {feed?.hasProfile && (
                      <span className="inline-flex items-center gap-1 text-primary font-semibold">
                        <Sparkles className="size-3" />
                        PERSONALIZED FOR YOU
                      </span>
                    )}
                    {!feed?.hasProfile && (
                      <span>
                        {displayName
                          ? `WELCOME BACK, ${displayName.toUpperCase()}`
                          : "WELCOME BACK"}
                      </span>
                    )}
                  </p>
                  <h1 className="font-display text-2xl font-extrabold text-foreground">
                    Your Dashboard
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-center">
                <LogoutButton
                  variant="outline"
                  className="px-4 py-2 text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Main Feed Content Area */}
        <section className="shell py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-10">
              {/* Error State Banner */}
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-destructive">
                        Feed Unavailable
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {error}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={loadFeed}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <RefreshCw className="size-3" />
                    Retry
                  </button>
                </div>
              )}

              {/* Section 1: Latest Updates (Articles) */}
              <div>
                <SectionHeading
                  title="Latest Updates"
                  subtitle={
                    feed?.hasProfile
                      ? "Recommended based on your target countries and study interests."
                      : "Latest verified international student news and policy updates."
                  }
                />

                {/* Loading Skeleton */}
                {loading && (
                  <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2">
                    {[1, 2].map((n) => (
                      <div
                        key={n}
                        className="flex flex-col space-y-3 animate-pulse"
                      >
                        <div className="aspect-[16/10] w-full rounded-sm bg-muted" />
                        <div className="h-4 w-1/4 rounded bg-muted" />
                        <div className="h-6 w-3/4 rounded bg-muted" />
                        <div className="h-4 w-full rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Articles Grid */}
                {!loading && articles.length > 0 && (
                  <div className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2">
                    {articles.map(({ item, reasons }) => (
                      <div key={item.id} className="flex flex-col justify-between">
                        <NewsCard article={toNewsArticle(item)} />
                        {reasons && reasons.length > 0 && reasons[0] && (
                          <div className="mt-2 text-[11px] text-primary/90 flex items-center gap-1 font-medium">
                            <Sparkles className="size-3 text-primary shrink-0" />
                            <span>{reasons[0]}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && articles.length === 0 && (
                  <div className="mt-6 rounded-md border border-border bg-surface p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No matching news updates found for your current profile.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Deadlines Approaching (Immigration & Policy) */}
              <div>
                <SectionHeading
                  title="Deadlines Approaching"
                  subtitle="Critical immigration, visa, and scholarship deadlines."
                />

                {/* Loading Skeleton */}
                {loading && (
                  <div className="mt-6 space-y-4">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-14 w-full rounded-sm bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {/* Live Deadlines List */}
                {!loading && (deadlines.length > 0 || scholarships.length > 0) && (
                  <div className="mt-6 divide-y divide-border border-t border-border">
                    {/* Render Immigration Deadlines */}
                    {deadlines.map(({ item, reasons }) => {
                      const daysLeft = calculateDaysLeft(item.deadlineDate);
                      const isCritical =
                        item.importance === "CRITICAL" || (daysLeft !== null && daysLeft <= 7);

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 py-4"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/immigration-tracker/${item.slug}`}
                              className="font-display text-sm font-bold text-foreground hover:text-primary transition-colors block truncate"
                            >
                              {item.title}
                            </Link>
                            <MetaLabel className="mt-0.5 block text-xs">
                              {item.country?.name || item.countryId.toUpperCase()} ·{" "}
                              {item.deadlineType}
                              {daysLeft !== null && ` · ${daysLeft} days left`}
                            </MetaLabel>
                            {reasons && reasons.length > 0 && (
                              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="size-2.5 text-primary shrink-0" />
                                <span>{reasons[0]}</span>
                              </p>
                            )}
                          </div>
                          {daysLeft !== null && (
                            <Tag tone={isCritical ? "breaking" : "primary"}>
                              {daysLeft} days
                            </Tag>
                          )}
                        </div>
                      );
                    })}

                    {/* Render Scholarships Deadlines */}
                    {scholarships.map(({ item, reasons }) => {
                      const daysLeft = calculateDaysLeft(item.deadline);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 py-4"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/scholarships/${item.slug}`}
                              className="font-display text-sm font-bold text-foreground hover:text-primary transition-colors block truncate"
                            >
                              {item.name}
                            </Link>
                            <MetaLabel className="mt-0.5 block text-xs">
                              {item.organization} · {item.funding}
                              {daysLeft !== null && ` · ${daysLeft} days left`}
                            </MetaLabel>
                            {reasons && reasons.length > 0 && (
                              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                                <Sparkles className="size-2.5 text-primary shrink-0" />
                                <span>{reasons[0]}</span>
                              </p>
                            )}
                          </div>
                          {daysLeft !== null && (
                            <Tag tone={daysLeft <= 14 ? "breaking" : "primary"}>
                              {daysLeft} days
                            </Tag>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && deadlines.length === 0 && scholarships.length === 0 && (
                  <div className="mt-6 rounded-md border border-border bg-surface p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No upcoming deadlines found matching your profile.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar with Quick Actions & Profile Completion */}
            <aside className="space-y-6">
              <div className="rounded-md border border-border bg-surface p-5">
                <h3 className="meta text-muted-foreground">Quick Actions</h3>
                <div className="mt-4 space-y-2">
                  {[
                    {
                      label: "Browse Universities",
                      href: "/universities",
                      Icon: GraduationCap,
                    },
                    {
                      label: "Find Scholarships",
                      href: "/scholarships",
                      Icon: Award,
                    },
                    {
                      label: "Policy Tracker",
                      href: "/immigration-tracker",
                      Icon: Bell,
                    },
                    {
                      label: "Saved Items",
                      href: "/dashboard",
                      Icon: Bookmark,
                    },
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

              {/* Profile Completion Widget */}
              <div className="rounded-md border border-border bg-surface p-5">
                <h3 className="meta text-muted-foreground">
                  Profile Completion
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  {user?.email
                    ? `Signed in as ${user.email}`
                    : "Complete your profile to customize recommendations."}
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <p className="meta mt-2 text-muted-foreground">
                  {profileCompletion}% complete
                  {profileCompletion < 100 && (
                    <span className="text-xs text-primary block mt-1 font-medium">
                      Add target countries and study level to refine your feed.
                    </span>
                  )}
                </p>
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
