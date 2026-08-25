import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS (Matching Prisma Schema & Application Logic)
// ============================================================================

export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "EDITOR",
  "STUDENT",
  "CONSULTANT",
];

export const USER_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"];

export const ARTICLE_CATEGORIES = [
  "UNIVERSITIES",
  "ADMISSIONS",
  "SCHOLARSHIPS",
  "VISA",
  "STUDENT_LIFE",
  "CAREER",
];

export const ARTICLE_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
  "REJECTED",
];

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/** Schema for POST /api/signup */
export const SignupSchema = z.object({
  firstName: z
    .string({ required_error: "First name is required" })
    .trim()
    .min(1, "First name cannot be empty"),
  lastName: z
    .string({ required_error: "Last name is required" })
    .trim()
    .min(1, "Last name cannot be empty"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long"),
});

/** Schema for POST /api/login */
export const LoginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ============================================================================
// ADMIN USER MANAGEMENT SCHEMAS
// ============================================================================

/** Schema for user ID param in /api/admin/users/:id */
export const UserIdParamSchema = z.object({
  id: z.string().trim().min(1, "User ID is required"),
});

/** Schema for POST /api/admin/users/invite */
export const UserInviteSchema = z.object({
  firstName: z
    .string({ required_error: "First name is required" })
    .trim()
    .min(1, "First name cannot be empty"),
  lastName: z
    .string({ required_error: "Last name is required" })
    .trim()
    .min(1, "Last name cannot be empty"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),
  role: z.enum(USER_ROLES, {
    errorMap: () => ({
      message: `Invalid role. Must be one of: ${USER_ROLES.join(", ")}`,
    }),
  }),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters long")
    .optional()
    .or(z.literal(""))
    .nullable(),
});

/** Schema for PATCH /api/admin/users/:id */
export const UserUpdateSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name cannot be empty")
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name cannot be empty")
      .optional(),
    role: z
      .enum(USER_ROLES, {
        errorMap: () => ({
          message: `Invalid role. Must be one of: ${USER_ROLES.join(", ")}`,
        }),
      })
      .optional(),
    status: z
      .enum(USER_STATUSES, {
        errorMap: () => ({
          message: `Invalid status. Must be one of: ${USER_STATUSES.join(", ")}`,
        }),
      })
      .optional(),
    password: z
      .string()
      .trim()
      .min(8, "Password must be at least 8 characters long")
      .optional()
      .or(z.literal("")),
  })
  .strict("Unexpected field in user update request");

// ============================================================================
// ARTICLE SCHEMAS
// ============================================================================

/** Schema for article ID param in /api/admin/articles/:id */
export const ArticleIdParamSchema = z.object({
  id: z.string().trim().min(1, "Article ID is required"),
});

/** Schema for GET /api/admin/articles query parameters */
export const ArticleQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "Page must be a valid number" })
    .int("Page must be an integer")
    .positive("Page must be greater than 0")
    .optional()
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a valid number" })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(20),
  status: z.string().optional().default("ALL"),
  category: z.string().optional().default("ALL"),
  search: z.string().optional(),
});

/** Schema for POST /api/admin/articles */
export const ArticleCreateSchema = z.object({
  headline: z
    .string({ required_error: "Headline is required" })
    .trim()
    .min(1, "Headline is required"),
  slug: z
    .string({ required_error: "Slug is required" })
    .trim()
    .min(1, "Slug is required"),
  summary: z
    .string({ required_error: "Summary is required" })
    .trim()
    .min(1, "Summary is required"),
  category: z.enum(ARTICLE_CATEGORIES, {
    errorMap: () => ({
      message: `Invalid category. Must be one of: ${ARTICLE_CATEGORIES.join(", ")}`,
    }),
  }),
  content: z.string().trim().nullable().optional(),
  image: z.string().trim().nullable().optional(),
  readingTime: z.string().trim().optional().default("4 min read"),
  breaking: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  status: z
    .enum(ARTICLE_STATUSES, {
      errorMap: () => ({
        message: `Invalid status. Must be one of: ${ARTICLE_STATUSES.join(", ")}`,
      }),
    })
    .optional()
    .default("DRAFT"),
  primaryCountryId: z.string().trim().nullable().optional(),
  countryIds: z.array(z.string().trim()).optional().default([]),
  id: z.string().optional(),
});

/** Schema for PUT /api/admin/articles/:id */
export const ArticleUpdateSchema = z.object({
  headline: z
    .string({ required_error: "Headline is required" })
    .trim()
    .min(1, "Headline is required"),
  slug: z
    .string({ required_error: "Slug is required" })
    .trim()
    .min(1, "Slug is required"),
  summary: z
    .string({ required_error: "Summary is required" })
    .trim()
    .min(1, "Summary is required"),
  category: z.enum(ARTICLE_CATEGORIES, {
    errorMap: () => ({
      message: `Invalid category. Must be one of: ${ARTICLE_CATEGORIES.join(", ")}`,
    }),
  }),
  content: z.string().trim().nullable().optional(),
  image: z.string().trim().nullable().optional(),
  readingTime: z.string().trim().optional().default("4 min read"),
  breaking: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  status: z
    .enum(ARTICLE_STATUSES, {
      errorMap: () => ({
        message: `Invalid status. Must be one of: ${ARTICLE_STATUSES.join(", ")}`,
      }),
    })
    .optional()
    .default("DRAFT"),
  primaryCountryId: z.string().trim().nullable().optional(),
  countryIds: z.array(z.string().trim()).optional().default([]),
  id: z.string().optional(),
});

/** Schema for PATCH /api/admin/articles/:id/status */
export const ArticleStatusUpdateSchema = z.object({
  status: z.enum(ARTICLE_STATUSES, {
    errorMap: () => ({
      message: `Invalid status. Must be one of: ${ARTICLE_STATUSES.join(", ")}`,
    }),
  }),
});

/** Schema for POST /api/admin/articles/import-rss */
export const RssImportSchema = z.object({
  rssSourceId: z
    .string({ required_error: "rssSourceId is required" })
    .trim()
    .min(1, "rssSourceId is required"),
  sourceUrl: z
    .string({ required_error: "sourceUrl is required" })
    .trim()
    .min(1, "sourceUrl is required"),
});

// ============================================================================
// STUDENT PROFILE SCHEMAS
// ============================================================================

/** Schema for PUT /api/student/profile */
export const StudentProfileSchema = z.object({
  targetCountries: z.array(z.string().trim()).optional().default([]),
  studyLevel: z.string().trim().nullable().optional(),
  degree: z.string().trim().nullable().optional(),
  branch: z.string().trim().nullable().optional(),
  preferredIntake: z.string().trim().nullable().optional(),
  budgetRange: z.string().trim().nullable().optional(),
  interests: z.array(z.string().trim()).optional().default([]),
});

