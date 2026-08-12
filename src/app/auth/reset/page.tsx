"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { Header } from "@/components/site/Header";

export default function ResetPasswordPage() {
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
            Set a new password
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>
          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="reset-password" className="meta mb-1.5 block text-foreground">New password</label>
              <input id="reset-password" type="password" required placeholder="New password" className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="meta mb-1.5 block text-foreground">Confirm password</label>
              <input id="reset-confirm" type="password" required placeholder="Confirm password" className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary" />
            </div>
            <button type="submit" className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy">
              Set new password
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
