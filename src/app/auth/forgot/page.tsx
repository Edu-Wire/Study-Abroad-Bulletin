"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Header } from "@/components/site/Header";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-10 lg:py-16">
        <div className="w-full max-w-md">
          <div className="flex justify-center">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Globe2 className="size-5" />
            </span>
          </div>
          <h1 className="mt-6 text-center font-display text-2xl font-extrabold text-foreground">
            Reset your password
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="forgot-email" className="meta mb-1.5 block text-foreground">Email address</label>
              <input id="forgot-email" type="email" required placeholder="you@email.com" className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <button type="submit" className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy">
              Send reset link
            </button>
            <p className="text-center text-sm">
              <Link href="/auth/login" className="text-primary hover:text-navy transition-colors">← Back to login</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
