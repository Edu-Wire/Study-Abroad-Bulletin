import Link from "next/link";
import type { Guide, Deadline, VisaUpdate } from "@/data/mock";
import { CountryFlag } from "@/components/common/CountryFlag";
import { cn } from "@/lib/utils";

export function GuideCard({ guide, className }: { guide: Guide; className?: string }) {
  return (
    <article className={cn("group flex h-full flex-col border-t-2 border-foreground pt-4 transition-colors hover:border-primary", className)}>
      <span className="eyebrow text-primary">{guide.category}</span>
      <h3 className="mt-2 font-display text-base leading-snug font-bold text-foreground">
        <Link href={`/guides/${guide.id}`} className="headline-link">
          {guide.title}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
        {guide.description}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="eyebrow text-muted-foreground">{guide.readingTime}</span>
        <Link
          href={`/guides/${guide.id}`}
          className="eyebrow text-primary hover:text-foreground transition-colors"
        >
          Read →
        </Link>
      </div>
    </article>
  );
}

export function DeadlineCard({ deadline }: { deadline: Deadline }) {
  const urgent = deadline.daysLeft <= 10;
  const [dayStr, ...rest] = deadline.deadline.split(" ");
  const monthYear = rest.join(" ");

  return (
    <article className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-2.5 sm:gap-4 border-b border-border py-4">
      {/* Calendar-style date block */}
      <div className="text-center">
        <p className={cn("font-display text-2xl sm:text-3xl font-extrabold leading-none", urgent ? "text-primary" : "text-foreground")}>
          {dayStr}
        </p>
        <p className="eyebrow mt-0.5 text-muted-foreground">{monthYear}</p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "eyebrow border px-2 py-0.5",
              deadline.type === "Scholarship"
                ? "border-primary/20 bg-primary-soft text-primary"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            {deadline.type}
          </span>
          <div className="flex items-center gap-1">
            <CountryFlag country={deadline.country} size="xs" />
            <span className="eyebrow text-muted-foreground">{deadline.country}</span>
          </div>
        </div>
        <h3 className="mt-1.5 font-display text-sm font-bold text-foreground sm:text-base">
          {deadline.title}
        </h3>
      </div>

      <div className="text-right shrink-0">
        <p className={cn("font-display text-xl font-bold", urgent ? "text-primary" : "text-foreground")}>
          {deadline.daysLeft}
        </p>
        <p className="eyebrow text-muted-foreground">days</p>
      </div>
    </article>
  );
}

export function VisaUpdateCard({ update }: { update: VisaUpdate }) {
  return (
    <article className="flex flex-col border-t-2 border-foreground pt-4 pb-5 transition-colors hover:border-primary group">
      <div className="flex flex-wrap items-center gap-2">
        <CountryFlag country={update.country} size="sm" />
        <span className="eyebrow text-muted-foreground">{update.country}</span>
        {update.urgent && (
          <span className="eyebrow text-primary">Urgent</span>
        )}
      </div>
      <span className="eyebrow mt-2 text-muted-foreground border border-border bg-surface px-2 py-0.5 self-start">
        {update.visaType}
      </span>
      <h3 className="mt-3 font-display text-base leading-snug font-bold text-foreground">
        <Link href="/visa" className="headline-link">
          {update.headline}
        </Link>
      </h3>
      <footer className="mt-auto flex items-center justify-between border-t border-border pt-4 mt-4">
        <span className="meta text-muted-foreground">{update.date}</span>
        <Link href="/visa" className="eyebrow text-primary hover:text-foreground transition-colors">
          Read Update →
        </Link>
      </footer>
    </article>
  );
}
