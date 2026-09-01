export const NEWS_CATEGORIES = [
  "Universities",
  "Admissions",
  "Scholarships",
  "Visa",
  "Student Life",
  "Career",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type NewsArticle = {
  id: string;
  slug: string;
  category: NewsCategory;
  country: string;
  headline: string;
  summary: string;
  content?: string | null;
  date: string;
  readingTime: string;
  image: string;
  breaking?: boolean;
  /** Set for articles sourced from an external RSS/Atom feed */
  isRss?: boolean;
  /** URL of the original article on the source website */
  sourceUrl?: string;
  /** Human-readable name of the news source */
  sourceName?: string;
};

export type NewsCategoryFilter = "All" | NewsCategory;
