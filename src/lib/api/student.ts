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
    throw { success: false, message: "Unable to reach the server. Please try again." };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw { success: false, message: "Failed to load your personalized feed." };
  }

  if (!res.ok) {
    throw data ?? { success: false, message: "Failed to load your personalized feed." };
  }

  return data as StudentFeedResponse;
}
