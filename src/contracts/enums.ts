export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "STUDENT",
  "CONSULTANT",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const ARTICLE_CATEGORIES = [
  "UNIVERSITIES",
  "ADMISSIONS",
  "SCHOLARSHIPS",
  "VISA",
  "STUDENT_LIFE",
  "CAREER",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const ARTICLE_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
  "REJECTED",
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const SCHOLARSHIP_TYPES = [
  "FULLY_FUNDED",
  "PARTIAL",
  "TUITION_WAIVER",
] as const;

export type ScholarshipType = (typeof SCHOLARSHIP_TYPES)[number];

export const IMMIGRATION_DEADLINE_TYPES = [
  "VISA",
  "IMMIGRATION",
  "APPLICATION",
  "REGISTRATION",
  "POLICY",
  "SCHOLARSHIP",
] as const;

export type ImmigrationDeadlineType =
  (typeof IMMIGRATION_DEADLINE_TYPES)[number];

export const DEADLINE_STATUSES = [
  "UPCOMING",
  "CLOSING_SOON",
  "PASSED",
  "UPDATED",
] as const;

export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];

export const DEADLINE_IMPORTANCE = ["CRITICAL", "HIGH", "MEDIUM"] as const;

export type DeadlineImportance = (typeof DEADLINE_IMPORTANCE)[number];
