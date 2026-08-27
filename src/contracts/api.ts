import type { ApiDateTime } from "./common";
import type { ArticleCategory, ArticleStatus, DeadlineImportance, DeadlineStatus, ImmigrationDeadlineType, ScholarshipType } from "./enums";

/** Minimal country shape used when a related country is embedded in a DTO. */
export type CountrySummary = {
  id: string;
  name: string;
  code: string;
  flag: string;
};

/** Public API DTO aligned with the Prisma Country scalar fields. */
export type Country = {
  id: string;
  name: string;
  code: string;
  flag: string;
  universitiesCount: number;
  averageTuition: string;
  popularIntake: string;
  updatesCount: number;
  heroImage: string | null;
};

/** Public API DTO aligned with the Prisma University scalar fields. */
export type University = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  countryId: string;
  city: string;
  ranking: number;
  tuition: string;
  tuitionValue: number;
  courses: string[];
  scholarships: boolean;
  intake: string;
  degree: string;
  ielts: string;
};

export type UniversitySummary = Pick<
  University,
  "id" | "slug" | "name" | "initials" | "countryId"
>;

export type ScholarshipDestination = {
  countryId: string;
  country: CountrySummary;
};

/** Public API DTO aligned with the Prisma Scholarship scalar fields. */
export type Scholarship = {
  id: string;
  slug: string;
  name: string;
  organization: string;
  funding: string;
  degree: string;
  deadline: ApiDateTime | null;
  deadlineString: string;
  eligibility: string;
  type: ScholarshipType;
  universityId: string | null;
  university: UniversitySummary | null;
  destinations: ScholarshipDestination[];
};

/** Derived presentation field; never persisted in Prisma. */
export type WithDaysLeft<T> = T & { daysLeft: number | null };
export type ScholarshipWithDaysLeft = WithDaysLeft<Scholarship>;

/** Public API DTO aligned with the Prisma ImmigrationDeadline model. */
export type ImmigrationDeadline = {
  id: string;
  slug: string;
  title: string;
  countryId: string;
  country: CountrySummary;
  deadlineDate: ApiDateTime;
  deadlineType: ImmigrationDeadlineType;
  status: DeadlineStatus;
  importance: DeadlineImportance;
  description: string;
  source: string;
  lastUpdated: string;
  relatedArticleTitle: string | null;
  relatedArticleHref: string | null;
  applicationUrl: string | null;
  tags: string[];
  content: string | null;
};

export type ImmigrationDeadlineWithDaysLeft = WithDaysLeft<ImmigrationDeadline>;

export type ConsultantDestination = {
  countryId: string;
  country: CountrySummary;
};

/** Public API DTO aligned with the Prisma Consultant scalar fields. */
export type Consultant = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  countryId: string;
  country: CountrySummary;
  cities: string[];
  services: string[];
  website: string;
  email: string;
  phone: string;
  verified: boolean;
  featured: boolean;
  rating: number;
  reviewCount: number;
  established: string;
  address: string;
  categories: string[];
  sponsored: boolean;
  lastUpdated: string;
  aboutHtml: string | null;
  destinations: ConsultantDestination[];
};

export type ArticleCountryLink = {
  countryId: string;
};

/** Public API DTO aligned with the Prisma Article scalar fields. */
export type Article = {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  content: string | null;
  category: ArticleCategory;
  readingTime: string;
  image: string | null;
  status: ArticleStatus;
  breaking: boolean;
  featured: boolean;
  isRss: boolean;
  sourceUrl: string | null;
  sourceName: string | null;
  publishedAt: ApiDateTime;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
  primaryCountryId: string | null;
  rssSourceId: string | null;
  countries: ArticleCountryLink[];
};
