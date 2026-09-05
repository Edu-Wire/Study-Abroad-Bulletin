"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { adminGet, adminPost, adminPut } from "@/lib/api/apiClient";

type DeadlineType = "VISA" | "IMMIGRATION" | "APPLICATION" | "REGISTRATION" | "POLICY" | "SCHOLARSHIP";
type DeadlineStatus = "UPCOMING" | "CLOSING_SOON" | "PASSED" | "UPDATED";
type DeadlineImportance = "CRITICAL" | "HIGH" | "MEDIUM";

interface Country {
  id: string;
  name: string;
  flag: string;
}

interface DeadlineFormData {
  id: string;
  slug: string;
  title: string;
  countryId: string;
  deadlineDate: string;
  deadlineType: DeadlineType;
  status: DeadlineStatus;
  importance: DeadlineImportance;
  description: string;
  source: string;
  lastUpdated: string;
  relatedArticleTitle: string;
  relatedArticleHref: string;
  applicationUrl: string;
  tags: string[];
  content: string;
}

interface DeadlineFormModalProps {
  mode: "create" | "edit";
  initialData?: Partial<DeadlineFormData> & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES: DeadlineType[] = ["VISA", "IMMIGRATION", "APPLICATION", "REGISTRATION", "POLICY", "SCHOLARSHIP"];
const STATUSES: DeadlineStatus[] = ["UPCOMING", "CLOSING_SOON", "PASSED", "UPDATED"];
const IMPORTANCE_LEVELS: DeadlineImportance[] = ["CRITICAL", "HIGH", "MEDIUM"];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_FORM: DeadlineFormData = {
  id: "",
  slug: "",
  title: "",
  countryId: "",
  deadlineDate: "",
  deadlineType: "APPLICATION",
  status: "UPCOMING",
  importance: "MEDIUM",
  description: "",
  source: "",
  lastUpdated: "",
  relatedArticleTitle: "",
  relatedArticleHref: "",
  applicationUrl: "",
  tags: [],
  content: "",
};

export function DeadlineFormModal({
  mode,
  initialData,
  onClose,
  onSuccess,
}: DeadlineFormModalProps) {
  const [form, setForm] = useState<DeadlineFormData>({
    ...EMPTY_FORM,
    ...(initialData ?? {}),
    tags: initialData?.tags ?? [],
  });
  const [tagsText, setTagsText] = useState((initialData?.tags ?? []).join(", "));
  const [idAutoMode, setIdAutoMode] = useState(mode === "create");
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    adminGet<{ success: boolean; countries: Country[] }>("/countries")
      .then((d) => {
        if (d.success && Array.isArray(d.countries)) setCountries(d.countries);
      })
      .catch(console.error)
      .finally(() => setLoadingCountries(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const payload = {
      ...form,
      relatedArticleTitle: form.relatedArticleTitle || null,
      relatedArticleHref: form.relatedArticleHref || null,
      applicationUrl: form.applicationUrl || null,
      content: form.content || null,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      const data =
        mode === "create"
          ? await adminPost<{ success: boolean; message: string }>("/admin/deadlines", payload)
          : await adminPut<{ success: boolean; message: string }>(
              `/admin/deadlines/${initialData?.id}`,
              payload
            );

      if (data.success) {
        setResult({ success: true, message: data.message });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1100);
      } else {
        setResult({
          success: false,
          message: data.message || "Something went wrong saving the deadline.",
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Could not connect to backend server. Is it running on port 8000?",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors placeholder-slate-400";
  const labelClass =
    "block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1769E0] border border-blue-100 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === "create" ? "Add Deadline" : "Edit Deadline"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === "create"
                  ? "Track a new intake, visa, or grant deadline"
                  : "Update deadline details"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          id="deadline-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs"
        >
          {result && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs font-medium ${
                result.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                  : "bg-rose-50 text-rose-800 border border-rose-200/80"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Canada PGWP Fall 2026 Intake Deadline"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  slug: idAutoMode && mode === "create" ? toSlug(title) : f.slug,
                  id: idAutoMode && mode === "create" ? toSlug(title) : f.id,
                }));
              }}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Deadline ID *
                </label>
                {mode === "create" && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    {idAutoMode ? "Auto" : "Manual"}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                disabled={mode === "edit"}
                placeholder="e.g. ca-pgwp-fall-2026"
                value={form.id}
                onChange={(e) => {
                  setIdAutoMode(false);
                  setForm({ ...form, id: toSlug(e.target.value) });
                }}
                className={`${inputClass} font-mono text-[11px] disabled:opacity-60`}
              />
            </div>
            <div>
              <label className={labelClass}>URL Slug *</label>
              <input
                type="text"
                required
                placeholder="e.g. ca-pgwp-fall-2026"
                value={form.slug}
                onChange={(e) => {
                  setIdAutoMode(false);
                  setForm({ ...form, slug: toSlug(e.target.value) });
                }}
                className={`${inputClass} font-mono text-[11px]`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Country *</label>
            <select
              required
              value={form.countryId}
              onChange={(e) => setForm({ ...form, countryId: e.target.value })}
              className={inputClass}
              disabled={loadingCountries}
            >
              <option value="">— Select country —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Deadline Date *</label>
              <input
                type="date"
                required
                value={form.deadlineDate}
                onChange={(e) => setForm({ ...form, deadlineDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Type *</label>
              <select
                required
                value={form.deadlineType}
                onChange={(e) => setForm({ ...form, deadlineType: e.target.value as DeadlineType })}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status *</label>
              <select
                required
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as DeadlineStatus })}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Importance *</label>
              <select
                required
                value={form.importance}
                onChange={(e) => setForm({ ...form, importance: e.target.value as DeadlineImportance })}
                className={inputClass}
              >
                {IMPORTANCE_LEVELS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              required
              rows={3}
              placeholder="What is changing or due, and who it affects..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors placeholder-slate-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Source *</label>
              <input
                type="text"
                required
                placeholder="e.g. IRCC Official Notice"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Last Updated Label *</label>
              <input
                type="text"
                required
                placeholder="e.g. 2 days ago"
                value={form.lastUpdated}
                onChange={(e) => setForm({ ...form, lastUpdated: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Application URL</label>
            <input
              type="text"
              placeholder="https://..."
              value={form.applicationUrl}
              onChange={(e) => setForm({ ...form, applicationUrl: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Related Article Title</label>
              <input
                type="text"
                placeholder="Optional linked news headline"
                value={form.relatedArticleTitle}
                onChange={(e) => setForm({ ...form, relatedArticleTitle: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Related Article Link</label>
              <input
                type="text"
                placeholder="/news/..."
                value={form.relatedArticleHref}
                onChange={(e) => setForm({ ...form, relatedArticleHref: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. PGWP, Study Permit, Fall 2026"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Full Content (Optional)</label>
            <textarea
              rows={5}
              placeholder="Full explainer content in markdown or formatted text..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors placeholder-slate-400 resize-none font-mono text-[11px]"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3 rounded-b-xl">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {mode === "create"
              ? "Deadline will be saved to PostgreSQL database"
              : "Updates will reflect live immediately"}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="deadline-form"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting
                ? "Saving..."
                : mode === "create"
                ? "Create Deadline"
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
