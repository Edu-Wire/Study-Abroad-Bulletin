import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { getSessionUser } from "@/lib/server/session";

interface WelcomePageProps {
  searchParams?: Promise<{ studentId?: string }>;
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const user = await getSessionUser();
  const studentId = params?.studentId || user?.studentId;

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

          {studentId && (
            <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <span className="text-xs uppercase font-bold tracking-wider text-primary">Your Student ID</span>
              <div className="mt-1.5 flex items-center justify-center">
                <span className="font-mono text-xl font-black text-foreground tracking-wider bg-card px-4 py-1.5 rounded-md border border-border shadow-xs">
                  {studentId}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Save this ID. You can sign in using this Student ID or your email address.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href={studentId ? `/dashboard/profile?welcome=1&studentId=${encodeURIComponent(studentId)}` : "/dashboard/profile?welcome=1"}
              className="h-10 inline-flex items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-navy"
            >
              Complete Your Profile
            </Link>
            <Link
              href="/dashboard"
              className="h-10 inline-flex items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
