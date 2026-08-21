"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, FileEdit, Globe } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/base-url";

type ArticleStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED" | "REJECTED";
type ArticleCategory = "UNIVERSITIES" | "ADMISSIONS" | "SCHOLARSHIPS" | "VISA" | "STUDENT_LIFE" | "CAREER";

interface Country {
  id: string;
  name: string;
  flag: string;
}

interface ArticleFormData {
  id?: string;
  slug: string;
  headline: string;
  summary: string;
  content: string;
  category: ArticleCategory;
  image: string;
  readingTime: string;
  breaking: boolean;
  featured: boolean;
  status: ArticleStatus;
  primaryCountryId: string;
  countryIds: string[];
}

interface ArticleFormModalProps {
  mode: "create" | "edit";
  initialData?: Partial<ArticleFormData> & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: "VISA", label: "Visa & Immigration" },
  { value: "UNIVERSITIES", label: "Universities" },
  { value: "ADMISSIONS", label: "Admissions" },
  { value: "SCHOLARSHIPS", label: "Scholarships" },
  { value: "STUDENT_LIFE", label: "Student Life" },
  { value: "CAREER", label: "Career" },
];

const STATUSES: { value: ArticleStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "REJECTED", label: "Rejected" },
];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_FORM: ArticleFormData = {
  slug: "",
  headline: "",
  summary: "",
  content: "",
  category: "VISA",
  image: "",
  readingTime: "4 min read",
  breaking: false,
  featured: false,
  status: "DRAFT",
  primaryCountryId: "",
  countryIds: [],
};

export function ArticleFormModal({
  mode,
  initialData,
  onClose,
  onSuccess,
}: ArticleFormModalProps) {
  const [form, setForm] = useState<ArticleFormData>({
    ...EMPTY_FORM,
    ...(initialData ?? {}),
    countryIds: initialData?.countryIds ?? [],
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [slugAutoMode, setSlugAutoMode] = useState(mode === "create");

  // Fetch countries for dropdowns
  useEffect(() => {
    fetch(`${API_BASE_URL}/countries`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCountries(d.countries);
      })
      .catch(console.error)
      .finally(() => setLoadingCountries(false));
  }, []);

  // Auto-generate slug from headline while in create mode
  useEffect(() => {
    if (slugAutoMode && form.headline) {
      setForm((f) => ({ ...f, slug: toSlug(f.headline) }));
    }
  }, [form.headline, slugAutoMode]);

  const toggleCountry = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      countryIds: f.countryIds.includes(id)
        ? f.countryIds.filter((c) => c !== id)
        : [...f.countryIds, id],
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const url =
        mode === "create"
          ? `${API_BASE_URL}/admin/articles`
          : `${API_BASE_URL}/admin/articles/${initialData?.id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          primaryCountryId: form.primaryCountryId || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult({ success: true, message: data.message });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1100);
      } else {
        setResult({
          success: false,
          message: data.message || "Something went wrong saving the article.",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "Could not connect to backend server.",
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
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1769E0] border border-blue-100 flex items-center justify-center shrink-0">
              <FileEdit className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === "create" ? "Create Editorial Article" : "Edit Article"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === "create"
                  ? "Draft or publish news to AbroadBulletin"
                  : "Update story headline, metadata, and status"}
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

        {/* Scrollable Form Body */}
        <form
          id="article-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs"
        >
          {/* Status Message Banner */}
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

          {/* Headline */}
          <div>
            <label className={labelClass}>Headline *</label>
            <input
              type="text"
              required
              placeholder="e.g. Canada Announces New Study Permit Rules for 2027"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Slug */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                URL Slug *
              </label>
              {mode === "create" && (
                <span className="text-[10px] text-slate-500 font-medium">
                  {slugAutoMode ? "Auto-generating" : "Manual"}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. canada-study-permit-rules-2027"
                value={form.slug}
                onChange={(e) => {
                  setSlugAutoMode(false);
                  setForm({ ...form, slug: toSlug(e.target.value) });
                }}
                className={`${inputClass} flex-1 font-mono text-[11px]`}
              />
              {mode === "create" && !slugAutoMode && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugAutoMode(true);
                    setForm((f) => ({ ...f, slug: toSlug(f.headline) }));
                  }}
                  className="h-9 px-3 text-[11px] font-semibold bg-blue-50 text-[#1769E0] hover:bg-blue-100 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* Category + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as ArticleCategory })
                }
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Publication Status *</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ArticleStatus })
                }
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className={labelClass}>Summary / Excerpt *</label>
            <textarea
              required
              rows={3}
              placeholder="One-paragraph editorial summary for previews and search engine snippets..."
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors placeholder-slate-400 resize-none"
            />
          </div>

          {/* Full content */}
          <div>
            <label className={labelClass}>Full Article Content (Optional)</label>
            <textarea
              rows={6}
              placeholder="Full article content in markdown or formatted text..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors placeholder-slate-400 resize-none font-mono text-[11px]"
            />
          </div>

          {/* Image URL + Reading Time row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Image URL</label>
              <input
                type="text"
                placeholder="https://... or /images/..."
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Reading Time</label>
              <input
                type="text"
                placeholder="4 min read"
                value={form.readingTime}
                onChange={(e) => setForm({ ...form, readingTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Flags / Checkboxes */}
          <div className="flex items-center gap-6 p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.breaking}
                onChange={(e) =>
                  setForm({ ...form, breaking: e.target.checked })
                }
                className="h-4 w-4 rounded text-[#1769E0] focus:ring-[#1769E0]"
              />
              <span className="text-slate-800 text-xs font-semibold">
                Breaking News Alert
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
                className="h-4 w-4 rounded text-[#1769E0] focus:ring-[#1769E0]"
              />
              <span className="text-slate-800 text-xs font-semibold">
                Featured Cover Story
              </span>
            </label>
          </div>

          {/* Country Selection Tags */}
          <div>
            <label className={labelClass}>Country Tag Associations</label>
            {loadingCountries ? (
              <div className="text-slate-400 text-xs py-2">Loading country list...</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {countries.map((c) => {
                  const selected = form.countryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCountry(c.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#1769E0] text-white border-[#1769E0]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Country */}
          <div>
            <label className={labelClass}>Primary Country</label>
            <select
              value={form.primaryCountryId}
              onChange={(e) =>
                setForm({ ...form, primaryCountryId: e.target.value })
              }
              className={inputClass}
            >
              <option value="">— Select primary destination —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3 rounded-b-xl">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {mode === "create"
              ? "Article will be saved to PostgreSQL database"
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
              form="article-form"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting
                ? "Saving..."
                : mode === "create"
                ? "Create Article"
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
