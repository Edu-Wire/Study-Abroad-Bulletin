import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CountryFlag } from "@/components/common/CountryFlag";
import type { Consultant } from "@/data/consultants";
import { cn } from "@/lib/utils";

interface ConsultantCardProps {
  consultant: Consultant;
  className?: string;
}

export function ConsultantCard({ consultant, className }: ConsultantCardProps) {
  return (
    <article
      className={cn(
        "group flex flex-col justify-between border-t-2 bg-background pt-5 transition-colors",
        consultant.sponsored
          ? "border-primary bg-primary-soft/30 p-5 border-x border-b border-primary/20"
          : "border-foreground hover:border-primary",
        className
      )}
    >
      <div>
        {/* Top bar: Sponsored / Verified badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{consultant.logo}</span>
            <div>
              <span className="eyebrow text-muted-foreground">{consultant.country}</span>
              {consultant.cities.length > 0 && (
                <span className="eyebrow text-muted-foreground"> · {consultant.cities[0]}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {consultant.sponsored && (
              <span className="eyebrow border border-primary/30 bg-primary-soft text-primary px-2 py-0.5 text-[0.6875rem]">
                SPONSORED
              </span>
            )}
            {consultant.verified && (
              <span className="eyebrow inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[0.6875rem]">
                <CheckCircle2 className="size-3" />
                VERIFIED
              </span>
            )}
          </div>
        </div>

        {/* Company Name */}
        <h3 className="font-display text-xl font-extrabold leading-tight text-foreground group-hover:text-primary transition-colors">
          <Link href={`/consultants/${consultant.slug}`} className="headline-link">
            {consultant.name}
          </Link>
        </h3>

        {/* Rating & Established */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">★ {consultant.rating.toFixed(1)}</span>
          <span>({consultant.reviewCount} reviews)</span>
          <span>·</span>
          <span>Est. {consultant.established}</span>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {consultant.description}
        </p>

        {/* Destinations Supported */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="eyebrow text-muted-foreground text-xs mb-2">Destinations:</p>
          <div className="flex flex-wrap gap-1.5">
            {consultant.destinations.map((dest) => (
              <span
                key={dest}
                className="inline-flex items-center gap-1 border border-border bg-surface px-2 py-1 eyebrow text-xs text-foreground"
              >
                <CountryFlag country={dest} size="xs" />
                <span>{dest}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Services Offered */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {consultant.services.slice(0, 3).map((service) => (
              <span key={service} className="eyebrow text-muted-foreground text-[0.6875rem] bg-muted/30 px-1.5 py-0.5">
                {service}
              </span>
            ))}
            {consultant.services.length > 3 && (
              <span className="eyebrow text-muted-foreground text-[0.6875rem] px-1">
                +{consultant.services.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="mt-6 flex items-center justify-between border-t border-border pt-3">
        <a
          href={consultant.website}
          target="_blank"
          rel="noopener noreferrer"
          className="eyebrow text-muted-foreground hover:text-foreground text-xs"
        >
          Visit Website ↗
        </a>
        <Link
          href={`/consultants/${consultant.slug}`}
          className="eyebrow text-primary group-hover:underline flex items-center gap-1"
        >
          <span>View Profile</span>
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}
