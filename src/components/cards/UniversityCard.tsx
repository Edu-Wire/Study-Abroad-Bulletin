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
        "group flex h-full flex-col border-t-2 border-foreground pt-4 pb-5",
        "transition-colors hover:border-primary",
        className,
      )}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center bg-navy font-display text-xs font-bold text-navy-foreground"
          >
            {university.initials}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base leading-snug font-bold text-foreground">
              <Link href={`/universities/${university.id}`} className="headline-link">
                {university.name}
              </Link>
            </h3>
            <p className="eyebrow mt-1 text-muted-foreground flex items-center gap-1.5">
              <CountryFlag country={university.country} size="xs" />
              <span>{university.city}, {university.country}</span>
            </p>
          </div>
        </div>
        <BookmarkButton label={`Save ${university.name}`} />
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
        <div>
          <dt className="eyebrow text-muted-foreground">World Rank</dt>
          <dd className="mt-0.5 font-display text-base font-bold text-foreground">
            #{university.ranking}
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-muted-foreground">Tuition / yr</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {university.tuition}
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-muted-foreground">Next Intake</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {university.intake}
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-muted-foreground">IELTS Min</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {university.ielts}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {university.courses.slice(0, 3).map((course) => (
          <span
            key={course}
            className="eyebrow border border-border bg-surface px-2 py-0.5 text-muted-foreground"
          >
            {course}
          </span>
        ))}
        {university.scholarships && (
          <span className="eyebrow border border-success/25 bg-success-soft px-2 py-0.5 text-success">
            Scholarships
          </span>
        )}
      </div>

      <footer className="mt-auto flex items-center justify-between border-t border-border pt-4 mt-4">
        <span className="eyebrow text-muted-foreground">{university.degree}</span>
        <Link
          href={`/universities/${university.id}`}
          className="eyebrow text-primary hover:text-foreground transition-colors"
        >
          View Profile →
        </Link>
      </footer>
    </article>
  );
}
