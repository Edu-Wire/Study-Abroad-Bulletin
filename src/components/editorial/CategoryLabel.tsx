import { cn } from "@/lib/utils";

/**
 * CategoryLabel — small uppercase editorial category eyebrow
 * Used above headlines, on cards, and in article metadata
 */
export function CategoryLabel({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "red" | "navy" | "success" | "muted";
  className?: string;
}) {
  const tones = {
    default: "text-primary",
    red: "text-primary",
    navy: "text-navy",
    success: "text-success",
    muted: "text-muted-foreground",
  } as const;

  return (
    <span
      className={cn(
        "eyebrow inline-block",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
