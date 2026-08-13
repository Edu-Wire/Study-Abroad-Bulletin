import Link from "next/link";
import { Globe2, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-md text-center rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex justify-center">
            <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-7" />
            </span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-foreground">
            Welcome to Study Abroad Intelligence
          </h1>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
            Your account is set up. Start exploring universities, scholarships, visa updates
            and the latest study-abroad news.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="h-10 inline-flex items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy">
              Go to Dashboard
            </Link>
            <Link href="/" className="h-10 inline-flex items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">
              Explore Platform
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
