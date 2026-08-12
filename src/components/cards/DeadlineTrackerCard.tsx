import Link from "next/link";
import { CountryFlag } from "@/components/common/CountryFlag";
import type { ImmigrationDeadline } from "@/data/immigrationDeadlines";
import { cn } from "@/lib/utils";

interface DeadlineTrackerCardProps {
  deadline: ImmigrationDeadline;
  className?: string;
}

export function DeadlineTrackerCard({ deadline, className }: DeadlineTrackerCardProps) {
  const statusStyles: Record<string, string> = {
    "Closing Soon": "border-primary/30 bg-primary-soft text-primary",
    Upcoming: "border-border bg-surface text-foreground",
    Updated: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    Passed: "border-border bg-muted/40 text-muted-foreground",
  };

  const formattedDate = new Date(deadline.deadline).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article
      className={cn(
        "group flex flex-col justify-between border-t-2 border-foreground bg-background pt-4 transition-colors hover:border-primary",
        className
      )}
    >
      <div>
        {/* Top bar: Flag + Type + Status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CountryFlag country={deadline.country} size="xs" />
            <span className="eyebrow text-muted-foreground">{deadline.country}</span>
            <span className="text-border">·</span>
            <span className="eyebrow text-primary">{deadline.deadlineType}</span>
          </div>
          <span
            className={cn(
              "eyebrow border px-2 py-0.5 text-[0.6875rem]",
              statusStyles[deadline.status] ?? "border-border bg-surface text-foreground"
            )}
          >
            {deadline.status}
          </span>
        </div>

        {/* Date Display */}
        <div className="mt-3">
          <p className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {formattedDate}
          </p>
        </div>

        {/* Title */}
        <h3 className="mt-2 font-display text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
          <Link href={`/immigration-tracker/${deadline.slug}`} className="headline-link">
            {deadline.title}
          </Link>
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {deadline.description}
        </p>
      </div>

      {/* Footer / CTA */}
      <div className="mt-6 flex items-center justify-between border-t border-border pt-3">
        <span className="eyebrow text-muted-foreground text-xs">
          Updated {deadline.lastUpdated}
        </span>
        <Link
          href={`/immigration-tracker/${deadline.slug}`}
          className="eyebrow text-primary group-hover:underline flex items-center gap-1"
        >
          <span>View Details</span>
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}
