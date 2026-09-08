"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Award } from "lucide-react";
import { adminGet, adminPost, adminPut } from "@/lib/api/apiClient";

type ScholarshipType = "FULLY_FUNDED" | "PARTIAL" | "TUITION_WAIVER";

interface Country {
  id: string;
  name: string;
  flag: string;
}

interface University {
  id: string;
  name: string;
}

interface ScholarshipFormData {
  id?: string;
  slug: string;
  name: string;
  organization: string;
  funding: string;
  degree: string;
  deadline: string;
  deadlineString: string;
  eligibility: string;
  type: ScholarshipType;
  universityId: string;
  countryIds: string[];
}

interface ScholarshipFormModalProps {
  mode: "create" | "edit";
  initialData?: Partial<ScholarshipFormData> & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

const TYPES: { value: ScholarshipType; label: string }[] = [
  { value: "FULLY_FUNDED", label: "Fully Funded" },
  { value: "PARTIAL", label: "Partial" },
  { value: "TUITION_WAIVER", label: "Tuition Waiver" },
];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_FORM: ScholarshipFormData = {
  slug: "",
  name: "",
  organization: "",
  funding: "",
  degree: "",
  deadline: "",
  deadlineString: "",
  eligibility: "",
  type: "FULLY_FUNDED",
  universityId: "",
  countryIds: [],
};

export function ScholarshipFormModal({
  mode,
  initialData,
  onClose,
  onSuccess,
}: ScholarshipFormModalProps) {
  const [form, setForm] = useState<ScholarshipFormData>({
    ...EMPTY_FORM,
    ...(initialData ?? {}),
    countryIds: initialData?.countryIds ?? [],
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [slugAutoMode, setSlugAutoMode] = useState(mode === "create");

  useEffect(() => {
    Promise.all([
      adminGet<{ success: boolean; countries: Country[] }>("/countries"),
      adminGet<{ success: boolean; universities: University[] }>("/admin/universities"),
    ])
      .then(([countriesRes, universitiesRes]) => {
        if (countriesRes.success) setCountries(countriesRes.countries);
        if (universitiesRes.success) setUniversities(universitiesRes.universities);
      })
      .catch(console.error)
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (slugAutoMode && form.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors ArticleFormModal's slug-sync pattern
      setForm((f) => ({ ...f, slug: toSlug(f.name) }));
    }
  }, [form.name, slugAutoMode]);

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

    const payload = {
      ...form,
      universityId: form.universityId || null,
      deadline: form.deadline || null,
    };

    try {
      const data =
        mode === "create"
          ? await adminPost<{ success: boolean; message: string }>(
              "/admin/scholarships",
              payload
            )
          : await adminPut<{ success: boolean; message: string }>(
              `/admin/scholarships/${initialData?.id}`,
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
          message: data.message || "Something went wrong saving the scholarship.",
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
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === "create" ? "Add Scholarship" : "Edit Scholarship"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === "create"
                  ? "Add a scholarship award to the directory"
                  : "Update scholarship details"}
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
          id="scholarship-form"
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
            <label className={labelClass}>Award Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chevening Scholarship"
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
            <input
              type="text"
              required
              placeholder="e.g. chevening-scholarship"
              value={form.slug}
              onChange={(e) => {
                setSlugAutoMode(false);
                setForm({ ...form, slug: toSlug(e.target.value) });
              }}
              className={`${inputClass} font-mono text-[11px]`}
            />
          </div>

          <div>
            <label className={labelClass}>Organization *</label>
            <input
              type="text"
              required
              placeholder="e.g. UK Government"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Funding Type *</label>
              <select
                required
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ScholarshipType })}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Degree Level *</label>
              <input
                type="text"
                required
                placeholder="e.g. Masters"
                value={form.degree}
                onChange={(e) => setForm({ ...form, degree: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Funding Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Full tuition + living stipend"
              value={form.funding}
              onChange={(e) => setForm({ ...form, funding: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Deadline Date</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Deadline Label *</label>
              <input
                type="text"
                required
                placeholder="e.g. 30 September 2026"
                value={form.deadlineString}
                onChange={(e) => setForm({ ...form, deadlineString: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Eligibility *</label>
            <textarea
              required
              rows={3}
              placeholder="Who can apply for this award..."
              value={form.eligibility}
              onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-[#1769E0] focus:bg-white transition-colors placeholder-slate-400 resize-none"
            />
          </div>

          <div>
            <label className={labelClass}>Linked University (optional)</label>
            <select
              value={form.universityId}
              onChange={(e) => setForm({ ...form, universityId: e.target.value })}
              className={inputClass}
              disabled={loadingOptions}
            >
              <option value="">— None —</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Destination Countries</label>
            {loadingOptions ? (
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
        </form>

        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3 rounded-b-xl">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {mode === "create"
              ? "Scholarship will be saved to PostgreSQL database"
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
              form="scholarship-form"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting
                ? "Saving..."
                : mode === "create"
                ? "Create Scholarship"
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
