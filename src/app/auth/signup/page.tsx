"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Header } from "@/components/site/Header";

export default function SignupPage() {
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
            Create your account
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:text-navy transition-colors">
              Sign in
            </Link>
          </p>

          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-first" className="meta mb-1.5 block text-foreground">First name</label>
                <input id="signup-first" type="text" required placeholder="First" className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary" />
              </div>
              <div>
                <label htmlFor="signup-last" className="meta mb-1.5 block text-foreground">Last name</label>
                <input id="signup-last" type="text" required placeholder="Last" className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary" />
              </div>
            </div>
            <div>
              <label htmlFor="signup-email" className="meta mb-1.5 block text-foreground">Email</label>
              <input id="signup-email" type="email" required autoComplete="email" placeholder="you@email.com" className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div>
              <label htmlFor="signup-password" className="meta mb-1.5 block text-foreground">Password</label>
              <input id="signup-password" type="password" required autoComplete="new-password" placeholder="Create a password" className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <button type="submit" className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy">
              Create account
            </button>
            <p className="text-center text-xs text-muted-foreground">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-primary transition-colors">Terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
