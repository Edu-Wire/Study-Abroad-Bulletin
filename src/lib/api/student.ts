import axios from "axios";

const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE_URL = rawBase.replace(/\/api\/?$/, "") + "/api";

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
  try {
    const response = await axios.get<StudentFeedResponse>(
      `${API_BASE_URL}/student/feed`,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw {
      success: false,
      message: "Failed to connect to backend server.",
    };
  }
}
