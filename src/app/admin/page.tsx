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
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
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
    { label: "Add News Article", icon: Newspaper, action: "Create News Form" },
    { label: "Add University", icon: GraduationCap, action: "Add University Form" },
    { label: "Add Scholarship", icon: Award, action: "Create Scholarship Form" },
    { label: "Add Guide", icon: BookOpen, action: "Create Editorial Guide Form" },
  ];

  const recentNews = news.slice(0, 5);
  const upcomingDeadlines = deadlines.slice(0, 4);
  const featuredUniversities = universities.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-[#071A33] text-white rounded-2xl p-6 sm:p-8 border border-[#1B2F4E] shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#1769E0]/20 text-[#60A5FA] border border-[#1769E0]/40">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Phase 1 Admin Foundation Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Abroad Bulletin Intelligence Center
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Real-time monitoring across global news, universities, funding opportunities, and immigration updates. Ready for Phase 2 database connectors.
            </p>
          </div>

          {/* Quick Action CTA buttons */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.label}
                  onClick={() => setModalAction(qa.action)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-[#1769E0] text-white text-xs font-semibold border border-white/10 hover:border-[#1769E0] transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{qa.label.replace("Add ", "+ ")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Decorative subtle background pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#1769E0]/15 to-transparent pointer-events-none" />
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
        <StatCard
          label="Total News"
          value={news.length}
          subtext="Editorial + RSS sync"
          icon={Newspaper}
          href="/admin/news"
          badgeText="Live"
          badgeColor="blue"
        />
        <StatCard
          label="Universities"
          value={universities.length}
          subtext="Global institutions"
          icon={GraduationCap}
          href="/admin/universities"
          badgeText="Active"
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
          subtext="Urgent countdowns"
          icon={Clock}
          href="/admin/deadlines"
          badgeText="Tracking"
          badgeColor="amber"
        />
      </div>

      {/* Middle Section: Recent News & System RSS Feed Feeders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent News Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E4E8EF] rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#E4E8EF] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1769E0]" />
              <h2 className="text-base font-bold text-[#111827]">
                Recent Editorial & Feed Articles
              </h2>
            </div>
            <Link
              href="/admin/news"
              className="text-xs font-semibold text-[#1769E0] hover:underline flex items-center gap-1"
            >
              <span>View All ({news.length})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F9FC] border-b border-[#E4E8EF] text-[#667085] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Headline</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Country</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E8EF]">
                {recentNews.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F7F9FC]/60 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-[#111827] max-w-[280px]">
                      <div className="truncate group-hover:text-[#1769E0] transition-colors">
                        {item.headline}
                      </div>
                      <div className="text-[11px] text-[#667085] truncate font-normal mt-0.5">
                        {item.slug}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#1769E0]/10 text-[#1769E0]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                      {item.country}
                    </td>
                    <td className="py-3.5 px-3 text-[#667085] whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setModalAction(`Edit Article: ${item.headline}`)}
                        className="px-2 py-1 text-xs font-semibold text-[#1769E0] hover:bg-[#1769E0]/10 rounded transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#F7F9FC] border-t border-[#E4E8EF] text-xs text-[#667085] flex items-center justify-between">
            <span>Showing top 5 articles from current mock database</span>
            <Link
              href="/news"
              target="_blank"
              className="text-[#1769E0] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>View live news feed</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Live RSS Feed Status & Quick Stats (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* RSS Feed Status */}
          <div className="bg-white border border-[#E4E8EF] rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E8EF]">
              <div className="flex items-center gap-2">
                <Rss className="h-4 w-4 text-[#1769E0]" />
                <h3 className="text-sm font-bold text-[#111827]">
                  Automated RSS Ingestion
                </h3>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#E4E8EF]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">Canada (IRCC)</span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 1h Revalidate
                  </span>
                </div>
                <p className="text-[11px] text-[#667085] mt-1 truncate">
                  api.io.canada.ca/io-server/gc/news/en/v2
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#E4E8EF]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827]">UK Visas (UKVI)</span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 1h Revalidate
                  </span>
                </div>
                <p className="text-[11px] text-[#667085] mt-1 truncate">
                  gov.uk/search/news-and-communications.atom
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E4E8EF] flex items-center justify-between text-xs">
              <span className="text-[#667085]">Parser: fast-xml-parser</span>
              <Link href="/admin/settings" className="text-[#1769E0] font-semibold hover:underline">
                Configure Feeds
              </Link>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="bg-white border border-[#E4E8EF] rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#111827] mb-3">
              Content Catalog Breakdown
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#F0F2F6]">
                <span className="text-[#667085] flex items-center gap-2">
                  <FileCheck2 className="h-3.5 w-3.5 text-[#1769E0]" /> Visa Policies
                </span>
                <span className="font-bold text-[#111827]">{visaUpdates.length} records</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F0F2F6]">
                <span className="text-[#667085] flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-[#1769E0]" /> Editorial Guides
                </span>
                <span className="font-bold text-[#111827]">{guides.length} guides</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F0F2F6]">
                <span className="text-[#667085] flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 text-[#1769E0]" /> Fully Funded Awards
                </span>
                <span className="font-bold text-[#111827]">
                  {scholarships.filter((s) => s.type === "Fully Funded").length} awards
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Upcoming Deadlines & Recently Added Universities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming Deadlines (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E4E8EF] rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#E4E8EF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#1769E0]" />
              <h2 className="text-base font-bold text-[#111827]">
                Upcoming Intake & Grant Deadlines
              </h2>
            </div>
            <Link
              href="/admin/deadlines"
              className="text-xs font-semibold text-[#1769E0] hover:underline"
            >
              View All ({deadlines.length})
            </Link>
          </div>

          <div className="divide-y divide-[#E4E8EF]">
            {upcomingDeadlines.map((dl) => (
              <div
                key={dl.id}
                className="p-4 hover:bg-[#F7F9FC] transition-colors flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-[#111827] truncate">{dl.title}</p>
                  <p className="text-[11px] text-[#667085]">
                    {dl.country} • {dl.type} • Deadline: {dl.deadline}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      dl.daysLeft <= 10
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {dl.daysLeft} days left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Universities (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E4E8EF] rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#E4E8EF] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[#1769E0]" />
              <h2 className="text-base font-bold text-[#111827]">
                Featured Universities
              </h2>
            </div>
            <Link
              href="/admin/universities"
              className="text-xs font-semibold text-[#1769E0] hover:underline"
            >
              View Directory ({universities.length})
            </Link>
          </div>

          <div className="divide-y divide-[#E4E8EF]">
            {featuredUniversities.map((uni) => (
              <div
                key={uni.id}
                className="p-4 hover:bg-[#F7F9FC] transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-[#071A33] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {uni.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#111827] truncate">{uni.name}</p>
                    <p className="text-[11px] text-[#667085] truncate">
                      {uni.city}, {uni.country} • Global Rank #{uni.ranking}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[#111827]">{uni.tuition}</p>
                  <p className="text-[11px] text-[#667085]">IELTS {uni.ielts}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Dialog for Actions */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#E4E8EF] p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#1769E0]/10 text-[#1769E0] flex items-center justify-center shrink-0 font-bold">
                +
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111827]">{modalAction}</h3>
                <p className="text-xs text-[#667085]">CMS Action Triggered</p>
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-sm text-[#4B5563] leading-relaxed">
              <p className="font-semibold text-[#111827] mb-1">
                Phase 1 Admin Panel Foundation
              </p>
              This action interface will be connected in Phase 2 with database CRUD handlers and validation schemas.
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalAction(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer"
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
