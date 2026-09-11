"use client";

/**
 * UniversitiesPersonalizedWrapper
 *
 * A thin client wrapper around FindYourUniversity that reads the student's
 * profile and passes their primary target country as the default filter.
 *
 * Handles:
 *  - Loading skeleton to prevent layout jumps/flash.
 *  - Robust country alias matching (UK <-> United Kingdom, USA <-> United States).
 *  - Smooth fade-in transition when ready.
 */

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

interface Props {
  universities: University[];
}

export function UniversitiesPersonalizedWrapper({ universities }: Props) {
  const { profile, loading } = useStudentProfile();

  // Dynamically resolve the primary target country against the university dataset
  const targetId = profile?.targetCountries?.[0]?.toLowerCase();
  let defaultCountry: string | undefined;

  if (targetId) {
    const expectedName = COUNTRY_ID_TO_NAME[targetId] || targetId;
    const matchedUni = universities.find((u) => {
      const c = u.country.toLowerCase();
      if (c === expectedName.toLowerCase() || c === targetId) return true;
      if (targetId === "uk" && (c === "uk" || c === "united kingdom" || c === "britain")) return true;
      if (targetId === "usa" && (c === "usa" || c === "us" || c === "united states")) return true;
      return false;
    });
    defaultCountry = matchedUni ? matchedUni.country : expectedName;
  }

  // During loading, show a skeleton placeholder to prevent flash and layout jump
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
      <FindYourUniversity
        key={defaultCountry || "all"}
        universities={universities}
        showAll
        showHeading={false}
        defaultCountry={defaultCountry}
      />
    </div>
  );
}
