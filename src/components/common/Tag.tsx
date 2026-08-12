import { cn } from "@/lib/utils";

/**
 * Tag — editorial tag/badge component
 * Kept flat with minimal radius. Used for scholarship types, news categories,
 * and functional UI badges.
 */
export function Tag({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "primary" | "breaking" | "success" | "navy";
  className?: string;
}) {
  const tones = {
    default: "bg-surface text-muted-foreground border-border",
    primary: "bg-primary-soft text-primary border-primary/20",
    breaking: "bg-breaking-soft text-breaking border-breaking/20",
    success: "bg-success-soft text-success border-success/20",
    navy: "bg-navy text-navy-foreground border-transparent",
  } as const;

  return (
    <span
      className={cn(
        "eyebrow inline-flex items-center border px-2 py-0.5",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MetaLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("meta text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function Dot() {
  return <span className="text-border mx-1">·</span>;
}
