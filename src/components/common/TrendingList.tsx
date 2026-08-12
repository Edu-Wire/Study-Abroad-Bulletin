import Link from "next/link";
import { cn } from "@/lib/utils";

export function TrendingList({
  title,
  items,
  numbered = false,
  hrefBase = "/news",
  className,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
  hrefBase?: string;
  className?: string;
}) {
  return (
    <section className={cn("border-t-2 border-navy pt-4", className)}>
      <h3 className="meta mb-3 text-navy">{title}</h3>
      <ol className="divide-y divide-border">
        {items.map((item, index) => (
          <li key={item}>
            <Link
              href={hrefBase}
              className="flex gap-3 py-3 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {numbered ? (
                <span className="meta w-4 shrink-0 pt-0.5 text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
              ) : (
                <span aria-hidden className="pt-0.5 text-primary">
                  ›
                </span>
              )}
              <span className="min-w-0">{item}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
