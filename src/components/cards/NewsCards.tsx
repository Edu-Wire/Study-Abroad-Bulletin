import Image from "next/image";
import Link from "next/link";
import type { NewsArticle } from "@/data/mock";
import { CountryFlag } from "@/components/common/CountryFlag";
import { cn } from "@/lib/utils";

function CategoryEyebrow({ category, country, breaking }: {
  category: string;
  country?: string;
  breaking?: boolean;
}) {
  const showFlag = country && country !== "Global";
  return (
    <div className="flex items-center gap-2">
      {breaking && (
        <span className="eyebrow text-primary">Breaking</span>
      )}
      <span className="eyebrow text-primary">{category}</span>
      {country && (
        <>
          <span className="text-border">·</span>
          <div className="flex items-center gap-1">
            {showFlag && <CountryFlag country={country} size="xs" />}
            <span className="eyebrow text-muted-foreground">{country}</span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * FeaturedNewsCard — primary lead story card for hero and briefing sections
 * Large image, dominant headline, summary, compact metadata
 */
export function FeaturedNewsCard({
  article,
  className,
}: {
  article: NewsArticle;
  className?: string;
}) {
  return (
    <article className={cn("group", className)}>
      <Link href={`/news/${article.slug}`} className="block overflow-hidden">
        <Image
          src={article.image}
          alt={article.headline}
          width={1280}
          height={800}
          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </Link>
      <div className="mt-4">
        <CategoryEyebrow
          category={article.category}
          country={article.country}
          breaking={article.breaking}
        />
        <h3 className="mt-2 font-display text-2xl leading-tight font-extrabold text-foreground sm:text-3xl lg:text-4xl">
          <Link href={`/news/${article.slug}`} className="headline-link">
            {article.headline}
          </Link>
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-2xl">
          {article.summary}
        </p>
        <p className="meta mt-3 text-muted-foreground">
          {article.date}
          <span className="mx-1.5 opacity-40">·</span>
          {article.readingTime}
        </p>
      </div>
    </article>
  );
}

/**
 * NewsCard — standard editorial article card
 * Used in news grids, latest stories sections
 * Flat with bottom divider, no rounded shadow box
 */
export function NewsCard({
  article,
  variant = "standard",
  className,
}: {
  article: NewsArticle;
  variant?: "standard" | "featured" | "compact";
  className?: string;
}) {
  if (variant === "compact") {
    return <CompactNewsCard article={article} className={className} />;
  }
  if (variant === "featured") {
    return <FeaturedNewsCard article={article} className={className} />;
  }

  return (
    <article className={cn("group flex h-full flex-col pb-6 border-b border-border", className)}>
      <Link href={`/news/${article.slug}`} className="block overflow-hidden">
        <Image
          src={article.image}
          alt={article.headline}
          width={1024}
          height={640}
          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        <CategoryEyebrow category={article.category} country={article.country} />
        <h3 className="mt-2 font-display text-base leading-snug font-bold text-foreground sm:text-lg">
          <Link href={`/news/${article.slug}`} className="headline-link">
            {article.headline}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {article.summary}
        </p>
        <p className="meta mt-auto pt-3 text-muted-foreground">
          {article.date}
          <span className="mx-1.5 opacity-40">·</span>
          {article.readingTime}
        </p>
      </div>
    </article>
  );
}

/**
 * CompactNewsCard — small thumbnail + text layout for sidebar/briefing columns
 */
export function CompactNewsCard({
  article,
  className,
}: {
  article: NewsArticle;
  className?: string;
}) {
  return (
    <article className={cn("group grid grid-cols-[88px_minmax(0,1fr)] gap-4 py-4 sm:grid-cols-[100px_minmax(0,1fr)]", className)}>
      <Link href={`/news/${article.slug}`} className="block overflow-hidden">
        <Image
          src={article.image}
          alt={article.headline}
          width={1024}
          height={640}
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </Link>
      <div className="min-w-0">
        <span className="eyebrow text-primary">{article.category}</span>
        <h3 className="mt-1.5 font-display text-sm leading-snug font-bold text-foreground sm:text-base">
          <Link href={`/news/${article.slug}`} className="headline-link">
            {article.headline}
          </Link>
        </h3>
        <p className="meta mt-1.5 text-muted-foreground">{article.date}</p>
      </div>
    </article>
  );
}

/**
 * NumberedStoryRow — numbered list story row for Latest News / Most Read sections
 */
export function NumberedStoryRow({
  article,
  index,
  className,
}: {
  article: NewsArticle;
  index: number;
  className?: string;
}) {
  return (
    <article className={cn("group grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-border py-4", className)}>
      <span className="font-display text-2xl font-extrabold text-border leading-none mt-0.5 tabular-nums">
        {String(index).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <span className="eyebrow text-primary">{article.category}</span>
        <h3 className="mt-1.5 font-display text-sm leading-snug font-bold text-foreground sm:text-base">
          <Link href={`/news/${article.slug}`} className="headline-link">
            {article.headline}
          </Link>
        </h3>
        <p className="meta mt-1 text-muted-foreground">
          {article.date}
          <span className="mx-1.5 opacity-40">·</span>
          {article.readingTime}
        </p>
      </div>
    </article>
  );
}
