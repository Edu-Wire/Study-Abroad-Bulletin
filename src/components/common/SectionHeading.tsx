import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * SectionHeading — editorial section heading with top rule
 * Kept for backwards compatibility. New code should use SectionHeader from editorial/.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  actionHref,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="section-rule mb-3" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="eyebrow mb-2 text-primary">{eyebrow}</p>
          )}
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {action && actionHref ? (
          <Link
            href={actionHref}
            className="eyebrow hidden shrink-0 text-primary hover:text-foreground sm:block transition-colors"
          >
            {action} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
