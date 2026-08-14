"use client";

export function NewsletterCard({
  variant = "light",
  className,
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  // The standalone newsletter card is now rendered inside the Footer.
  // This component is kept for backward compatibility with any pages
  // that import it independently.
  if (variant === "dark") return null; // Footer handles the dark version

  return (
    <section className={`border border-border bg-surface py-8 px-4 sm:px-8 ${className ?? ""}`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <div className="min-w-0">
          <p className="eyebrow text-primary mb-2">The Weekly Briefing</p>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Get every deadline and opportunity.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Universities, scholarships, visa changes and opportunities worth knowing —
            delivered to international students every week.
          </p>
        </div>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            required
            placeholder="Your email address"
            aria-label="Email address"
            className="h-12 w-full min-w-0 border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
          />
          <button
            type="submit"
            className="h-12 w-full bg-primary px-5 eyebrow text-primary-foreground transition-opacity hover:opacity-90"
          >
            Subscribe →
          </button>
        </form>
      </div>
    </section>
  );
}
