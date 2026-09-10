export type University = {
  id: string;
  sourceId?: number | null;
  slug?: string;
  name: string;
  initials: string;
  country: string; // country name, e.g. "Canada"
  countryId?: string; // country slug, e.g. "canada"
  city: string;
  ranking: number;
  tuition: string;
  tuitionValue: number;
  courses: string[];
  scholarships: boolean;
  intake: string;
  degree: "Bachelors" | "Masters" | "Both";
  ielts: string;
  // Extended fields populated from import data
  qsRanking?: number | null;
  usNewsRanking?: number | null;
  webomatricsNationalRanking?: number | null;
  webomatricsWorldRanking?: number | null;
  universityLogoExtension?: string | null;
  universityAverageScholarship?: number | null;
  universityAverageScholarshipRemarks?: string | null;
  programs?: unknown[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedUniversitiesResponse = {
  success: boolean;
  count: number;
  data: University[];
  universities: University[];
  pagination: PaginationMeta;
};
