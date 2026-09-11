/**
 * Student Profile type — matches the fields returned by /api/me → studentProfile.
 */
export interface StudentProfile {
  targetCountries: string[];  // e.g. ["canada", "uk"]
  studyLevel: string | null;  // "Bachelors" | "Masters" | "PhD" | "Diploma"
  degree: string | null;      // e.g. "Computer Science"
  branch: string | null;      // e.g. "Artificial Intelligence"
  preferredIntake: string | null;
  budgetRange: string | null;
  interests: string[];        // e.g. ["VISA", "SCHOLARSHIPS"]
}
