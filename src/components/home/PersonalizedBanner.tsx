"use client";

/**
 * PersonalizedBanner
 *
 * Shows a personalized welcome strip on the home page for logged-in students
 * who have completed their profile. Completely invisible to guests, admins,
 * and students who skipped their profile — no layout shift, no errors.
 */

import Link from "next/link";
import { Sparkles, MapPin, BookOpen, ArrowRight } from "lucide-react";
import { useStudentProfile } from "@/context/StudentProfileContext";

/** Map lowercase country IDs to display names + flag emojis */
const COUNTRY_DISPLAY: Record<string, { name: string; flag: string }> = {
  canada:      { name: "Canada",      flag: "🇨🇦" },
  uk:          { name: "UK",          flag: "🇬🇧" },
  usa:         { name: "USA",         flag: "🇺🇸" },
  australia:   { name: "Australia",   flag: "🇦🇺" },
  germany:     { name: "Germany",     flag: "🇩🇪" },
  ireland:     { name: "Ireland",     flag: "🇮🇪" },
  netherlands: { name: "Netherlands", flag: "🇳🇱" },
  france:      { name: "France",      flag: "🇫🇷" },
};

export function PersonalizedBanner() {
  const { profile, loading } = useStudentProfile();

  // Don't render anything for guests, admins, or students who skipped profile
  if (loading || !profile || profile.targetCountries.length === 0) return null;

  const primary = COUNTRY_DISPLAY[profile.targetCountries[0]] ?? {
    name: profile.targetCountries[0],
    flag: "🌍",
  };

  const otherCount = profile.targetCountries.length - 1;

  return (
    <div
      className="border-b border-border bg-surface animate-fade-in"
      role="region"
      aria-label="Personalized recommendations"
    >
      <div className="shell py-3 flex items-center justify-between gap-4 flex-wrap">
        {/* Left: greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm text-foreground">
            <span className="font-semibold">Your feed is personalised&nbsp;—&nbsp;</span>
            <span className="text-muted-foreground">
              showing updates for{" "}
              <span className="font-medium text-foreground">
                {primary.flag}&nbsp;{primary.name}
              </span>
              {otherCount > 0 && (
                <span className="text-muted-foreground">
                  {" "}+ {otherCount} more
                </span>
              )}
              {profile.studyLevel && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="inline h-3 w-3" />
                    {profile.studyLevel}
                  </span>
                </>
              )}
            </span>
          </p>
        </div>

        {/* Right: quick links */}
        <div className="flex items-center gap-4 shrink-0">
          <Link
            href="/news"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <MapPin className="h-3 w-3" />
            News for {primary.name}
          </Link>
          <Link
            href="/universities"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            Universities
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/dashboard/profile"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit preferences
          </Link>
        </div>
      </div>
    </div>
  );
}
