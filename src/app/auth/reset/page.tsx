"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { Header } from "@/components/site/Header";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-4 sm:py-6">
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
            Set a new password
          </h1>
          <p className="mt-1 text-center text-xs sm:text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>
          <form className="mt-5 space-y-3.5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="reset-password" className="meta mb-1 block text-foreground">New password</label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="New password"
                  className="h-10 w-full rounded-md border border-border bg-background pl-3 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reset-confirm" className="meta mb-1 block text-foreground">Confirm password</label>
              <div className="relative">
                <input
                  id="reset-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Confirm password"
                  className="h-10 w-full rounded-md border border-border bg-background pl-3 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
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
            </div>
            <button type="submit" className="h-10.5 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy cursor-pointer">
              Set new password
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
