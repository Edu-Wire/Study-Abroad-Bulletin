import Link from "next/link";
import { cn } from "@/lib/utils";
import { SectionRule } from "@/components/editorial/EditorialRule";

/**
 * SectionHeader — editorial newspaper section heading
 * Features a thick top rule, large section title, subtitle, and action link.
 * Replaces the previous SectionHeading component with stronger editorial feel.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  actionHref,
  className,
  ruled = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: string;
  actionHref?: string;
  className?: string;
  ruled?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {ruled && <SectionRule />}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="eyebrow mb-2 text-primary">{eyebrow}</p>
          )}
          <h2 className="font-display text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {action && actionHref && (
          <Link
            href={actionHref}
            className="eyebrow shrink-0 text-primary hover:text-foreground transition-colors hidden sm:block"
          >
            {action} →
          </Link>
        )}
      </div>
    </div>
  );
}
