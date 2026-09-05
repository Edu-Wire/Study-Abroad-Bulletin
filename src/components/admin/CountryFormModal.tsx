"use client";

import { useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, Globe } from "lucide-react";
import { adminPost, adminPut } from "@/lib/api/apiClient";

interface CountryFormData {
  id: string;
  name: string;
  code: string;
  flag: string;
  averageTuition: string;
  popularIntake: string;
  heroImage: string;
}

interface CountryFormModalProps {
  mode: "create" | "edit";
  initialData?: Partial<CountryFormData> & { id?: string };
  onClose: () => void;
  onSuccess: () => void;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_FORM: CountryFormData = {
  id: "",
  name: "",
  code: "",
  flag: "",
  averageTuition: "",
  popularIntake: "",
  heroImage: "",
};

export function CountryFormModal({
  mode,
  initialData,
  onClose,
  onSuccess,
}: CountryFormModalProps) {
  const [form, setForm] = useState<CountryFormData>({
    ...EMPTY_FORM,
    ...(initialData ?? {}),
  });
  const [idAutoMode, setIdAutoMode] = useState(mode === "create");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const data =
        mode === "create"
          ? await adminPost<{ success: boolean; message: string }>("/admin/countries", form)
          : await adminPut<{ success: boolean; message: string }>(
              `/admin/countries/${initialData?.id}`,
              form
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
          message: data.message || "Something went wrong saving the country.",
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
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#1769E0] border border-blue-100 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === "create" ? "Add Country" : "Edit Country"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === "create"
                  ? "Add a new study destination dossier"
                  : "Update destination details"}
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
          id="country-form"
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
            <label className={labelClass}>Country Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Canada"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({
                  ...f,
                  name,
                  id: idAutoMode && mode === "create" ? toSlug(name) : f.id,
                }));
              }}
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Dossier ID (slug) *
              </label>
              {mode === "create" && (
                <span className="text-[10px] text-slate-500 font-medium">
                  {idAutoMode ? "Auto-generating" : "Manual"}
                </span>
              )}
            </div>
            <input
              type="text"
              required
              disabled={mode === "edit"}
              placeholder="e.g. canada"
              value={form.id}
              onChange={(e) => {
                setIdAutoMode(false);
                setForm({ ...form, id: toSlug(e.target.value) });
              }}
              className={`${inputClass} font-mono text-[11px] disabled:opacity-60`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>ISO Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. CA"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Flag Emoji *</label>
              <input
                type="text"
                required
                placeholder="e.g. 🇨🇦"
                value={form.flag}
                onChange={(e) => setForm({ ...form, flag: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Average Tuition</label>
              <input
                type="text"
                placeholder="e.g. CAD 28,500 / yr"
                value={form.averageTuition}
                onChange={(e) => setForm({ ...form, averageTuition: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Popular Intake</label>
              <input
                type="text"
                placeholder="e.g. September"
                value={form.popularIntake}
                onChange={(e) => setForm({ ...form, popularIntake: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Hero Image URL</label>
            <input
              type="text"
              placeholder="https://... or /images/..."
              value={form.heroImage}
              onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
              className={inputClass}
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3 rounded-b-xl">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {mode === "create"
              ? "Country will be saved to PostgreSQL database"
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
              form="country-form"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1769E0] hover:bg-[#1357bd] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting
                ? "Saving..."
                : mode === "create"
                ? "Create Country"
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
