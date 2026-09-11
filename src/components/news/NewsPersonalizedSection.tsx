"use client";

/**
 * NewsPersonalizedSection
 *
 * Appears at the top of the /news page for logged-in students who have a
 * completed profile. Shows a "Curated for You" strip with articles that
 * match their target countries and/or interests.
 *
 * For guests / students who skipped their profile: renders nothing.
 * No API calls — data comes from the articles already fetched server-side
 * and passed down as props.
 */

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useStudentProfile } from "@/context/StudentProfileContext";
import type { NewsArticle } from "@/contracts/articles";

/** Map country IDs to primary display names */
const COUNTRY_NAMES: Record<string, string> = {
  canada:      "Canada",
  uk:          "United Kingdom",
  usa:         "United States",
  australia:   "Australia",
  germany:     "Germany",
  ireland:     "Ireland",
  netherlands: "Netherlands",
  france:      "France",
};

/** Common name aliases for each country ID to ensure robust matching against any article format */
const COUNTRY_ALIASES: Record<string, string[]> = {
  canada:      ["canada", "ca"],
  uk:          ["uk", "united kingdom", "great britain", "britain", "gb", "england", "scotland", "wales"],
  usa:         ["usa", "us", "united states", "united states of america", "america"],
  australia:   ["australia", "au"],
  germany:     ["germany", "de", "deutschland"],
  ireland:     ["ireland", "ie"],
  netherlands: ["netherlands", "nl", "holland"],
  france:      ["france", "fr"],
};

interface NewsPersonalizedSectionProps {
  /** All articles from the server — we filter client-side, no extra fetch. */
  articles: NewsArticle[];
}

export function NewsPersonalizedSection({ articles }: NewsPersonalizedSectionProps) {
  const { profile, loading } = useStudentProfile();

  if (loading || !profile || profile.targetCountries.length === 0) return null;

  // Filter: article's country matches any of the student's target countries (alias-aware)
  // OR article's category matches any of the student's interests.
  const matched = articles.filter((a) => {
    const articleCountry = a.country?.toLowerCase().trim();
    const countryMatch = articleCountry
      ? profile.targetCountries.some((c) => {
          const aliases = COUNTRY_ALIASES[c.toLowerCase()] || [c.toLowerCase()];
          return aliases.includes(articleCountry);
        })
      : false;

    const interestMatch = profile.interests.some((interest) => {
      // Map interest keys to article category strings
      const map: Record<string, string> = {
        SCHOLARSHIPS: "Scholarships",
        VISA: "Visa",
        ADMISSIONS: "Admissions",
        UNIVERSITIES: "Universities",
        STUDENT_LIFE: "Student Life",
        CAREER: "Career",
      };
      return a.category === map[interest];
    });
    return countryMatch || interestMatch;
  });

  // Nothing matched (e.g. profile set but no articles for those countries yet)
  if (matched.length === 0) return null;

  const primaryCountry = COUNTRY_NAMES[profile.targetCountries[0]] ?? profile.targetCountries[0];
  const shown = matched.slice(0, 5);

  return (
    <div className="border-b border-border bg-surface/60 mb-10 animate-fade-in">
      <div className="shell py-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <p className="eyebrow text-primary">Curated for your profile</p>
          <span className="ml-auto text-xs text-muted-foreground">
            Based on {primaryCountry}
            {profile.studyLevel ? ` · ${profile.studyLevel}` : ""}
          </span>
        </div>

        {/* Article list */}
        <div className="divide-y divide-border">
          {shown.map((article, i) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="group grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 py-3 hover:bg-background/60 -mx-2 px-2 rounded transition-colors"
            >
              <span className="font-display text-base font-extrabold text-border tabular-nums mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <span className="eyebrow text-primary">{article.category}</span>
                {article.country && (
                  <span className="eyebrow text-muted-foreground ml-2">· {article.country}</span>
                )}
                <p className="mt-0.5 text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {article.headline}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {matched.length > 5 && (
          <p className="mt-3 text-xs text-muted-foreground">
            +{matched.length - 5} more matching articles in the feed below
          </p>
        )}
      </div>
    </div>
  );
}
