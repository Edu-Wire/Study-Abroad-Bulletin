import { cn } from "@/lib/utils";

/**
 * ArticleMeta — compact date · read time · author metadata
 * Used across article cards, article pages, and briefing sections
 */
export function ArticleMeta({
  date,
  readTime,
  author,
  className,
}: {
  date: string;
  readTime?: string;
  author?: string;
  className?: string;
}) {
  return (
    <p className={cn("meta text-muted-foreground", className)}>
      {date}
      {readTime && (
        <>
          <span className="mx-1.5 opacity-40">·</span>
          {readTime}
        </>
      )}
      {author && (
        <>
          <span className="mx-1.5 opacity-40">·</span>
          {author}
        </>
      )}
    </p>
  );
}
