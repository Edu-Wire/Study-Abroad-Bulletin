import Link from "next/link";
import { Globe2, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-10 lg:py-16">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center">
            <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-8" />
            </span>
          </div>
          <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground">
            Welcome to Study Abroad Intelligence
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Your account is set up. Start exploring universities, scholarships, visa updates
            and the latest study-abroad news.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="h-11 inline-flex items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy">
              Go to Dashboard
            </Link>
            <Link href="/" className="h-11 inline-flex items-center justify-center rounded-md border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">
              Explore Platform
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
