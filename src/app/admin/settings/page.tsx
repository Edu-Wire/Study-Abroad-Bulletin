"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Settings, Rss, Database, Server, Save, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminGet, adminPut } from "@/lib/api/apiClient";
import { getContentSources } from "@/lib/content-sources";

interface SiteSettings {
  platformName: string;
  tagline: string;
  contactEmail: string;
  timezone: string;
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "rss" | "database">("general");

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const [sourceCount, setSourceCount] = useState<number | null>(null);
  const [enabledSourceCount, setEnabledSourceCount] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminGet<{ success: boolean; settings: SiteSettings }>("/admin/settings")
      .then((d) => {
        if (d.success) setSettings(d.settings);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: effect syncs state to route/prop changes. Tracked for follow-up.
    load();
  }, [load]);

  useEffect(() => {
    getContentSources().then((result) => {
      setSourceCount(result.data.length);
      setEnabledSourceCount(result.data.filter((s) => s.enabled).length);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const d = await adminPut<{ success: boolean; settings: SiteSettings }>("/admin/settings", settings);
      if (d.success) {
        setSettings(d.settings);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
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

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200/80 text-xs font-medium">
          {error}
        </div>
      )}

      {savedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Configuration parameters updated and stored in the database.</span>
        </div>
      )}

      {/* Tab 1: General Platform */}
      {activeTab === "general" && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] max-w-3xl">
          {loading || !settings ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings...
            </div>
          ) : (
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
                    value={settings.platformName}
                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                    className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.tagline}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
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
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Primary Timezone
                  </label>
                  <input
                    type="text"
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/80 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "Saving..." : "Save General Settings"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tab 2: RSS Feeds */}
      {activeTab === "rss" && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="border-b border-slate-200/80 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Automated Source Ingestion
              </h3>
              <p className="text-xs text-slate-500">
                Government and institutional feeds are managed on the dedicated Sources page, which shows
                real health, sync state, and per-country breakdowns.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">
                  <span className="text-lg font-bold text-slate-900">
                    {sourceCount ?? "—"}
                  </span>{" "}
                  configured sources,{" "}
                  <span className="font-semibold text-slate-900">{enabledSourceCount ?? "—"}</span> currently
                  enabled
                </p>
              </div>
              <Link
                href="/admin/sources"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1769E0] hover:bg-[#1357bd] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
              >
                <span>Manage Sources</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
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
                  HttpOnly session cookies, bcrypt password hashing & role-based access middleware
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
