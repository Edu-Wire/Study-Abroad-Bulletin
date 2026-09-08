"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { changePassword } from "@/lib/api/auth";
import { LogoutButton } from "@/components/auth/LogoutButton";

/** Mirrors StrongPasswordSchema in backend/src/validators/index.js. */
const RULES = [
  { label: "At least 12 characters", test: (v: string) => v.length >= 12 },
  { label: "A lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "An uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "A digit", test: (v: string) => /[0-9]/.test(v) },
  { label: "A symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Set when an administrator issued a temporary password, in which case the
  // user cannot proceed anywhere else until this is done.
  const required = searchParams.get("required") === "1";
  const redirectTo = searchParams.get("redirect") || "/admin";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unmetRules = RULES.filter((rule) => !rule.test(newPassword));
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    unmetRules.length === 0 &&
    !mismatch &&
    confirmPassword.length > 0 &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("The new password must differ from your current password.");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        // The flag is cleared server-side; refresh so the admin layout and any
        // server components re-resolve the session.
        router.replace(redirectTo);
        router.refresh();
      } else {
        setError(res.message || "Failed to update password.");
      }
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "";
      setError(message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs">
          <div className="flex justify-center">
            <Image
              src="/logo/ab-logo.png"
              alt="Abroad Bulletin Logo"
              width={120}
              height={120}
              priority
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>

          <h1 className="mt-3 text-center font-display text-xl sm:text-2xl font-extrabold text-foreground">
            {required ? "Set your own password" : "Change your password"}
          </h1>

          <p className="mt-1 text-center text-xs sm:text-sm text-muted-foreground">
            {required
              ? "Your account was created with a temporary password. Choose your own to continue."
              : "Signing in elsewhere will be ended once you save."}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-xs font-semibold text-foreground"
              >
                {required ? "Temporary password" : "Current password"}
              </label>
              <div className="relative mt-1.5">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background pl-3 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  title={showCurrentPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold text-foreground"
              >
                New password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-describedby="password-rules"
                  className="h-10 w-full rounded-md border border-border bg-background pl-3 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  title={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <ul id="password-rules" className="mt-2 space-y-1">
                {RULES.map((rule) => {
                  const met = rule.test(newPassword);
                  return (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-[0.6875rem] ${
                        met ? "text-emerald-600" : "text-muted-foreground"
                      }`}
                    >
                      <span aria-hidden="true">{met ? "✓" : "•"}</span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-foreground"
              >
                Confirm new password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background pl-3 pr-10 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="mt-1.5 text-[0.6875rem] text-destructive">
                  The two passwords do not match.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save password"}
            </button>
          </form>

          <div className="mt-5 border-t border-border pt-4 text-center">
            <LogoutButton variant="text" />
          </div>
        </div>
      </main>
    </div>
  );
}
