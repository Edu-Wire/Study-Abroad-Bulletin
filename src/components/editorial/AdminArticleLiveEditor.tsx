"use client";

/**
 * AdminArticleLiveEditor
 *
 * True In-Place WYSIWYG Editor for the Article Page.
 *
 * Features (Option A: Direct Visual In-Place Controls):
 *  - Fixed floating top toolbar: Back to Admin, Status Badge, Breaking/Featured toggles, Edit/View Mode toggle, Save, Publish.
 *  - In-Place Category Selector (Interactive pill dropdown).
 *  - In-Place Primary Country & Flag Selector (Interactive dropdown).
 *  - Hero Image Overlay with Image URL input & preset library picker.
 *  - In-Place Headline (`<h1>`) & Summary (`<p>`) editing.
 *  - In-Place Body Paragraphs editing with per-paragraph `+` insert & `🗑️` delete.
 *  - Inline Reading Time with Auto-Calculate button.
 *  - Interactive Country Tag Associations multi-selector in Topics section.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { adminPut, adminPatch } from "@/lib/api/apiClient";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Camera,
  Zap,
  Sparkles,
  Clock,
  Globe,
  UploadCloud,
  FolderOpen,
  ImageIcon,
  Link as LinkIcon,
} from "lucide-react";
import { CountryFlag } from "@/components/common/CountryFlag";
import { ArticleShare } from "@/components/common/ArticleShare";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

export interface LiveEditorArticle {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content: string | null;
  category: string;
  image: string | null;
  status: string;
  isRss: boolean;
  sourceUrl?: string | null;
  sourceName?: string | null;
  country?: string;
  date?: string;
  readingTime?: string;
  breaking?: boolean;
  featured?: boolean;
  primaryCountryId?: string | null;
  countryIds?: string[];
}

interface AdminArticleLiveEditorProps {
  article: LiveEditorArticle;
}

interface CountryOption {
  id: string;
  name: string;
  flag: string;
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "VISA", label: "Visa & Immigration" },
  { value: "UNIVERSITIES", label: "Universities" },
  { value: "ADMISSIONS", label: "Admissions" },
  { value: "SCHOLARSHIPS", label: "Scholarships" },
  { value: "STUDENT_LIFE", label: "Student Life" },
  { value: "CAREER", label: "Career" },
];

const CATEGORY_LABELS: Record<string, string> = {
  VISA: "Visa & Immigration",
  UNIVERSITIES: "Universities",
  ADMISSIONS: "Admissions",
  SCHOLARSHIPS: "Scholarships",
  STUDENT_LIFE: "Student Life",
  CAREER: "Career",
};

const PRESET_IMAGES = [
  { label: "Canada Campus", url: "/images/news-canada-hero.jpg" },
  { label: "UK University", url: "/images/news-uk.jpg" },
  { label: "Australia Campus", url: "/images/news-australia.jpg" },
  { label: "Germany University", url: "/images/news-germany.jpg" },
  { label: "Scholarship & Grants", url: "/images/news-scholarship.jpg" },
  { label: "Visa & Passport", url: "/images/news-visa.jpg" },
  { label: "Modern Library", url: "/images/news-library.jpg" },
  { label: "Hero Campus", url: "/images/hero-campus.jpg" },
];

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED:      "bg-emerald-100 text-emerald-700 border-emerald-300",
  DRAFT:          "bg-amber-100  text-amber-700  border-amber-300",
  ARCHIVED:       "bg-slate-100  text-slate-600  border-slate-300",
  PENDING_REVIEW: "bg-blue-100   text-blue-700   border-blue-300",
  REJECTED:       "bg-red-100    text-red-600    border-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED:      "Published",
  DRAFT:          "Draft",
  ARCHIVED:       "Archived",
  PENDING_REVIEW: "Pending Review",
  REJECTED:       "Rejected",
};

function parseBody(content: string | null): string[] {
  if (!content) return [""];
  const cleaned = content
    .replace(/<\/?(p|div|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const list = cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
  return list.length > 0 ? list : [""];
}

function rebuildContent(paragraphs: string[]): string {
  return paragraphs.map((p) => p.trim()).filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminArticleLiveEditor({ article }: AdminArticleLiveEditorProps) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [currentStatus, setCurrentStatus] = useState(article.status);

  // In-place editable state
  const [headline, setHeadline] = useState(article.headline);
  const [summary, setSummary] = useState(article.summary);
  const [paragraphs, setParagraphs] = useState<string[]>(() => parseBody(article.content));
  const [category, setCategory] = useState(article.category);
  const [image, setImage] = useState(article.image || "/images/news-library.jpg");
  const [readingTime, setReadingTime] = useState(article.readingTime || "3 min read");
  const [breaking, setBreaking] = useState(Boolean(article.breaking));
  const [featured, setFeatured] = useState(Boolean(article.featured));
  const [primaryCountryId, setPrimaryCountryId] = useState(article.primaryCountryId || "");
  const [countryIds, setCountryIds] = useState<string[]>(article.countryIds || []);

  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");

  // Image Upload / Gallery states
  const [imageTab, setImageTab] = useState<"upload" | "library" | "url">("upload");
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Countries data
  const [countries, setCountries] = useState<CountryOption[]>([]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(type: "success" | "error", message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function handleFileSelect(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select a valid image file (PNG, JPG, JPEG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "Image file is too large (maximum 10 MB)");
      return;
    }

    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    setUploadedFileName(file.name);
    setUploadedFileSize(formattedSize);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setUploadedFilePreview(dataUrl);
      }
    };
    reader.onerror = () => {
      showToast("error", "Failed to read image file from your device");
    };
    reader.readAsDataURL(file);
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API_BASE}/api/countries`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.countries)) {
          setCountries(d.countries);
        }
      })
      .catch(console.error);
  }, [API_BASE]);

  // ---------------------------------------------------------------------------
  // Link lock & Unsaved Changes Protection during Edit Mode
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!editMode) {
      document.body.classList.remove("admin-edit-mode-active");
      return;
    }

    document.body.classList.add("admin-edit-mode-active");

    // Intercept clicks on links outside the floating toolbar and modals
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const link = target.closest("a");
      if (!link) return;

      // Allow toolbar buttons and modal elements
      if (
        link.closest("#admin-live-editor-toolbar") ||
        link.closest("#admin-back-btn") ||
        link.getAttribute("role") === "button"
      ) {
        return;
      }

      // Block link navigation
      e.preventDefault();
      e.stopPropagation();
      showToast("error", "⚠️ Links are locked while editing. Click 'View Mode' or 'Save' first.");
    };

    // Warn if closing tab with unsaved edits
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("click", handleGlobalClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.body.classList.remove("admin-edit-mode-active");
      document.removeEventListener("click", handleGlobalClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [editMode]);

  function autoCalculateReadingTime() {
    const fullText = `${headline} ${summary} ${paragraphs.join(" ")}`;
    const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.ceil(wordCount / 200));
    setReadingTime(`${mins} min read`);
    showToast("success", `Calculated ${mins} min read (${wordCount} words)`);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await adminPut<{ success: boolean; message?: string }>(
        `/admin/articles/${article.id}`,
        {
          slug: article.slug,
          headline: headline.trim(),
          summary: summary.trim(),
          content: rebuildContent(paragraphs),
          category,
          image: image || null,
          readingTime: readingTime || "3 min read",
          breaking,
          featured,
          status: currentStatus,
          primaryCountryId: primaryCountryId || null,
          countryIds,
        }
      );
      if (!data.success) {
        throw new Error(data?.message || "Save failed.");
      }
      showToast("success", "All article changes saved successfully!");
      router.refresh();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      // 1. Save all fields with status PUBLISHED
      const putData = await adminPut<{ success: boolean; message?: string }>(
        `/admin/articles/${article.id}`,
        {
          slug: article.slug,
          headline: headline.trim(),
          summary: summary.trim(),
          content: rebuildContent(paragraphs),
          category,
          image: image || null,
          readingTime: readingTime || "3 min read",
          breaking,
          featured,
          status: "PUBLISHED",
          primaryCountryId: primaryCountryId || null,
          countryIds,
        }
      );
      if (!putData.success) {
        throw new Error(putData?.message || "Save failed.");
      }

      // 2. Status transition
      const patchData = await adminPatch<{ success: boolean; message?: string }>(
        `/admin/articles/${article.id}/status`,
        { status: "PUBLISHED" }
      );
      if (!patchData.success) {
        throw new Error(patchData?.message || "Status update failed.");
      }
      setCurrentStatus("PUBLISHED");
      showToast("success", "Story published successfully! 🎉");
      router.refresh();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  function handleBack() {
    window.close();
    setTimeout(() => { window.location.href = "/admin/news"; }, 300);
  }

  function updateParagraph(index: number, value: string) {
    setParagraphs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addParagraph(afterIndex: number) {
    setParagraphs((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, "");
      return next;
    });
  }

  function removeParagraph(index: number) {
    setParagraphs((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }

  function toggleCountryTag(cId: string) {
    setCountryIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  }

  useEffect(() => {
    setParagraphs(parseBody(article.content));
    setHeadline(article.headline);
    setSummary(article.summary);
    setCategory(article.category);
    setImage(article.image || "/images/news-library.jpg");
    setReadingTime(article.readingTime || "3 min read");
    setBreaking(Boolean(article.breaking));
    setFeatured(Boolean(article.featured));
    setPrimaryCountryId(article.primaryCountryId || "");
    setCountryIds(article.countryIds || []);
  }, [article]);

  const selectedPrimaryCountry = countries.find((c) => c.id === primaryCountryId);
  const statusColor = STATUS_COLORS[currentStatus] ?? "bg-slate-100 text-slate-600 border-slate-300";
  const statusLabel = STATUS_LABELS[currentStatus] ?? currentStatus;

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Fixed Floating Admin Bar                                            */}
      {/* ------------------------------------------------------------------ */}
      <div
        id="admin-live-editor-toolbar"
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-2 px-3 py-2
                   bg-[#0f172a]/95 backdrop-blur-md border-b border-white/10 shadow-2xl text-xs"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Left — back + status + badges */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            id="admin-back-btn"
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Admin</span>
          </button>
          <div className="w-px h-4 bg-white/15" />
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${statusColor}`}
          >
            {currentStatus === "PUBLISHED" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {statusLabel}
          </span>
          {article.isRss && (
            <span className="text-slate-400 font-medium hidden md:inline truncate max-w-[100px]">
              RSS
            </span>
          )}
        </div>

        {/* Center — Editorial Toggles (Breaking / Featured) */}
        {editMode && (
          <div className="hidden lg:flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setBreaking((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all ${
                breaking
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Breaking News strip"
            >
              <Zap className="h-3 w-3" />
              <span>Breaking {breaking ? "ON" : "OFF"}</span>
            </button>
            <button
              type="button"
              onClick={() => setFeatured((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-all ${
                featured
                  ? "bg-indigo-500 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Featured Cover Story"
            >
              <Sparkles className="h-3 w-3" />
              <span>Featured {featured ? "ON" : "OFF"}</span>
            </button>
          </div>
        )}

        {/* Right — edit toggle + save + publish */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            id="admin-edit-toggle-btn"
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center gap-1.5 font-semibold rounded px-2.5 py-1.5 transition-all ${
              editMode
                ? "bg-amber-500 text-white hover:bg-amber-400 shadow-sm"
                : "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white"
            }`}
          >
            {editMode ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>View Mode</span>
              </>
            ) : (
              <>
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Mode</span>
              </>
            )}
          </button>

          {/* Save button */}
          <button
            id="admin-save-btn"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 font-semibold rounded px-2.5 py-1.5
                       bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{saving ? "Saving…" : "Save"}</span>
          </button>

          {/* Publish button — always accessible for instant live publishing */}
          <button
            id="admin-publish-btn"
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 font-semibold rounded px-3 py-1.5
                       bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            title="Publish all story changes live to the website"
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>
              {publishing
                ? "Publishing…"
                : currentStatus === "PUBLISHED"
                ? "Publish Updates Live"
                : "Publish Story"}
            </span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Toast Notification                                                 */}
      {/* ------------------------------------------------------------------ */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[10000] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm text-sm font-medium transition-all
            ${toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
            }`}
        >
          {toast.type === "success"
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            : <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-current/60 hover:text-current transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Change Image Modal (Device Upload, Gallery, Presets)                 */}
      {/* ------------------------------------------------------------------ */}
      {showImageModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50">
              <div className="flex items-center gap-2.5">
                <Camera className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Featured Hero Image</h3>
                  <p className="text-[11px] text-muted-foreground">Upload from your device or pick a preset photo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border bg-surface/30 px-6 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setImageTab("upload")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  imageTab === "upload"
                    ? "border-primary text-primary bg-background rounded-t-lg shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Upload from Device</span>
              </button>
              <button
                type="button"
                onClick={() => setImageTab("library")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  imageTab === "library"
                    ? "border-primary text-primary bg-background rounded-t-lg shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Preset Library</span>
              </button>
              <button
                type="button"
                onClick={() => setImageTab("url")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  imageTab === "url"
                    ? "border-primary text-primary bg-background rounded-t-lg shadow-sm"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Image URL</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Tab 1: Upload from Device */}
              {imageTab === "upload" && (
                <div className="space-y-4">
                  {/* Hidden native file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />

                  {uploadedFilePreview ? (
                    /* Live Upload Preview Card */
                    <div className="space-y-3">
                      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border-2 border-primary shadow-md bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={uploadedFilePreview}
                          alt="Uploaded preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                          <Check className="h-3.5 w-3.5" /> Ready to apply
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-surface border border-border p-3 rounded-lg text-xs">
                        <div className="truncate pr-2">
                          <p className="font-semibold text-foreground truncate">{uploadedFileName}</p>
                          <p className="text-muted-foreground">{uploadedFileSize}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
                        >
                          Change File
                        </button>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImage(uploadedFilePreview);
                            setShowImageModal(false);
                            showToast("success", "Photo uploaded and set as featured image! 🎉");
                          }}
                          className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-xs font-bold hover:opacity-90 shadow transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="h-4 w-4" /> Use This Photo as Featured Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFilePreview(null);
                            setUploadedFileName("");
                            setUploadedFileSize("");
                          }}
                          className="px-3 py-2.5 text-xs font-semibold border border-border rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Drag & Drop Upload Zone */
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.01]"
                          : "border-border hover:border-primary/60 hover:bg-surface/60"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Click to browse or drag & drop photo</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose any photo from your computer, tablet, or phone gallery
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg shadow-sm hover:opacity-90 transition-opacity mt-1">
                        <FolderOpen className="h-3.5 w-3.5" /> Browse Photos
                      </span>
                      <p className="text-[11px] text-muted-foreground/80">
                        Supports PNG, JPG, JPEG, WEBP (up to 10 MB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Preset Library */}
              {imageTab === "library" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Click any editorial photo from our curated library to apply it instantly:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => {
                          setImage(preset.url);
                          setShowImageModal(false);
                          showToast("success", `Selected ${preset.label}`);
                        }}
                        className={`group relative rounded-xl overflow-hidden border-2 text-left transition-all ${
                          image === preset.url
                            ? "border-primary ring-2 ring-primary/30 shadow-md"
                            : "border-border hover:border-primary/60 hover:shadow-sm"
                        }`}
                      >
                        <div className="aspect-[16/10] relative bg-muted">
                          <Image
                            src={preset.url}
                            alt={preset.label}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {image === preset.url && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <span className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-surface text-[11px] font-semibold text-foreground truncate">
                          {preset.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Custom URL */}
              {imageTab === "url" && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-foreground">
                    Paste Image Web Address (URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or /images/..."
                      className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customImageUrl.trim()) {
                          setImage(customImageUrl.trim());
                          setShowImageModal(false);
                          showToast("success", "Custom image applied!");
                        }
                      }}
                      className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-surface border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-xs font-semibold border border-border rounded-lg hover:bg-background text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* In-Place Editable Article Content Area                              */}
      {/* ------------------------------------------------------------------ */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          {/* Breaking News Alert Toggle / Badge */}
          {editMode ? (
            <button
              type="button"
              onClick={() => setBreaking((v) => !v)}
              className={`eyebrow rounded px-2.5 py-0.5 flex items-center gap-1.5 border transition-all text-xs font-semibold ${
                breaking
                  ? "bg-red-600 text-white border-red-700 shadow-sm"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Toggle Breaking News Alert"
            >
              <Zap className={`h-3 w-3 ${breaking ? "text-amber-300 fill-amber-300" : "text-amber-500"}`} />
              <span>Breaking Alert {breaking ? "✓ ON" : "+"}</span>
            </button>
          ) : (
            breaking && (
              <span className="eyebrow border border-red-500/40 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 flex items-center gap-1 font-bold">
                <Zap className="h-3 w-3 text-red-600 fill-red-600" /> Breaking
              </span>
            )
          )}

          {/* Featured Cover Story Toggle / Badge */}
          {editMode ? (
            <button
              type="button"
              onClick={() => setFeatured((v) => !v)}
              className={`eyebrow rounded px-2.5 py-0.5 flex items-center gap-1.5 border transition-all text-xs font-semibold ${
                featured
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                  : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Toggle Featured Cover Story"
            >
              <Sparkles className={`h-3 w-3 ${featured ? "text-amber-300 fill-amber-300" : "text-indigo-500"}`} />
              <span>Cover Story {featured ? "✓ ON" : "+"}</span>
            </button>
          ) : (
            featured && (
              <span className="eyebrow border border-indigo-500/40 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 flex items-center gap-1 font-bold">
                <Sparkles className="h-3 w-3 text-indigo-600 fill-indigo-600" /> Featured Cover Story
              </span>
            )
          )}

          {/* Category Dropdown Pill */}
          {editMode ? (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryDropdown((v) => !v);
                  setShowCountryDropdown(false);
                }}
                className="eyebrow text-primary bg-primary/10 border border-primary/40 rounded px-2.5 py-0.5 hover:bg-primary/20 flex items-center gap-1 transition-colors"
              >
                <span>{CATEGORY_LABELS[category] || category}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showCategoryDropdown && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-xl z-50 py-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setCategory(cat.value);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors ${
                        category === cat.value ? "text-primary font-bold bg-primary/5" : "text-foreground"
                      }`}
                    >
                      <span>{cat.label}</span>
                      {category === cat.value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="eyebrow text-primary">{CATEGORY_LABELS[category] || category}</span>
          )}

          <span className="text-border">·</span>

          {/* Primary Country & Flag Dropdown */}
          {editMode ? (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => {
                  setShowCountryDropdown((v) => !v);
                  setShowCategoryDropdown(false);
                }}
                className="eyebrow text-foreground bg-surface border border-border rounded px-2.5 py-0.5 hover:bg-surface/80 flex items-center gap-1.5 transition-colors"
              >
                {selectedPrimaryCountry ? (
                  <>
                    <CountryFlag country={selectedPrimaryCountry.name} size="xs" />
                    <span>{selectedPrimaryCountry.name}</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span>Global</span>
                  </>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {showCountryDropdown && (
                <div className="absolute left-0 top-full mt-1 w-52 max-h-60 overflow-y-auto bg-background border border-border rounded-lg shadow-xl z-50 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPrimaryCountryId("");
                      setShowCountryDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium flex items-center justify-between hover:bg-primary/10 hover:text-primary ${
                      !primaryCountryId ? "text-primary font-bold bg-primary/5" : "text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3" /> Global / General
                    </span>
                    {!primaryCountryId && <Check className="h-3 w-3" />}
                  </button>
                  {countries.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setPrimaryCountryId(c.id);
                        setShowCountryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors ${
                        primaryCountryId === c.id ? "text-primary font-bold bg-primary/5" : "text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CountryFlag country={c.name} size="xs" />
                        {c.name}
                      </span>
                      {primaryCountryId === c.id && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {selectedPrimaryCountry && selectedPrimaryCountry.name !== "Global" && (
                <CountryFlag country={selectedPrimaryCountry.name} size="xs" />
              )}
              <span className="eyebrow text-muted-foreground">
                {selectedPrimaryCountry?.name || article.country || "Global"}
              </span>
            </div>
          )}

          {editMode && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded">
              <Edit3 className="h-3 w-3" /> Live Editing
            </span>
          )}
        </div>

        {/* In-Place Headline */}
        {editMode ? (
          <div className="relative group/headline mt-3">
            <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">
              Headline
            </label>
            <textarea
              id="admin-headline-input"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border-2 border-dashed border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 p-2.5
                         font-display text-3xl leading-tight font-extrabold text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.1]
                         focus:outline-none focus:border-amber-500 focus:bg-amber-50/70 transition-all"
              placeholder="Article headline…"
            />
          </div>
        ) : (
          <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            {headline}
          </h1>
        )}

        {/* In-Place Summary */}
        {editMode ? (
          <div className="relative group/summary mt-3">
            <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">
              Summary / Standfirst
            </label>
            <textarea
              id="admin-summary-input"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border-2 border-dashed border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 p-2.5
                         text-lg leading-relaxed text-muted-foreground
                         focus:outline-none focus:border-amber-500 focus:bg-amber-50/70 transition-all"
              placeholder="Article summary…"
            />
          </div>
        ) : (
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            {summary}
          </p>
        )}

        {/* Author / Date / Reading Time Meta */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="eyebrow text-muted-foreground">
              {article.isRss ? (article.sourceName || "RSS Feed") : "By Editorial Team"}
            </p>
            <span className="text-border">·</span>
            <p className="eyebrow text-muted-foreground">{article.date || "Today"}</p>
            <span className="text-border">·</span>

            {/* Reading Time */}
            {editMode ? (
              <div className="inline-flex items-center gap-1.5 bg-amber-50/60 dark:bg-amber-950/20 border border-dashed border-amber-400 rounded px-2 py-0.5">
                <Clock className="h-3 w-3 text-amber-600" />
                <input
                  type="text"
                  value={readingTime}
                  onChange={(e) => setReadingTime(e.target.value)}
                  className="w-20 bg-transparent text-xs font-semibold text-foreground focus:outline-none"
                  placeholder="4 min read"
                />
                <button
                  type="button"
                  onClick={autoCalculateReadingTime}
                  title="Auto calculate reading time from word count"
                  className="text-[10px] font-bold text-amber-700 bg-amber-200/80 hover:bg-amber-300 px-1 rounded transition-colors"
                >
                  ⚡ Auto
                </button>
              </div>
            ) : (
              <p className="eyebrow text-muted-foreground">{readingTime}</p>
            )}
          </div>
          <ArticleShare title={headline} />
        </div>
      </header>

      {/* Hero Image + Change Image Overlay */}
      <div className="mt-6 overflow-hidden relative group/hero rounded-lg">
        <Image
          src={image || "/images/news-library.jpg"}
          alt={headline}
          width={1280}
          height={720}
          priority
          unoptimized={Boolean(image && (image.startsWith("data:") || image.startsWith("blob:")))}
          className="aspect-[16/9] w-full object-cover"
        />

        {/* Change Image Button in Edit Mode */}
        {editMode && (
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/hero:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="flex items-center gap-2 bg-slate-900/90 text-white hover:bg-primary px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl backdrop-blur-sm transition-all transform hover:scale-105"
            >
              <Camera className="h-4 w-4" />
              Change Featured Image
            </button>
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Illustrative editorial image · Study Abroad Intelligence
        </p>
      </div>

      {/* In-Place Body Content */}
      <div className="article-prose mt-6 space-y-4">
        {editMode ? (
          <>
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Edit3 className="h-3 w-3" /> Body Content (Click to edit paragraphs)
            </div>
            {paragraphs.map((para, i) => (
              <div key={i} className="relative group/para">
                <textarea
                  id={`admin-para-input-${i}`}
                  value={para}
                  onChange={(e) => updateParagraph(i, e.target.value)}
                  rows={Math.max(2, Math.ceil(para.length / 80))}
                  className="w-full resize-y rounded-md border-2 border-dashed border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 p-3
                             text-base text-foreground leading-relaxed
                             focus:outline-none focus:border-amber-500 focus:bg-amber-50/70 transition-all"
                  placeholder={`Paragraph ${i + 1}…`}
                />
                {/* Paragraph action buttons */}
                <div className="absolute right-2 top-2 flex items-center gap-1 bg-background shadow border border-border rounded-md px-1.5 py-0.5 opacity-0 group-hover/para:opacity-100 group-focus-within/para:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={() => addParagraph(i)}
                    title="Add paragraph below"
                    className="p-1 text-slate-600 hover:text-emerald-600 rounded transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  {paragraphs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(i)}
                      title="Remove this paragraph"
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addParagraph(paragraphs.length - 1)}
              className="w-full py-2.5 rounded-lg border-2 border-dashed border-amber-300 text-amber-700 dark:text-amber-400 text-sm font-semibold
                         hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-400 transition-all flex items-center justify-center gap-2 mt-3"
            >
              <Plus className="h-4 w-4" /> Add New Paragraph
            </button>
          </>
        ) : (
          /* View Mode */
          <>
            {paragraphs.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </>
        )}

        {/* RSS Source attribution block */}
        {article.isRss && (
          <div className="mt-6 border border-border bg-surface p-5">
            <p className="eyebrow text-muted-foreground mb-1">Original Source</p>
            <p className="font-semibold text-foreground">{article.sourceName || "Official RSS Feed"}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This article was imported from the official feed. You can edit its content directly above.
            </p>
            {article.sourceUrl && (
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 border border-primary px-3.5 py-1.5 eyebrow text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                Read original source →
              </a>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Country Tag Associations in Topics Section                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-8 border-t border-border pt-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="eyebrow text-muted-foreground">Destination & Country Tags</p>
          {editMode && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTagDropdown((v) => !v)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Country Tag
              </button>
              {showTagDropdown && (
                <div className="absolute right-0 bottom-full mb-1 w-48 max-h-48 overflow-y-auto bg-background border border-border rounded-lg shadow-xl z-50 py-1">
                  {countries
                    .filter((c) => !countryIds.includes(c.id))
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          toggleCountryTag(c.id);
                          setShowTagDropdown(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary flex items-center gap-2"
                      >
                        <CountryFlag country={c.name} size="xs" />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  {countries.filter((c) => !countryIds.includes(c.id)).length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">All countries added</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Base tags */}
          <span className="border border-border bg-surface px-2.5 py-1 eyebrow text-muted-foreground">
            {CATEGORY_LABELS[category] || category}
          </span>

          {/* Primary country tag */}
          {selectedPrimaryCountry && (
            <span className="border border-primary/30 bg-primary/5 px-2.5 py-1 eyebrow text-primary flex items-center gap-1.5">
              <CountryFlag country={selectedPrimaryCountry.name} size="xs" />
              {selectedPrimaryCountry.name} (Primary)
            </span>
          )}

          {/* Secondary country tags */}
          {countryIds.map((cId) => {
            const countryObj = countries.find((c) => c.id === cId);
            if (!countryObj) return null;
            return (
              <span
                key={cId}
                className="border border-border bg-surface px-2.5 py-1 eyebrow text-foreground flex items-center gap-1.5"
              >
                <CountryFlag country={countryObj.name} size="xs" />
                <span>{countryObj.name}</span>
                {editMode && (
                  <button
                    type="button"
                    onClick={() => toggleCountryTag(cId)}
                    className="hover:text-red-500 text-muted-foreground ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Global CSS to lock & dim external links while editing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body.admin-edit-mode-active a:not(#admin-live-editor-toolbar a):not(#admin-back-btn) {
              cursor: not-allowed !important;
              opacity: 0.7;
              transition: opacity 0.2s ease;
            }
            body.admin-edit-mode-active aside,
            body.admin-edit-mode-active #related-stories-section {
              opacity: 0.7;
              transition: opacity 0.2s ease;
            }
          `,
        }}
      />
    </>
  );
}



