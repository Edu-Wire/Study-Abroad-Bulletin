"use client";

import { useMemo, useState } from "react";
import type { NewsArticle } from "@/data/mock";
import { useStudentProfile } from "@/context/StudentProfileContext";
import { Hero, TodaysBriefing } from "@/components/home/ServerSections";
import { LatestNews } from "@/components/home/LatestNews";
import { AdBanner } from "@/components/editorial/AdComponents";

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

const COUNTRY_FLAGS: Record<string, string> = {
  canada:      "🇨🇦",
  uk:          "🇬🇧",
  usa:         "🇺🇸",
  australia:   "🇦🇺",
  germany:     "🇩🇪",
  ireland:     "🇮🇪",
  netherlands: "🇳🇱",
  france:      "🇫🇷",
};

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

const INTEREST_CATEGORIES: Record<string, string> = {
  SCHOLARSHIPS: "Scholarships",
  VISA:         "Visa",
  ADMISSIONS:   "Admissions",
  UNIVERSITIES: "Universities",
  STUDENT_LIFE: "Student Life",
  CAREER:       "Career",
};

interface HeroStats {
  universities: number;
  scholarships: number;
  updatesThisWeek: number;
}

interface HomePersonalizedFeedProps {
  articles: NewsArticle[];
  stats: HeroStats;
}

export function HomePersonalizedFeed({ articles, stats }: HomePersonalizedFeedProps) {
  const { profile, loading } = useStudentProfile();
  const [showPersonalized, setShowPersonalized] = useState(true);

  const hasPreferences = Boolean(
    profile && (profile.targetCountries?.length > 0 || profile.interests?.length > 0)
  );

  const targetCountries = useMemo(() => {
    if (!profile?.targetCountries) return [];
    return profile.targetCountries.map((rawId) => {
      const id = rawId.toLowerCase().trim();
      const name = COUNTRY_NAMES[id] || (id.charAt(0).toUpperCase() + id.slice(1));
      const flag = COUNTRY_FLAGS[id] || "🌍";
      return { id, name, flag };
    });
  }, [profile?.targetCountries]);

  const personalizedArticles = useMemo(() => {
    if (!profile || !hasPreferences) return articles;

    const targets = profile.targetCountries?.map((c) => c.toLowerCase().trim()) || [];
    const interests = profile.interests || [];

    // 1. Group articles by each target country
    const articlesByCountry = targets.map((target) => {
      const aliases = COUNTRY_ALIASES[target] || [target];
      return articles.filter((a) => {
        const c = a.country?.toLowerCase().trim();
        return c && aliases.includes(c);
      });
    });

    // Interleave articles across target countries (Round-Robin) so all destinations
    // share prime editorial real estate in the Hero lead story and side cards
    const interleavedTargetArticles: NewsArticle[] = [];
    const maxLen = Math.max(...articlesByCountry.map((l) => l.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const countryList of articlesByCountry) {
        if (countryList[i] && !interleavedTargetArticles.some((x) => x.id === countryList[i].id)) {
          interleavedTargetArticles.push(countryList[i]);
        }
      }
    }

    // 2. Articles matching student's study interests (not already included above)
    const targetIds = new Set(interleavedTargetArticles.map((a) => a.id));
    const interestArticles = articles.filter((a) => {
      if (targetIds.has(a.id)) return false;
      return interests.some((intKey) => {
        const catName = INTEREST_CATEGORIES[intKey];
        return catName && a.category === catName;
      });
    });

    // 3. Remaining articles to preserve full newspaper depth
    const usedIds = new Set([...interleavedTargetArticles, ...interestArticles].map((a) => a.id));
    const remainingArticles = articles.filter((a) => !usedIds.has(a.id));

    return [...interleavedTargetArticles, ...interestArticles, ...remainingArticles];
  }, [articles, profile, hasPreferences]);

  const activeArticles =
    !loading && hasPreferences && showPersonalized
      ? personalizedArticles
      : articles;

  const isPersonalizedActive = !loading && hasPreferences && showPersonalized;

  const editionLabel = useMemo(() => {
    if (!isPersonalizedActive || targetCountries.length === 0) {
      return "Global Edition";
    }
    if (targetCountries.length === 1) {
      return `${targetCountries[0].flag} ${targetCountries[0].name} Edition`;
    }
    if (targetCountries.length === 2) {
      return `${targetCountries[0].flag} ${targetCountries[0].name} & ${targetCountries[1].flag} ${targetCountries[1].name} Edition`;
    }
    return `${targetCountries[0].flag} ${targetCountries[0].name} (+${targetCountries.length - 1} Countries) Edition`;
  }, [isPersonalizedActive, targetCountries]);

  return (
    <>
      {/* Front page hero — personalized or global */}
      <Hero
        articles={activeArticles}
        stats={stats}
        editionLabel={editionLabel}
        isPersonalized={isPersonalizedActive}
        canToggle={!loading && hasPreferences}
        onToggleEdition={() => setShowPersonalized((prev) => !prev)}
      />

      {/* Today's Briefing */}
      <TodaysBriefing articles={activeArticles} />

      {/* Ad between Briefing and Latest News */}
      <div className="border-b border-border bg-surface">
        <div className="shell py-4 min-w-0">
          <AdBanner slot="homepage-between-briefing-news" format="leaderboard" />
        </div>
      </div>

      {/* Latest News + sidebar */}
      <LatestNews articles={activeArticles} />
    </>
  );
}
