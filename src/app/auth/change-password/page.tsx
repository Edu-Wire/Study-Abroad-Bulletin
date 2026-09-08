import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = {
  title: "Change password | Abroad Bulletin",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * The form reads `required` and `redirect` from the query string via
 * useSearchParams, which cannot run during prerendering. A Suspense boundary
 * lets the surrounding shell prerender while the form renders on the client.
 */
export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <ChangePasswordForm />
    </Suspense>
  );
}
