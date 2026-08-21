"use client";

import { useState } from "react";
import { Settings, Rss, Database, Server, Save, CheckCircle2, ShieldCheck, Globe } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
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
        description="Configure AbroadBulletin platform branding, automated RSS ingestion endpoints, and infrastructure connectors."
        showExport={false}
      />

      {/* Segmented Settings Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 border border-slate-200/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("general")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "general"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Settings className="h-3.5 w-3.5 text-[#1769E0]" />
          <span>General Platform</span>
        </button>

        <button
          onClick={() => setActiveTab("rss")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "rss"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Rss className="h-3.5 w-3.5 text-amber-500" />
          <span>RSS Feed Ingestion</span>
        </button>

        <button
          onClick={() => setActiveTab("database")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "database"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Database className="h-3.5 w-3.5 text-emerald-600" />
          <span>Database & Infrastructure</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Configuration parameters updated and stored in memory.</span>
        </div>
      )}

      {/* Tab 1: General Platform */}
      {activeTab === "general" && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-w-3xl">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="border-b border-slate-200/80 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Editorial Brand & Metadata
              </h3>
              <p className="text-xs text-slate-500">
                General identification parameters displayed on public news stories and header components.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Platform Name
                </label>
                <input
                  type="text"
                  defaultValue="Abroad Bulletin"
                  className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tagline
                </label>
                <input
                  type="text"
                  defaultValue="Study Abroad Intelligence"
                  className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Editorial Contact Email
                </label>
                <input
                  type="email"
                  defaultValue="editorial@abroadbulletin.com"
                  className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Primary Timezone
                </label>
                <input
                  type="text"
                  defaultValue="UTC (GMT+0)"
                  className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
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
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="border-b border-slate-200/80 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Official RSS Ingestion Feeds
              </h3>
              <p className="text-xs text-slate-500">
                Government Atom/XML endpoints parsed via fast-xml-parser with incremental static revalidation.
              </p>
            </div>

            <div className="space-y-3">
              {rssSources.map((source) => (
                <div
                  key={source.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {source.name}
                      </span>
                      <StatusBadge
                        status={source.enabled ? "ACTIVE" : "SUSPENDED"}
                        label={source.enabled ? "Active Sync" : "Disabled"}
                        size="sm"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-xl font-mono">
                      {source.feedUrl || source.disabledReason}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-mono">
                      prefix: {source.slugPrefix}
                    </span>
                    <span className="text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-[11px]">
                      revalidate: 3600s
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
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-w-3xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Database & Microservice Architecture
              </h3>
              <p className="text-xs text-slate-500">
                PostgreSQL connector status and express backend endpoints
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">PostgreSQL (abroad_bulletin)</p>
                <p className="text-xs text-slate-500">
                  Prisma Client + Pg adapter for articles, users, and countries
                </p>
              </div>
              <StatusBadge status="ACTIVE" label="Connected" size="sm" />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Express Backend (Port 8000)</p>
                <p className="text-xs text-slate-500">
                  Admin article CRUD, RSS preview, user authentication, and CORS middleware
                </p>
              </div>
              <StatusBadge status="ACTIVE" label="Online" size="sm" />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Authentication Layer</p>
                <p className="text-xs text-slate-500">
                  JWT verification tokens, bcrypt salt rounds & role access levels
                </p>
              </div>
              <StatusBadge status="ACTIVE" label="Enforced" size="sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
