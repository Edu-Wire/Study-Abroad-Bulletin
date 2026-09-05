"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, GraduationCap } from "lucide-react";
import { adminGet, adminPost, adminPut } from "@/lib/api/apiClient";

interface Country {
  id: string;
  name: string;
  flag: string;
}

interface UniversityFormData {
  id?: string;
  slug: string;
  name: string;
  initials: string;
  countryId: string;
  city: string;
  ranking: number | string;
  tuition: string;
  tuitionValue: number | string;
  courses: string[];
  scholarships: boolean;
  intake: string;
  degree: string;
  ielts: string;
}

interface UniversityFormModalProps {
  mode: "create" | "edit";
  initialData?: Partial<UniversityFormData> & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

const DEGREES = ["Bachelors", "Masters", "Both"];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_FORM: UniversityFormData = {
  slug: "",
  name: "",
  initials: "",
  countryId: "",
  city: "",
  ranking: "",
  tuition: "",
  tuitionValue: "",
  courses: [],
  scholarships: true,
  intake: "September 2027",
  degree: "Both",
  ielts: "6.5",
};

export function UniversityFormModal({
  mode,
  initialData,
  onClose,
  onSuccess,
}: UniversityFormModalProps) {
  const [form, setForm] = useState<UniversityFormData>({
    ...EMPTY_FORM,
    ...(initialData ?? {}),
    courses: initialData?.courses ?? [],
  });
  const [coursesText, setCoursesText] = useState(
    (initialData?.courses ?? []).join(", ")
  );
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [slugAutoMode, setSlugAutoMode] = useState(mode === "create");

  useEffect(() => {
    adminGet<{ success: boolean; countries: Country[] }>("/countries")
      .then((d) => {
        if (d.success && Array.isArray(d.countries)) {
          setCountries(d.countries);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCountries(false));
  }, []);

  useEffect(() => {
    if (slugAutoMode && form.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors ArticleFormModal's slug-sync pattern
      setForm((f) => ({ ...f, slug: toSlug(f.name) }));
    }
  }, [form.name, slugAutoMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const payload = {
      ...form,
      ranking: Number(form.ranking),
      tuitionValue: Number(form.tuitionValue),
      courses: coursesText
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    };

    try {
      const data =
        mode === "create"
          ? await adminPost<{ success: boolean; message: string }>(
              "/admin/universities",
              payload
            )
          : await adminPut<{ success: boolean; message: string }>(
              `/admin/universities/${initialData?.id}`,
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
          message: data.message || "Something went wrong saving the university.",
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
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === "create" ? "Add University" : "Edit University"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === "create"
                  ? "Add an institution to the partner directory"
                  : "Update institution details"}
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
          id="university-form"
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
            <label className={labelClass}>Institution Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. University of Toronto"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

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
                placeholder="e.g. university-of-toronto"
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
                    setForm((f) => ({ ...f, slug: toSlug(f.name) }));
                  }}
                  className="h-9 px-3 text-[11px] font-semibold bg-blue-50 text-[#1769E0] hover:bg-blue-100 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Auto
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Initials *</label>
              <input
                type="text"
                required
                maxLength={4}
                placeholder="e.g. UOT"
                value={form.initials}
                onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input
                type="text"
                required
                placeholder="e.g. Toronto"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputClass}
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
              <label className={labelClass}>Global Ranking *</label>
              <input
                type="number"
                required
                min={1}
                placeholder="e.g. 21"
                value={form.ranking}
                onChange={(e) => setForm({ ...form, ranking: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Degree Level</label>
              <select
                value={form.degree}
                onChange={(e) => setForm({ ...form, degree: e.target.value })}
                className={inputClass}
              >
                {DEGREES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tuition Label *</label>
              <input
                type="text"
                required
                placeholder="e.g. CAD 45,000 / yr"
                value={form.tuition}
                onChange={(e) => setForm({ ...form, tuition: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tuition Value (annual) *</label>
              <input
                type="number"
                required
                min={0}
                placeholder="e.g. 45000"
                value={form.tuitionValue}
                onChange={(e) => setForm({ ...form, tuitionValue: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Intake</label>
              <input
                type="text"
                placeholder="e.g. September 2027"
                value={form.intake}
                onChange={(e) => setForm({ ...form, intake: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>IELTS Requirement</label>
              <input
                type="text"
                placeholder="e.g. 6.5"
                value={form.ielts}
                onChange={(e) => setForm({ ...form, ielts: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Popular Courses (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Computer Science, MBA, Data Science"
              value={coursesText}
              onChange={(e) => setCoursesText(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-6 p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.scholarships}
                onChange={(e) => setForm({ ...form, scholarships: e.target.checked })}
                className="h-4 w-4 rounded text-[#1769E0] focus:ring-[#1769E0]"
              />
              <span className="text-slate-800 text-xs font-semibold">
                Scholarships Available
              </span>
            </label>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3 rounded-b-xl">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {mode === "create"
              ? "University will be saved to PostgreSQL database"
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
              form="university-form"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting
                ? "Saving..."
                : mode === "create"
                ? "Create University"
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
