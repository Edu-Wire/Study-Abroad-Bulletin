"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Globe,
  BookOpen,
  Wallet,
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { saveStudentProfile, getStudentProfile } from "@/lib/api/student";
import { getCurrentUser, type AuthUser } from "@/lib/api/auth";

// ============================================================================
// CONSTANTS
// ============================================================================

const COUNTRIES = [
  { id: "canada", name: "Canada", flag: "🇨🇦" },
  { id: "uk", name: "United Kingdom", flag: "🇬🇧" },
  { id: "usa", name: "United States", flag: "🇺🇸" },
  { id: "australia", name: "Australia", flag: "🇦🇺" },
  { id: "germany", name: "Germany", flag: "🇩🇪" },
  { id: "ireland", name: "Ireland", flag: "🇮🇪" },
  { id: "netherlands", name: "Netherlands", flag: "🇳🇱" },
  { id: "france", name: "France", flag: "🇫🇷" },
];

const STUDY_LEVELS = ["Bachelors", "Masters", "PhD", "Diploma", "Certificate"];

const INTAKES = [
  "Fall 2025",
  "Spring 2026",
  "Fall 2026",
  "Spring 2027",
  "Fall 2027",
  "Spring 2028",
];

const BUDGET_RANGES = [
  "Under $10,000",
  "$10,000 - $20,000",
  "$20,000 - $35,000",
  "$35,000 - $50,000",
  "Over $50,000",
];

const INTERESTS = [
  { id: "UNIVERSITIES", label: "Universities", icon: "🏛️" },
  { id: "ADMISSIONS", label: "Admissions", icon: "📋" },
  { id: "SCHOLARSHIPS", label: "Scholarships", icon: "🎓" },
  { id: "VISA", label: "Visa & Immigration", icon: "🛂" },
  { id: "STUDENT_LIFE", label: "Student Life", icon: "🎒" },
  { id: "CAREER", label: "Career", icon: "💼" },
  { id: "GUIDES", label: "Guides", icon: "📖" },
];

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ProfileSetupSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="shell py-12">
        <div className="mx-auto max-w-2xl space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted rounded" />
          <div className="h-64 w-full bg-muted rounded-xl" />
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// MAIN PROFILE FORM CONTENT
// ============================================================================

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isWelcome = searchParams.get("welcome") === "1";
  const urlStudentId = searchParams.get("studentId");

  // User state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Form state
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [studyLevel, setStudyLevel] = useState<string>("");
  const [degree, setDegree] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [preferredIntake, setPreferredIntake] = useState<string>("");
  const [budgetRange, setBudgetRange] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load existing profile & current user on mount
  useEffect(() => {
    Promise.allSettled([
      getStudentProfile(),
      getCurrentUser(),
    ]).then(([profileRes, userRes]) => {
      if (profileRes.status === "fulfilled" && profileRes.value.success && profileRes.value.profile) {
        const p = profileRes.value.profile;
        setTargetCountries(p.targetCountries || []);
        setStudyLevel(p.studyLevel || "");
        setDegree(p.degree || "");
        setBranch(p.branch || "");
        setPreferredIntake(p.preferredIntake || "");
        setBudgetRange(p.budgetRange || "");
        setInterests(p.interests || []);
      }

      if (userRes.status === "fulfilled" && userRes.value.success && userRes.value.user) {
        setCurrentUser(userRes.value.user);
      }
    }).finally(() => {
      setLoadingProfile(false);
    });
  }, []);

  function toggleCountry(id: string) {
    setTargetCountries((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveStudentProfile({
        targetCountries,
        studyLevel: studyLevel || null,
        degree: degree || null,
        branch: branch || null,
        preferredIntake: preferredIntake || null,
        budgetRange: budgetRange || null,
        interests,
      });
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message || "Failed to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const displayStudentId = urlStudentId || currentUser?.studentId;

  if (loadingProfile) {
    return <ProfileSetupSkeleton />;
  }

  // ─── Success state ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="text-center space-y-4">
            <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success mx-auto">
              <CheckCircle2 className="size-8" />
            </span>
            <h2 className="font-display text-2xl font-extrabold text-foreground">
              Profile Saved!
            </h2>
            <p className="text-sm text-muted-foreground">
              Redirecting you to your personalized dashboard…
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="shell py-10 lg:py-14">
        <div className="mx-auto max-w-2xl">

          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>

          {/* ── Welcome Banner for new signups ───────────────────────────── */}
          {isWelcome && (
            <div className="mb-8 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-surface p-6 shadow-xs">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <PartyPopper className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Step 2 of 2: Set Up Preferences
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-lg font-extrabold text-foreground sm:text-xl">
                    Welcome to Abroad Bulletin{currentUser?.firstName ? `, ${currentUser.firstName}` : ""}!
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm leading-relaxed">
                    Your student account is created. Fill in your goals below to instantly unlock personalized news, scholarships, and deadline alerts.
                  </p>

                  {displayStudentId && (
                    <div className="mt-4 inline-flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 shadow-xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Your Student ID:
                      </span>
                      <span className="font-mono text-base font-black text-primary tracking-wider">
                        {displayStudentId}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        (Keep this safe — you can use it to sign in anytime)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {isWelcome ? "Study Preferences" : "Personalize Your Feed"}
              </span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-foreground">
              Set Up Your Study Profile
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Tell us about your study abroad goals. We&apos;ll use this to show you
              the most relevant news, scholarships, and deadlines.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Error banner */}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* ── Section 1: Target Countries ─────────────────────────────── */}
            <fieldset className="rounded-xl border border-border bg-surface p-6">
              <legend className="flex items-center gap-2 px-1 font-display text-base font-bold text-foreground">
                <Globe className="size-4 text-primary" />
                Target Countries
              </legend>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                Select all countries you&apos;re considering studying in.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {COUNTRIES.map((country) => {
                  const selected = targetCountries.includes(country.id);
                  return (
                    <button
                      key={country.id}
                      type="button"
                      id={`country-${country.id}`}
                      onClick={() => toggleCountry(country.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs font-semibold transition-all cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <span>{country.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* ── Section 2: Study Level ──────────────────────────────────── */}
            <fieldset className="rounded-xl border border-border bg-surface p-6">
              <legend className="flex items-center gap-2 px-1 font-display text-base font-bold text-foreground">
                <GraduationCap className="size-4 text-primary" />
                Study Level
              </legend>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                What level of degree are you pursuing?
              </p>
              <div className="flex flex-wrap gap-2.5">
                {STUDY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    id={`level-${level.toLowerCase()}`}
                    onClick={() => setStudyLevel(studyLevel === level ? "" : level)}
                    className={`rounded-md border px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                      studyLevel === level
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* ── Section 3: Field of Study ───────────────────────────────── */}
            <fieldset className="rounded-xl border border-border bg-surface p-6">
              <legend className="flex items-center gap-2 px-1 font-display text-base font-bold text-foreground">
                <BookOpen className="size-4 text-primary" />
                Field of Study
              </legend>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                Your major or field — helps us match relevant programs and scholarships.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="degree-input"
                    className="block text-xs font-semibold text-foreground mb-1.5"
                  >
                    Degree / Major
                  </label>
                  <input
                    id="degree-input"
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="branch-input"
                    className="block text-xs font-semibold text-foreground mb-1.5"
                  >
                    Specialization / Branch
                  </label>
                  <input
                    id="branch-input"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Artificial Intelligence"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </fieldset>

            {/* ── Section 4: Intake & Budget ──────────────────────────────── */}
            <fieldset className="rounded-xl border border-border bg-surface p-6">
              <legend className="flex items-center gap-2 px-1 font-display text-base font-bold text-foreground">
                <Calendar className="size-4 text-primary" />
                Intake & Budget
              </legend>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                When are you planning to start and what is your annual budget?
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="intake-select"
                    className="block text-xs font-semibold text-foreground mb-1.5"
                  >
                    Preferred Intake
                  </label>
                  <select
                    id="intake-select"
                    value={preferredIntake}
                    onChange={(e) => setPreferredIntake(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select intake…</option>
                    {INTAKES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="budget-select"
                    className="block text-xs font-semibold text-foreground mb-1.5"
                  >
                    Annual Budget
                  </label>
                  <select
                    id="budget-select"
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select budget…</option>
                    {BUDGET_RANGES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* ── Section 5: Interests ────────────────────────────────────── */}
            <fieldset className="rounded-xl border border-border bg-surface p-6">
              <legend className="flex items-center gap-2 px-1 font-display text-base font-bold text-foreground">
                <Wallet className="size-4 text-primary" />
                News Interests
              </legend>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                What topics do you care about most? Select all that apply.
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {INTERESTS.map(({ id, label, icon }) => {
                  const selected = interests.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      id={`interest-${id.toLowerCase()}`}
                      onClick={() => toggleInterest(id)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs font-semibold transition-all cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* ── Submit ──────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                id="save-profile-btn"
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    {isWelcome ? "Save Profile & Go to Dashboard →" : "Save & Personalize Feed"}
                  </>
                )}
              </button>
              <Link
                id="skip-profile-btn"
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-6 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Skip for now — I&apos;ll personalise later
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                You can always set your preferences later from your dashboard.
              </p>
            </div>


          </form>
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// ROOT PAGE COMPONENT WITH SUSPENSE
// ============================================================================

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<ProfileSetupSkeleton />}>
      <ProfileSetupContent />
    </Suspense>
  );
}
