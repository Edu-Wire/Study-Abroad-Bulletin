/**
 * Student data client. Requests go to the same-origin BFF at /api/backend/*;
 * the HttpOnly session cookie authenticates them automatically.
 */

const API_BASE_PATH = "/api/backend";

export interface RecommendedArticleItem {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content?: string | null;
  category: string;
  readingTime: string;
  image?: string | null;
  status: string;
  breaking: boolean;
  featured: boolean;
  isRss: boolean;
  sourceUrl?: string | null;
  sourceName?: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  primaryCountryId?: string | null;
  primaryCountry?: { id: string; name: string; flag: string } | null;
  countries?: Array<{ country: { id: string; name: string; flag: string } }>;
}

export interface RecommendedScholarshipItem {
  id: string;
  slug: string;
  name: string;
  organization: string;
  funding: string;
  degree: string;
  deadline?: string | null;
  deadlineString: string;
  eligibility: string;
  type: string;
  destinations?: Array<{ country: { id: string; name: string; flag: string } }>;
  university?: { id: string; name: string; country?: { id: string; name: string; flag: string } } | null;
}

export interface RecommendedDeadlineItem {
  id: string;
  slug: string;
  title: string;
  countryId: string;
  country?: { id: string; name: string; flag: string } | null;
  deadlineDate: string;
  deadlineType: string;
  status: string;
  importance: string;
  description: string;
}

export interface ScoredItem<T> {
  item: T;
  score: number;
  reasons: string[];
}

export interface StudentProfileData {
  targetCountries: string[];
  interests: string[];
  studyLevel: string | null;
  degree: string | null;
  branch: string | null;
  preferredIntake: string | null;
  budgetRange: string | null;
}

export interface StudentFeedResponse {
  success: boolean;
  hasProfile: boolean;
  profile: StudentProfileData | null;
  data: {
    articles: ScoredItem<RecommendedArticleItem>[];
    scholarships: ScoredItem<RecommendedScholarshipItem>[];
    deadlines: ScoredItem<RecommendedDeadlineItem>[];
  };
}

/**
 * Save (create or update) the authenticated student's profile preferences.
 * Calls PUT /api/student/profile.
 */
export async function saveStudentProfile(
  data: Partial<StudentProfileData>
): Promise<{ success: boolean; message: string; profile: StudentProfileData }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_PATH}/student/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Unable to reach the server. Please try again.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resData: any;
  try {
    resData = await res.json();
  } catch {
    throw new Error("Failed to save your profile.");
  }

  if (!res.ok) {
    const msg = resData?.message || resData?.error || "Failed to save your profile.";
    throw new Error(msg);
  }

  return resData as { success: boolean; message: string; profile: StudentProfileData };
}

/**
 * Fetch the authenticated student's saved profile from GET /api/student/profile.
 */
export async function getStudentProfile(): Promise<{
  success: boolean;
  profile: StudentProfileData | null;
}> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_PATH}/student/profile`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to reach the server. Please try again.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resData: any;
  try {
    resData = await res.json();
  } catch {
    throw new Error("Failed to load your profile.");
  }

  if (!res.ok) {
    const msg = resData?.message || resData?.error || "Failed to load your profile.";
    throw new Error(msg);
  }

  return resData as { success: boolean; profile: StudentProfileData | null };
}

/**
 * Fetch the authenticated student's personalized feed from GET /api/student/feed.
 */
export async function getStudentFeed(): Promise<StudentFeedResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_PATH}/student/feed`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to reach the server. Please try again.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error("Failed to load your personalized feed.");
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Failed to load your personalized feed (${res.status})`;
    throw new Error(msg);
  }

  return data as StudentFeedResponse;
}
