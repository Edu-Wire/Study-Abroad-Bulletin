"use client";

import { useState } from "react";
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
  ArrowRight,
  ExternalLink,
  Rss,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
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
      {/* Page Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display">
              Intelligence Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              Live System
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Real-time monitoring across editorial publications, immigration updates, university directories, and intake deadlines.
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <Link
                key={qa.label}
                href={qa.href}
                className="inline-flex items-center gap-1.5 h-8.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-[#1769E0]" />
                <span>{qa.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          label="Total Articles"
          value={news.length}
          subtext="Editorial & RSS sync"
          icon={Newspaper}
          href="/admin/news"
          badgeText="Active"
          badgeColor="blue"
        />
        <StatCard
          label="Universities"
          value={universities.length}
          subtext="Partner institutions"
          icon={GraduationCap}
          href="/admin/universities"
          badgeText="Verified"
          badgeColor="green"
        />
        <StatCard
          label="Scholarships"
          value={scholarships.length}
          subtext="Grants & awards"
          icon={Award}
          href="/admin/scholarships"
          badgeText="Open"
          badgeColor="amber"
        />
        <StatCard
          label="Destinations"
          value={countries.length}
          subtext="Country dossiers"
          icon={Globe}
          href="/admin/countries"
          badgeText="Supported"
          badgeColor="purple"
        />
        <StatCard
          label="Deadlines"
          value={deadlines.length}
          subtext="Intake countdowns"
          icon={Clock}
          href="/admin/deadlines"
          badgeText="Tracking"
          badgeColor="rose"
        />
      </div>

      {/* Middle Section: Recent News & System RSS Feed Ingestion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Recent News Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between gap-3">
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
                <span>View All ({news.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Headline</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Country</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentNews.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-[280px]">
                        <div className="truncate group-hover:text-[#1769E0] transition-colors">
                          {item.headline}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-normal mt-0.5">
                          /news/{item.slug}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-[#1769E0] border border-blue-100">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {item.country}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {item.date}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href="/admin/news"
                          className="px-2 py-1 text-xs font-semibold text-[#1769E0] hover:bg-blue-50 rounded transition-colors"
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

          <div className="p-3.5 bg-slate-50/60 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Showing recent 5 articles</span>
            <Link
              href="/news"
              target="_blank"
              className="text-[#1769E0] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>View live feed</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Live RSS Feed Status & Quick Stats (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* RSS Feed Status */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Rss className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Automated RSS Ingestion
                </h3>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
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

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
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

            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">fast-xml-parser</span>
              <Link
                href="/admin/news"
                className="text-[#1769E0] font-semibold text-[11px] hover:underline"
              >
                Open RSS Preview →
              </Link>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3">
              Content Catalog Breakdown
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-2">
                  <FileCheck2 className="h-3.5 w-3.5 text-[#1769E0]" /> Visa Policies
                </span>
                <span className="font-semibold text-slate-900">
                  {visaUpdates.length} records
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-[#1769E0]" /> Editorial Guides
                </span>
                <span className="font-semibold text-slate-900">
                  {guides.length} guides
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
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

      {/* Bottom Section: Upcoming Deadlines & Featured Universities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Upcoming Deadlines (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Upcoming Intake & Grant Deadlines
                </h2>
              </div>
              <Link
                href="/admin/deadlines"
                className="text-xs font-semibold text-[#1769E0] hover:underline shrink-0"
              >
                View All ({deadlines.length})
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.map((dl) => (
                <div
                  key={dl.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
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
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
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

          <div className="p-3.5 bg-slate-50/60 border-t border-slate-200/80 text-[11px] text-slate-500">
            Automated countdowns refreshed daily.
          </div>
        </div>

        {/* Featured Universities (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#1769E0] flex items-center justify-center">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Featured Institutions
                </h2>
              </div>
              <Link
                href="/admin/universities"
                className="text-xs font-semibold text-[#1769E0] hover:underline shrink-0"
              >
                View Directory ({universities.length})
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {featuredUniversities.map((uni) => (
                <div
                  key={uni.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[#071A33] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
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

          <div className="p-3.5 bg-slate-50/60 border-t border-slate-200/80 text-[11px] text-slate-500">
            Institutions indexed with admissions and visa criteria.
          </div>
        </div>
      </div>

      {/* Modal Dialog for Actions */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1769E0] flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{modalAction}</h3>
                  <p className="text-xs text-slate-500">CMS Action</p>
                </div>
              </div>
              <button
                onClick={() => setModalAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
              Navigate to the dedicated module from the sidebar to manage full creation and publishing workflows.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setModalAction(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer shadow-2xs"
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
