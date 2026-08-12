"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Header } from "@/components/site/Header";

export default function LoginPage() {
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
            Sign in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:text-navy transition-colors">
              Get started
            </Link>
          </p>

          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="login-email" className="meta mb-1.5 block text-foreground">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="meta mb-1.5 block text-foreground">
                  Password
                </label>
                <Link
                  href="/auth/forgot"
                  className="text-xs text-primary hover:text-navy transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>
            <button
              type="submit"
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy"
            >
              Sign in
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
