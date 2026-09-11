"use client";

/**
 * UniversitiesPersonalizedWrapper
 *
 * A smart client wrapper around FindYourUniversity that adapts to one or MULTIPLE
 * target countries in the student's profile (e.g. Canada + United Kingdom):
 *  1. Defaults to "All My Destinations", displaying top institutions from all
 *     target countries together, sorted by global standing.
 *  2. Provides 1-click interactive pills to instantly isolate any individual
 *     country (e.g. [🇨🇦 Canada] or [🇬🇧 United Kingdom]) or browse all global.
 *  3. Pre-selects study level / degree (e.g. "Masters", "Bachelors").
 */

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useStudentProfile } from "@/context/StudentProfileContext";
import { FindYourUniversity } from "@/components/home/FindYourUniversity";
import type { University } from "@/contracts/universities";

/** Map profile country IDs -> display names used in the university data */
const COUNTRY_ID_TO_NAME: Record<string, string> = {
  canada:      "Canada",
  uk:          "United Kingdom",
  usa:         "United States",
  australia:   "Australia",
  germany:     "Germany",
  ireland:     "Ireland",
  netherlands: "Netherlands",
  france:      "France",
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

interface TargetCountryInfo {
  id: string;
  name: string;
  flag: string;
}

interface Props {
  universities: University[];
}

export function UniversitiesPersonalizedWrapper({ universities }: Props) {
  const { profile, loading } = useStudentProfile();

  // Resolve all target countries from profile
  const targetCountries: TargetCountryInfo[] = useMemo(() => {
    if (!profile?.targetCountries || profile.targetCountries.length === 0) {
      return [];
    }
    return profile.targetCountries.map((rawId) => {
      const id = rawId.toLowerCase().trim();
      const matchedUni = universities.find((u) => {
        const c = u.country.toLowerCase();
        const expected = (COUNTRY_ID_TO_NAME[id] || id).toLowerCase();
        if (c === expected || c === id) return true;
        if (id === "uk" && (c === "uk" || c === "united kingdom" || c === "britain")) return true;
        if (id === "usa" && (c === "usa" || c === "us" || c === "united states")) return true;
        return false;
      });
      const name = matchedUni ? matchedUni.country : (COUNTRY_ID_TO_NAME[id] || (id.charAt(0).toUpperCase() + id.slice(1)));
      const flag = COUNTRY_FLAGS[id] || "🌍";
      return { id, name, flag };
    });
  }, [profile?.targetCountries, universities]);

  // "ALL_TARGETS" = all chosen target countries
  // "ALL_GLOBAL" = un-filtered global list
  // or a specific country name (e.g. "Canada", "United Kingdom")
  const [selectedCountry, setSelectedCountry] = useState<string>("ALL_TARGETS");

  // Resolve student's study level (e.g. "Masters" or "Bachelors")
  const defaultDegree =
    profile?.studyLevel && (profile.studyLevel === "Masters" || profile.studyLevel === "Bachelors")
      ? profile.studyLevel
      : undefined;

  const targetNames = useMemo(
    () => targetCountries.map((c) => c.name.toLowerCase()),
    [targetCountries]
  );

  const filteredUniversities = useMemo(() => {
    if (selectedCountry === "ALL_GLOBAL" || targetCountries.length === 0) {
      return universities;
    }
    if (selectedCountry === "ALL_TARGETS") {
      return universities
        .filter((u) => targetNames.includes(u.country.toLowerCase()))
        .sort((a, b) => (a.ranking ?? 9999) - (b.ranking ?? 9999));
    }
    return universities.filter(
      (u) => u.country.toLowerCase() === selectedCountry.toLowerCase()
    );
  }, [universities, selectedCountry, targetCountries.length, targetNames]);

  // During loading, show skeleton placeholder
  if (loading) {
    return (
      <div className="shell py-10 space-y-6" aria-busy="true">
        <div className="h-10 bg-muted/60 rounded-md max-w-xl animate-pulse" />
        <div className="flex gap-2 flex-wrap">
          <div className="h-8 w-24 bg-muted/40 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-muted/40 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-muted/40 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-muted/40 rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Personalized Indicator Strip with Quick Multi-Country Pills */}
      {targetCountries.length > 0 && (
        <div className="border-b border-border bg-surface/60 py-3">
          <div className="shell flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span>
                Personalized for your profile:{" "}
                <strong className="text-foreground font-semibold">
                  {defaultDegree ? `${defaultDegree} degrees` : "Universities"}
                </strong>
                {selectedCountry === "ALL_TARGETS" && targetCountries.length > 1 && (
                  <> in your {targetCountries.length} target destinations</>
                )}
                {selectedCountry === "ALL_TARGETS" && targetCountries.length === 1 && (
                  <> in {targetCountries[0].name}</>
                )}
                {selectedCountry !== "ALL_TARGETS" && selectedCountry !== "ALL_GLOBAL" && (
                  <> in {selectedCountry}</>
                )}
                {selectedCountry === "ALL_GLOBAL" && <> worldwide</>}
              </span>
            </div>

            {/* Quick Country Switcher Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {targetCountries.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedCountry("ALL_TARGETS")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                    selectedCountry === "ALL_TARGETS"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  🌐 All My Destinations ({targetCountries.map((c) => c.flag).join(" ")})
                </button>
              )}
              {targetCountries.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCountry(c.name)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                    selectedCountry === c.name
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {c.flag} {c.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedCountry("ALL_GLOBAL")}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all cursor-pointer ${
                  selectedCountry === "ALL_GLOBAL"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                Browse All Global
              </button>
            </div>
          </div>
        </div>
      )}

      <FindYourUniversity
        key={`${selectedCountry}-${defaultDegree || "all"}`}
        universities={filteredUniversities}
        showAll
        showHeading={false}
        defaultDegree={defaultDegree}
      />
    </div>
  );
}
