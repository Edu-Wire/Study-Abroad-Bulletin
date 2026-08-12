import Link from "next/link";
import type { Scholarship } from "@/data/mock";
import { BookmarkButton } from "@/components/common/BookmarkButton";
import { CountryFlag } from "@/components/common/CountryFlag";
import { cn } from "@/lib/utils";

export function ScholarshipCard({
  scholarship,
  className,
}: {
  scholarship: Scholarship;
  className?: string;
}) {
  const closingSoon = scholarship.daysLeft <= 14;
  const fullyFunded = scholarship.type === "Fully Funded";

  return (
    <article
      className={cn(
        "group flex h-full flex-col border-t-2 pt-4 pb-5 transition-colors",
        closingSoon ? "border-primary" : "border-foreground hover:border-primary",
        className,
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "eyebrow border px-2 py-0.5",
                fullyFunded
                  ? "border-success/25 bg-success-soft text-success"
                  : "border-border bg-surface text-muted-foreground",
              )}
            >
              {scholarship.type}
            </span>
            <div className="flex items-center gap-1">
              <CountryFlag country={scholarship.country} size="xs" />
              <span className="eyebrow text-muted-foreground">{scholarship.country}</span>
            </div>
            {closingSoon && (
              <span className="eyebrow text-primary">Closing Soon</span>
            )}
          </div>
          <h3 className="mt-2 font-display text-base leading-snug font-bold text-foreground">
            <Link href={`/scholarships/${scholarship.id}`} className="headline-link">
              {scholarship.name}
            </Link>
          </h3>
          <p className="eyebrow mt-1 text-muted-foreground">{scholarship.organization}</p>
        </div>
        <BookmarkButton label={`Save ${scholarship.name}`} />
      </div>

      <dl className="mt-4 space-y-2.5 border-t border-border pt-4">
        <div className="flex justify-between gap-4">
          <dt className="eyebrow text-muted-foreground">Country</dt>
          <dd className="text-sm font-semibold text-foreground">{scholarship.country}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="eyebrow text-muted-foreground">Funding</dt>
          <dd className="text-right text-sm font-semibold text-foreground">{scholarship.funding}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="eyebrow text-muted-foreground">Degree</dt>
          <dd className="text-sm font-semibold text-foreground">{scholarship.degree}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="eyebrow text-muted-foreground">Deadline</dt>
          <dd
            className={cn(
              "text-sm font-semibold",
              closingSoon ? "text-primary" : "text-foreground",
            )}
          >
            {scholarship.deadline}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {scholarship.eligibility}
      </p>

      <footer className="mt-auto flex items-center justify-between border-t border-border pt-4 mt-4">
        <span
          className={cn(
            "eyebrow",
            closingSoon ? "text-primary" : "text-muted-foreground",
          )}
        >
          {scholarship.daysLeft} days left
        </span>
        <Link
          href={`/scholarships/${scholarship.id}`}
          className="eyebrow text-primary hover:text-foreground transition-colors"
        >
          View Details →
        </Link>
      </footer>
    </article>
  );
}
