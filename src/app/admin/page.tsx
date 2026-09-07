"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Newspaper,
  GraduationCap,
  Award,
  Globe,
  Clock,
  FileCheck2,
  BookOpen,
  Plus,
  ExternalLink,
  Rss,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Archive,
  X,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { adminGet } from "@/lib/api/apiClient";
import {
  news,
  universities,
  scholarships,
  countries,
  deadlines,
  visaUpdates,
  guides,
} from "@/data/mock";

export default function AdminDashboardPage() {
  const [modalAction, setModalAction] = useState<string | null>(null);

  // Live article & status counts from backend
  const [liveArticleCount, setLiveArticleCount] = useState<number>(news.length);
  const [liveStatusCounts, setLiveStatusCounts] = useState<{
    published: number;
    archived: number;
  }>({ published: 3, archived: 29 });

  useEffect(() => {
    adminGet<{
      success: boolean;
      totalCount: number;
      statusCounts?: Record<string, number>;
    }>("/admin/articles?limit=1")
      .then((res) => {
        if (res.success) {
          if (typeof res.totalCount === "number") setLiveArticleCount(res.totalCount);
          if (res.statusCounts) {
            setLiveStatusCounts({
              published: res.statusCounts.PUBLISHED ?? 3,
              archived: res.statusCounts.ARCHIVED ?? 29,
            });
          }
        }
      })
      .catch(() => {
        // Fallback to mock data on error
      });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const quickActions = [
    { label: "Add Article", icon: Newspaper, href: "/admin/news" },
    { label: "Add University", icon: GraduationCap, href: "/admin/universities" },
    { label: "Add Scholarship", icon: Award, href: "/admin/scholarships" },
    { label: "Visa Alert", icon: FileCheck2, href: "/admin/visa" },
  ];

  const recentNews = news.slice(0, 5);
  const upcomingDeadlines = deadlines.slice(0, 4);
  const featuredUniversities = universities.slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─── 1. Royal Blue Welcome Hero Card (Round Shape) ─── */}
      <div className="rounded-[28px] bg-gradient-to-r from-blue-600 via-[#1769E0] to-indigo-600 p-6 sm:p-7 text-white shadow-[0_4px_24px_rgba(23,105,224,0.18)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative overflow-hidden">
        {/* Subtle decorative glow circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Left side: Greeting & System Subtitle */}
        <div className="space-y-2.5 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-200" />
            <span>Platform Intelligence Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {getGreeting()}, Editor 👋
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-xl">
            Today: {liveArticleCount} total articles tracked across {countries.length} destinations, {universities.length} partner universities, and active automated government RSS feeds.
          </p>
        </div>

        {/* Right side: Frosted Glass Stat Cards (Round Shape) */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <div className="bg-white/12 backdrop-blur-md border border-white/20 rounded-[22px] p-4 min-w-[135px] sm:min-w-[145px] shadow-sm">
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              {liveArticleCount}
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-xs text-blue-100 font-medium">Articles</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/25 text-emerald-200 border border-emerald-400/30">
                ↑ Live
              </span>
            </div>
          </div>

          <div className="bg-white/12 backdrop-blur-md border border-white/20 rounded-[22px] p-4 min-w-[135px] sm:min-w-[145px] shadow-sm">
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              100%
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-xs text-blue-100 font-medium">RSS Sync</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/25 text-emerald-200 border border-emerald-400/30">
                2 Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Section Header: CMS Insights & Quick Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            CMS INSIGHTS
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          <span className="text-xs font-semibold text-slate-500">
            All Content Verticals
          </span>
        </div>

        {/* Quick Action Navigation Buttons (Round Pill Shape) */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <Link
                key={qa.label}
                href={qa.href}
                className="inline-flex items-center gap-1.5 h-8.5 px-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-xs transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[#1769E0]" />
                <span>{qa.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── 3. Primary Metric Cards Grid (Round Shape — rounded-[26px]) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-4.5">
        <StatCard
          label="Articles"
          value={liveArticleCount}
          icon={Newspaper}
          href="/admin/news"
          badgeText="Active"
          badgeColor="blue"
          subMetrics={[
            { value: liveStatusCounts.published, label: "Published", color: "text-emerald-600" },
            { value: liveStatusCounts.archived, label: "Archived", color: "text-slate-600" },
            { value: "2", label: "RSS Feeds", color: "text-[#1769E0]" },
          ]}
        />
        <StatCard
          label="Universities"
          value={universities.length}
          icon={GraduationCap}
          href="/admin/universities"
          badgeText="Verified"
          badgeColor="green"
          subMetrics={[
            { value: "8", label: "Active", color: "text-emerald-600" },
            { value: "4", label: "Featured", color: "text-[#1769E0]" },
            { value: "Top 50", label: "Rank Avg", color: "text-slate-800" },
          ]}
        />
        <StatCard
          label="Scholarships"
          value={scholarships.length}
          icon={Award}
          href="/admin/scholarships"
          badgeText="Scholarship"
          badgeColor="amber"
          subMetrics={[
            { value: "3", label: "Full Funded", color: "text-amber-600" },
            { value: "2", label: "Merit Tier", color: "text-[#1769E0]" },
            { value: "1", label: "Govt Grant", color: "text-emerald-600" },
          ]}
        />
        <StatCard
          label="Destinations"
          value={countries.length}
          icon={Globe}
          href="/admin/countries"
          badgeText="Destination"
          badgeColor="purple"
          subMetrics={[
            { value: "US & UK", label: "Prime Hubs", color: "text-purple-600" },
            { value: "Canada", label: "Visa Active", color: "text-[#1769E0]" },
            { value: "10", label: "Countries", color: "text-slate-800" },
          ]}
        />
        <StatCard
          label="Deadlines"
          value={deadlines.length}
          icon={Clock}
          href="/admin/deadlines"
          badgeText="Deadlines"
          badgeColor="rose"
          subMetrics={[
            { value: "2", label: "Urgent", color: "text-rose-600" },
            { value: "3", label: "Fall 2027", color: "text-[#1769E0]" },
            { value: "Daily", label: "Tracking", color: "text-slate-600" },
          ]}
        />
      </div>

      {/* ─── 4. Horizontal Pipeline Strip (Round Shape — rounded-[24px]) ─── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            CONTENT & INGESTION PIPELINE
          </span>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 cursor-pointer hover:text-slate-800">
            <SlidersHorizontal className="h-3 w-3" />
            <span>All Sources</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Card 1: Total Ingested */}
          <div className="bg-white border border-slate-200/75 rounded-[22px] p-4 shadow-[0_3px_12px_rgba(0,0,0,0.02)] flex items-center gap-3.5 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0">
              <Newspaper className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 font-display">
                  {liveArticleCount}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 text-[#1769E0]">
                  100%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Total Articles
              </p>
            </div>
          </div>

          {/* Card 2: Published */}
          <div className="bg-white border border-slate-200/75 rounded-[22px] p-4 shadow-[0_3px_12px_rgba(0,0,0,0.02)] flex items-center gap-3.5 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 font-display">
                  {liveStatusCounts.published}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Public Published
              </p>
            </div>
          </div>

          {/* Card 3: Archived */}
          <div className="bg-white border border-slate-200/75 rounded-[22px] p-4 shadow-[0_3px_12px_rgba(0,0,0,0.02)] flex items-center gap-3.5 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Archive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 font-display">
                  {liveStatusCounts.archived}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                  Safe
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Archived Records
              </p>
            </div>
          </div>

          {/* Card 4: RSS Feeds */}
          <div className="bg-white border border-slate-200/75 rounded-[22px] p-4 shadow-[0_3px_12px_rgba(0,0,0,0.02)] flex items-center gap-3.5 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Rss className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 font-display">
                  2
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-50 text-amber-700">
                  1h Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Automated Feeds
              </p>
            </div>
          </div>

          {/* Card 5: Visa Guidelines */}
          <div className="bg-white border border-slate-200/75 rounded-[22px] p-4 shadow-[0_3px_12px_rgba(0,0,0,0.02)] flex items-center gap-3.5 hover:shadow-md hover:border-slate-300 transition-all">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-900 font-display">
                  {visaUpdates.length}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-50 text-rose-700">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                Visa Policies
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. Middle Section: Recent News & System RSS Feed Ingestion (Round Shape) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Recent News Table (8 cols) — Round Shape rounded-[28px] */}
        <div className="lg:col-span-8 bg-white border border-slate-200/75 rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 sm:p-6 border-b border-slate-200/75 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#1769E0]" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Recent Editorial & Feed Articles
                </h2>
              </div>
              <Link
                href="/admin/news"
                className="text-xs font-semibold text-[#1769E0] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>View All ({liveArticleCount})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-5">Headline</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-3">Country</th>
                    <th className="py-3.5 px-3">Date</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentNews.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-semibold text-slate-900 max-w-[280px]">
                        <div className="truncate group-hover:text-[#1769E0] transition-colors">
                          {item.headline}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-normal mt-0.5">
                          /news/{item.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-100">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {item.country}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {item.date}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Link
                          href="/admin/news"
                          className="px-3 py-1 text-xs font-semibold text-[#1769E0] hover:bg-blue-50 rounded-full transition-colors"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 border-t border-slate-200/75 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Showing recent 5 articles</span>
            <Link
              href="/news"
              target="_blank"
              className="text-[#1769E0] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>View live public site</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Live RSS Feed Status & Quick Stats (4 cols) — Round Shape rounded-[28px] */}
        <div className="lg:col-span-4 space-y-5">
          {/* RSS Feed Status */}
          <div className="bg-white border border-slate-200/75 rounded-[28px] p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/75">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Rss className="h-4 w-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Automated RSS Ingestion
                </h3>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="p-3.5 rounded-[18px] bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Canada (IRCC Feed)
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 1h Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  api.io.canada.ca/io-server/gc/news
                </p>
              </div>

              <div className="p-3.5 rounded-[18px] bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    UK Visas (UKVI Feed)
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 1h Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  gov.uk/search/news-and-communications
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                fast-xml-parser
              </span>
              <Link
                href="/admin/news"
                className="text-[#1769E0] font-semibold text-[11px] hover:underline flex items-center gap-0.5"
              >
                <span>Open Feeds Tab</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="bg-white border border-slate-200/75 rounded-[28px] p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3.5">
              Content Catalog Breakdown
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-2">
                  <FileCheck2 className="h-3.5 w-3.5 text-[#1769E0]" /> Visa Policies
                </span>
                <span className="font-semibold text-slate-900">
                  {visaUpdates.length} records
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-[#1769E0]" /> Editorial Guides
                </span>
                <span className="font-semibold text-slate-900">
                  {guides.length} guides
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600 flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 text-[#1769E0]" /> Fully Funded Awards
                </span>
                <span className="font-semibold text-slate-900">
                  {scholarships.filter((s) => s.type === "Fully Funded").length} awards
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. Bottom Section: Upcoming Deadlines & Featured Universities (Round Shape) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Upcoming Deadlines (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/75 rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 sm:p-6 border-b border-slate-200/75 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Upcoming Intake & Grant Deadlines
                </h2>
              </div>
              <Link
                href="/admin/deadlines"
                className="text-xs font-semibold text-[#1769E0] hover:underline shrink-0 flex items-center gap-0.5"
              >
                <span>View All ({deadlines.length})</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.map((dl) => (
                <div
                  key={dl.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {dl.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {dl.country} • {dl.type} • Deadline: {dl.deadline}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold border ${
                        dl.daysLeft <= 10
                          ? "bg-rose-50 text-rose-700 border-rose-200/80"
                          : "bg-amber-50 text-amber-700 border-amber-200/80"
                      }`}
                    >
                      {dl.daysLeft}d remaining
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 border-t border-slate-200/75 text-[11px] text-slate-500">
            Automated countdowns refreshed daily.
          </div>
        </div>

        {/* Featured Universities (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/75 rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 sm:p-6 border-b border-slate-200/75 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-2xl bg-blue-50 text-[#1769E0] flex items-center justify-center">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Featured Institutions
                </h2>
              </div>
              <Link
                href="/admin/universities"
                className="text-xs font-semibold text-[#1769E0] hover:underline shrink-0 flex items-center gap-0.5"
              >
                <span>View Directory ({universities.length})</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {featuredUniversities.map((uni) => (
                <div
                  key={uni.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-2xl bg-[#071A33] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {uni.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {uni.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {uni.city}, {uni.country} • Rank #{uni.ranking}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900">{uni.tuition}</p>
                    <p className="text-[10px] text-slate-500">IELTS {uni.ielts}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50/60 border-t border-slate-200/75 text-[11px] text-slate-500">
            Institutions indexed with admissions and visa criteria.
          </div>
        </div>
      </div>

      {/* Modal Dialog for Actions */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[28px] shadow-xl border border-slate-200 p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{modalAction}</h3>
                  <p className="text-xs text-slate-500">CMS Action</p>
                </div>
              </div>
              <button
                onClick={() => setModalAction(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed">
              Navigate to the dedicated module from the sidebar to manage full creation and publishing workflows.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setModalAction(null)}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-full transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
