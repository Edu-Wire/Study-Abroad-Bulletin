"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

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

const STATUSES: { value: ArticleStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "Draft", color: "text-amber-600" },
  { value: "PENDING_REVIEW", label: "Pending Review", color: "text-purple-600" },
  { value: "PUBLISHED", label: "Published", color: "text-emerald-600" },
  { value: "ARCHIVED", label: "Archived", color: "text-gray-500" },
  { value: "REJECTED", label: "Rejected", color: "text-rose-600" },
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

export function ArticleFormModal({ mode, initialData, onClose, onSuccess }: ArticleFormModalProps) {
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
    fetch("http://localhost:8000/api/countries")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCountries(d.countries); })
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
          ? "http://localhost:8000/api/admin/articles"
          : `http://localhost:8000/api/admin/articles/${initialData?.id}`;

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
        }, 1200);
      } else {
        setResult({ success: false, message: data.message || "Something went wrong." });
      }
    } catch {
      setResult({ success: false, message: "Could not connect to backend server." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full h-9 px-3 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-all placeholder-[#9CA3AF]";
  const labelClass = "block text-[11px] font-semibold text-[#374151] mb-1 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A33]/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E4E8EF] flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E8EF] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#1769E0]/10 text-[#1769E0] flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">
                {mode === "create" ? "Create New Article" : "Edit Article"}
              </h3>
              <p className="text-[11px] text-[#667085]">
                {mode === "create" ? "Add an editorial article to PostgreSQL" : "Update article details and status"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-[#F7F9FC] rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form id="article-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">

          {/* Status banner */}
          {result && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
                result.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
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
            <label className={labelClass}>
              URL Slug *{" "}
              {mode === "create" && (
                <span className="text-[#1769E0] normal-case font-normal ml-1">
                  {slugAutoMode ? "(auto-generated)" : "(manual)"}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. canada-study-permit-2027"
                value={form.slug}
                onChange={(e) => {
                  setSlugAutoMode(false);
                  setForm({ ...form, slug: toSlug(e.target.value) });
                }}
                className={`${inputClass} flex-1 font-mono`}
              />
              {mode === "create" && !slugAutoMode && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugAutoMode(true);
                    setForm((f) => ({ ...f, slug: toSlug(f.headline) }));
                  }}
                  className="h-9 px-3 text-[11px] font-semibold bg-[#1769E0]/10 text-[#1769E0] hover:bg-[#1769E0]/20 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* Category + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ArticleCategory })}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status *</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ArticleStatus })}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
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
              placeholder="One-paragraph summary that appears in article cards and social previews..."
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-all placeholder-[#9CA3AF] resize-none"
            />
          </div>

          {/* Full content */}
          <div>
            <label className={labelClass}>Full Article Content (Optional)</label>
            <textarea
              rows={6}
              placeholder="Full article body. Markdown or plain text. Leave blank if only a summary is available."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#E4E8EF] rounded-lg text-[#111827] text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-all placeholder-[#9CA3AF] resize-none"
            />
          </div>

          {/* Image URL + Reading Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Image URL (Optional)</label>
              <input
                type="text"
                placeholder="/images/news-canada.jpg or https://..."
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className={inputClass}
              />
              {form.image && (
                <div className="mt-1.5 h-16 w-full rounded-md border border-[#E4E8EF] bg-[#F7F9FC] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image} alt="Preview" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
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
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.breaking}
                    onChange={(e) => setForm({ ...form, breaking: e.target.checked })}
                    className="h-3.5 w-3.5 accent-[#1769E0]"
                  />
                  <span className="text-[#374151] text-[11px] font-medium">Breaking News</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-3.5 w-3.5 accent-[#1769E0]"
                  />
                  <span className="text-[#374151] text-[11px] font-medium">Featured Story</span>
                </label>
              </div>
            </div>
          </div>

          {/* Country Tags */}
          <div>
            <label className={labelClass}>Country Tags</label>
            {loadingCountries ? (
              <div className="text-[#667085] text-xs py-2">Loading countries...</div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {countries.map((c) => {
                  const selected = form.countryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCountry(c.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                        selected
                          ? "bg-[#1769E0] text-white border-[#1769E0]"
                          : "bg-white text-[#374151] border-[#E4E8EF] hover:border-[#1769E0] hover:text-[#1769E0]"
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
            <label className={labelClass}>Primary Country (for article URL / filtering)</label>
            <select
              value={form.primaryCountryId}
              onChange={(e) => setForm({ ...form, primaryCountryId: e.target.value })}
              className={inputClass}
            >
              <option value="">— None —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#E4E8EF] bg-[#F7F9FC] shrink-0 flex items-center justify-between gap-3 rounded-b-xl">
          <p className="text-[11px] text-[#667085]">
            {mode === "create" ? "Article will be saved to PostgreSQL (abroad_bulletin)" : "Changes saved to PostgreSQL live"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#4B5563] bg-white hover:bg-[#E4E8EF] border border-[#E4E8EF] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="article-form"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
