"use client";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/site/Header";

export default function ForgotPasswordPage() {
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
            Reset your password
          </h1>
          <p className="mt-1 text-center text-xs sm:text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form className="mt-5 space-y-3.5" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="forgot-email" className="meta mb-1 block text-foreground">Email address</label>
              <input id="forgot-email" type="email" required placeholder="you@email.com" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <button type="submit" className="h-10.5 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy cursor-pointer">
              Send reset link
            </button>
            <p className="text-center text-xs pt-1">
              <Link href="/auth/login" className="font-semibold text-primary hover:text-navy transition-colors">← Back to login</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
