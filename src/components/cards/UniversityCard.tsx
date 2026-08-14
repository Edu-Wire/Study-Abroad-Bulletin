import Link from "next/link";
import type { University } from "@/data/mock";
import { BookmarkButton } from "@/components/common/BookmarkButton";
import { CountryFlag } from "@/components/common/CountryFlag";
import { cn } from "@/lib/utils";

export function UniversityCard({
  university,
  className,
}: {
  university: University;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col border-t-2 border-foreground pt-4 pb-5 min-w-0",
        "transition-colors hover:border-primary",
        className,
      )}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5 sm:gap-3 min-w-0">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center bg-navy font-display text-xs font-bold text-navy-foreground"
          >
            {university.initials}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm sm:text-base leading-snug font-bold text-foreground">
              <Link href={`/universities/${university.id}`} className="headline-link">
                {university.name}
              </Link>
            </h3>
            <p className="eyebrow mt-1 text-muted-foreground flex items-center gap-1.5 min-w-0">
              <CountryFlag country={university.country} size="xs" />
              <span className="truncate">{university.city}, {university.country}</span>
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <BookmarkButton label={`Save ${university.name}`} />
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-3 border-t border-border pt-4 min-w-0">
        <div className="min-w-0">
          <dt className="eyebrow text-muted-foreground truncate">World Rank</dt>
          <dd className="mt-0.5 font-display text-base font-bold text-foreground truncate">
            #{university.ranking}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-muted-foreground truncate">Tuition / yr</dt>
          <dd className="mt-0.5 text-xs sm:text-sm font-semibold text-foreground truncate">
            {university.tuition}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-muted-foreground truncate">Next Intake</dt>
          <dd className="mt-0.5 text-xs sm:text-sm font-semibold text-foreground truncate">
            {university.intake}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="eyebrow text-muted-foreground truncate">IELTS Min</dt>
          <dd className="mt-0.5 text-xs sm:text-sm font-semibold text-foreground truncate">
            {university.ielts}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5 min-w-0">
        {university.courses.slice(0, 3).map((course) => (
          <span
            key={course}
            className="eyebrow border border-border bg-surface px-2 py-0.5 text-muted-foreground truncate max-w-full"
          >
            {course}
          </span>
        ))}
        {university.scholarships && (
          <span className="eyebrow border border-success/25 bg-success-soft px-2 py-0.5 text-success shrink-0">
            Scholarships
          </span>
        )}
      </div>

      <footer className="mt-auto flex items-center justify-between border-t border-border pt-4 mt-4 min-w-0">
        <span className="eyebrow text-muted-foreground truncate mr-2">{university.degree}</span>
        <Link
          href={`/universities/${university.id}`}
          className="eyebrow text-primary hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
        >
          View Profile →
        </Link>
      </footer>
    </article>
  );
}
