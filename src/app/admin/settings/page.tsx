"use client";

import { useState } from "react";
import { Settings, Rss, Database, Server, Save, CheckCircle2, ShieldAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { rssSources } from "@/data/rssSources";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "rss" | "database">("general");
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="System Settings"
        description="Configure Abroad Bulletin editorial defaults, automated RSS sync parameters, and backend integrations."
        showExport={false}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E4E8EF] pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "general"
              ? "border-[#1769E0] text-[#1769E0] bg-white"
              : "border-transparent text-[#667085] hover:text-[#111827]"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>General Platform</span>
        </button>

        <button
          onClick={() => setActiveTab("rss")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "rss"
              ? "border-[#1769E0] text-[#1769E0] bg-white"
              : "border-transparent text-[#667085] hover:text-[#111827]"
          }`}
        >
          <Rss className="h-4 w-4" />
          <span>RSS Feed Ingestion</span>
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === "database"
              ? "border-[#1769E0] text-[#1769E0] bg-white"
              : "border-transparent text-[#667085] hover:text-[#111827]"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Database & Backend</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Settings changes recorded (Static mode — persistence connects in Phase 2).
        </div>
      )}

      {/* Tab 1: General Platform */}
      {activeTab === "general" && (
        <div className="bg-white border border-[#E4E8EF] rounded-xl p-6 shadow-xs max-w-3xl">
          <form onSubmit={handleSave} className="space-y-5">
            <h3 className="text-sm font-bold text-[#111827] border-b border-[#E4E8EF] pb-3">
              Editorial Brand & Metadata
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Platform Name
                </label>
                <input
                  type="text"
                  defaultValue="Abroad Bulletin"
                  className="w-full h-9 px-3 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Site Tagline
                </label>
                <input
                  type="text"
                  defaultValue="Study Abroad Intelligence"
                  className="w-full h-9 px-3 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Editorial Contact Email
                </label>
                <input
                  type="email"
                  defaultValue="editorial@abroadbulletin.com"
                  className="w-full h-9 px-3 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Primary Timezone
                </label>
                <input
                  type="text"
                  defaultValue="UTC (GMT+0)"
                  className="w-full h-9 px-3 text-xs bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] focus:outline-none focus:border-[#1769E0] focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E4E8EF] flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save General Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: RSS Feeds */}
      {activeTab === "rss" && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white border border-[#E4E8EF] rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#111827] mb-1">
              Live Feed Endpoints (from src/data/rssSources.ts)
            </h3>
            <p className="text-xs text-[#667085] mb-4">
              Government XML/Atom endpoints parsed via fast-xml-parser with Next.js ISR revalidation.
            </p>

            <div className="space-y-3">
              {rssSources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E4E8EF] flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#111827]">{source.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          source.enabled
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {source.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#667085] truncate max-w-xl">
                      {source.feedUrl || source.disabledReason}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-[#667085] bg-white px-2.5 py-1 rounded border border-[#E4E8EF]">
                      Prefix: {source.slugPrefix}
                    </span>
                    <span className="text-[#667085] bg-white px-2.5 py-1 rounded border border-[#E4E8EF]">
                      Revalidate: 3600s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Database & Backend */}
      {activeTab === "database" && (
        <div className="bg-white border border-[#E4E8EF] rounded-xl p-6 shadow-xs max-w-3xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E4E8EF]">
            <div className="h-10 w-10 rounded-xl bg-[#1769E0]/10 text-[#1769E0] flex items-center justify-center shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">
                Phase 2 Architecture Roadmap
              </h3>
              <p className="text-xs text-[#667085]">
                Connection status and upcoming database schema layers
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#E4E8EF] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#111827]">Current State</p>
                <p className="text-xs text-[#667085]">Phase 1 Admin Panel UI Foundation & Static Mock Datasets</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Complete
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#E4E8EF] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#111827]">Database Integration</p>
                <p className="text-xs text-[#667085]">MongoDB / Mongoose schemas for News, Universities & Scholarships</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Phase 2 Ready
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F7F9FC] border border-[#E4E8EF] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#111827]">Authentication & Security</p>
                <p className="text-xs text-[#667085]">JWT verification, bcrypt hashing & admin route middleware</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Phase 2 Ready
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
