"use client";

import { cn } from "@/lib/utils";
import type { AdFormat, AdPlacementSlot } from "@/lib/taxonomy";

/**
 * AdBanner — horizontal advertisement placement
 *
 * This component renders a clearly labeled advertisement placeholder.
 * In production, the `slot` prop and `format` prop can be used by an
 * ad server to inject real creatives into this slot.
 *
 * All advertisements are clearly labeled "ADVERTISEMENT" in compliance
 * with editorial integrity standards.
 *
 * @param slot - The semantic placement identifier (e.g. "homepage-top")
 * @param format - The ad format (e.g. "leaderboard", "billboard")
 * @param className - Additional CSS classes
 */
export function AdBanner({
  slot,
  format = "leaderboard",
  className,
}: {
  slot: AdPlacementSlot;
  format?: Extract<AdFormat, "leaderboard" | "billboard" | "native-article">;
  className?: string;
}) {
  const heights: Record<string, string> = {
    leaderboard: "h-[90px]",
    billboard: "h-[250px]",
    "native-article": "h-[200px]",
  };

  return (
    <div
      className={cn("w-full", className)}
      data-ad-slot={slot}
      data-ad-format={format}
    >
      <p className="ad-label mb-1.5 text-center text-muted-foreground">
        Advertisement
      </p>
      <div
        className={cn(
          "flex items-center justify-center border border-dashed border-border bg-surface",
          heights[format] ?? "h-[90px]",
        )}
        aria-hidden
      >
        <span className="ad-label text-muted-foreground/50">
          Ad Placement — {slot}
        </span>
      </div>
    </div>
  );
}

/**
 * AdSidebar — sidebar rectangle advertisement
 * Designed for 300×250 or 160×600 sidebar placements
 */
export function AdSidebar({
  slot,
  format = "rectangle",
  className,
}: {
  slot: AdPlacementSlot;
  format?: Extract<AdFormat, "rectangle" | "large-rectangle" | "skyscraper">;
  className?: string;
}) {
  const heights: Record<string, string> = {
    rectangle: "h-[250px]",
    "large-rectangle": "h-[280px]",
    skyscraper: "h-[600px]",
  };

  return (
    <div
      className={cn("w-full max-w-[320px]", className)}
      data-ad-slot={slot}
      data-ad-format={format}
    >
      <p className="ad-label mb-1.5 text-muted-foreground">Advertisement</p>
      <div
        className={cn(
          "flex w-full items-center justify-center border border-dashed border-border bg-surface",
          heights[format] ?? "h-[250px]",
        )}
        aria-hidden
      >
        <span className="ad-label text-center text-muted-foreground/50">
          Sidebar Ad<br />{slot}
        </span>
      </div>
    </div>
  );
}

/**
 * InlineAd — between-content advertisement
 * Appears between editorial content sections or within article body
 */
export function InlineAd({
  slot,
  className,
}: {
  slot: AdPlacementSlot;
  className?: string;
}) {
  return (
    <div
      className={cn("my-8 border-y border-border py-4", className)}
      data-ad-slot={slot}
      data-ad-format="native-article"
    >
      <p className="ad-label mb-2 text-muted-foreground">Advertisement</p>
      <div
        className="flex h-[160px] items-center justify-center bg-surface"
        aria-hidden
      >
        <span className="ad-label text-muted-foreground/50">
          Inline Ad — {slot}
        </span>
      </div>
    </div>
  );
}

/**
 * SponsoredCard — native sponsored content card
 * Visually matches editorial cards but is clearly labeled "Sponsored"
 */
export function SponsoredCard({
  slot,
  title,
  description,
  href = "#",
  className,
}: {
  slot: AdPlacementSlot;
  title?: string;
  description?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t-2 border-primary pt-4",
        className,
      )}
      data-ad-slot={slot}
      data-ad-format="sponsored-card"
    >
      <p className="ad-label text-primary mb-2">Sponsored</p>
      <a
        href={href}
        className="group block"
        rel="sponsored noopener noreferrer"
        target="_blank"
      >
        <h3 className="font-display text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
          {title ?? "Partner Content Placement"}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
        <p className="mt-2 eyebrow text-primary">
          Learn More →
        </p>
      </a>
    </div>
  );
}

/**
 * NewsletterSponsor — sponsorship placement within the newsletter block
 */
export function NewsletterSponsor({
  slot,
  className,
}: {
  slot: AdPlacementSlot;
  className?: string;
}) {
  return (
    <div
      className={cn("border-t border-white/10 pt-4", className)}
      data-ad-slot={slot}
      data-ad-format="newsletter"
    >
      <p className="ad-label mb-2 text-navy-foreground/50">
        Newsletter Sponsor
      </p>
      <div
        className="flex h-[80px] items-center justify-center border border-dashed border-white/10"
        aria-hidden
      >
        <span className="ad-label text-navy-foreground/30">
          Newsletter Sponsorship — {slot}
        </span>
      </div>
    </div>
  );
}
