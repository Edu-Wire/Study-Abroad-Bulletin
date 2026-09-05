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
  "GUIDES",
];

export const ARTICLE_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
  "REJECTED",
];

// ============================================================================
// PASSWORD POLICY
// ============================================================================

/**
 * Strong password policy applied to every path that sets a password:
 * self-service signup, self-service change, and administrative reset.
 *
 * 12 characters with mixed classes, which resists offline cracking far better
 * than the previous 8-character minimum.
 */
export const StrongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters long")
  .max(200, "Password must be at most 200 characters long")
  .refine((value) => /[a-z]/.test(value), {
    message: "Password must include a lowercase letter",
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: "Password must include an uppercase letter",
  })
  .refine((value) => /[0-9]/.test(value), {
    message: "Password must include a digit",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "Password must include a symbol",
  });

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/** Schema for POST /api/password/change */
export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: StrongPasswordSchema,
});

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
  password: StrongPasswordSchema,
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
  password: StrongPasswordSchema.optional().or(z.literal("")).nullable(),
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
    password: StrongPasswordSchema.optional().or(z.literal("")),
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

// ============================================================================
// UNIVERSITY SCHEMAS (admin CRUD)
// ============================================================================

export const UniversityIdParamSchema = z.object({
  id: z.string().trim().min(1, "University ID is required"),
});

const UniversityBaseSchema = {
  slug: z.string({ required_error: "Slug is required" }).trim().min(1, "Slug is required"),
  name: z.string({ required_error: "Name is required" }).trim().min(1, "Name is required"),
  initials: z.string({ required_error: "Initials are required" }).trim().min(1, "Initials are required").max(4),
  countryId: z.string({ required_error: "Country is required" }).trim().min(1, "Country is required"),
  city: z.string({ required_error: "City is required" }).trim().min(1, "City is required"),
  ranking: z.coerce.number().int().positive("Ranking must be a positive number"),
  tuition: z.string({ required_error: "Tuition label is required" }).trim().min(1, "Tuition label is required"),
  tuitionValue: z.coerce.number().nonnegative("Tuition value must be 0 or more"),
  courses: z.array(z.string().trim()).optional().default([]),
  scholarships: z.boolean().optional().default(true),
  intake: z.string().trim().optional().default("September 2027"),
  degree: z.string().trim().optional().default("Both"),
  ielts: z.string().trim().optional().default("6.5"),
};

/** Schema for POST /api/admin/universities */
export const UniversityCreateSchema = z.object(UniversityBaseSchema);

/** Schema for PUT /api/admin/universities/:id */
export const UniversityUpdateSchema = z.object(UniversityBaseSchema);

// ============================================================================
// COUNTRY SCHEMAS (admin CRUD)
// ============================================================================

export const CountryIdParamSchema = z.object({
  id: z.string().trim().min(1, "Country ID is required"),
});

const CountryBaseSchema = {
  id: z.string({ required_error: "Country code is required" }).trim().min(1, "Country code is required"),
  name: z.string({ required_error: "Name is required" }).trim().min(1, "Name is required"),
  code: z.string({ required_error: "ISO code is required" }).trim().min(1, "ISO code is required"),
  flag: z.string({ required_error: "Flag emoji is required" }).trim().min(1, "Flag emoji is required"),
  averageTuition: z.string().trim().optional().default(""),
  popularIntake: z.string().trim().optional().default(""),
  heroImage: z.string().trim().nullable().optional(),
};

/** Schema for POST /api/admin/countries */
export const CountryCreateSchema = z.object(CountryBaseSchema);

/** Schema for PUT /api/admin/countries/:id (id comes from the URL, not the body) */
export const CountryUpdateSchema = z.object(CountryBaseSchema).omit({ id: true });

// ============================================================================
// SCHOLARSHIP SCHEMAS (admin CRUD)
// ============================================================================

export const SCHOLARSHIP_TYPES = ["FULLY_FUNDED", "PARTIAL", "TUITION_WAIVER"];

export const ScholarshipIdParamSchema = z.object({
  id: z.string().trim().min(1, "Scholarship ID is required"),
});

const ScholarshipBaseSchema = {
  slug: z.string({ required_error: "Slug is required" }).trim().min(1, "Slug is required"),
  name: z.string({ required_error: "Name is required" }).trim().min(1, "Name is required"),
  organization: z.string({ required_error: "Organization is required" }).trim().min(1, "Organization is required"),
  funding: z.string({ required_error: "Funding description is required" }).trim().min(1, "Funding description is required"),
  degree: z.string({ required_error: "Degree level is required" }).trim().min(1, "Degree level is required"),
  deadline: z.coerce.date().nullable().optional(),
  deadlineString: z.string({ required_error: "Deadline label is required" }).trim().min(1, "Deadline label is required"),
  eligibility: z.string({ required_error: "Eligibility is required" }).trim().min(1, "Eligibility is required"),
  type: z.enum(SCHOLARSHIP_TYPES, {
    errorMap: () => ({ message: `Invalid type. Must be one of: ${SCHOLARSHIP_TYPES.join(", ")}` }),
  }),
  universityId: z.string().trim().nullable().optional(),
  countryIds: z.array(z.string().trim()).optional().default([]),
};

/** Schema for POST /api/admin/scholarships */
export const ScholarshipCreateSchema = z.object(ScholarshipBaseSchema);

/** Schema for PUT /api/admin/scholarships/:id */
export const ScholarshipUpdateSchema = z.object(ScholarshipBaseSchema);

// ============================================================================
// IMMIGRATION DEADLINE SCHEMAS (admin CRUD)
// ============================================================================
export const DEADLINE_TYPES = ["VISA", "IMMIGRATION", "APPLICATION", "REGISTRATION", "POLICY", "SCHOLARSHIP"];
export const DEADLINE_STATUSES = ["UPCOMING", "CLOSING_SOON", "PASSED", "UPDATED"];
export const DEADLINE_IMPORTANCE = ["CRITICAL", "HIGH", "MEDIUM"];

export const DeadlineIdParamSchema = z.object({
  id: z.string().trim().min(1, "Deadline ID is required"),
});
const DeadlineBaseSchema = {
  id: z.string({ required_error: "Deadline ID is required" }).trim().min(1, "Deadline ID is required"),
  slug: z.string({ required_error: "Slug is required" }).trim().min(1, "Slug is required"),
  title: z.string({ required_error: "Title is required" }).trim().min(1, "Title is required"),
  countryId: z.string({ required_error: "Country is required" }).trim().min(1, "Country is required"),
  deadlineDate: z.coerce.date({ required_error: "Deadline date is required" }),
  deadlineType: z.enum(DEADLINE_TYPES, {
    errorMap: () => ({ message: `Invalid type. Must be one of: ${DEADLINE_TYPES.join(", ")}` }),
  }),
  status: z.enum(DEADLINE_STATUSES, {
    errorMap: () => ({ message: `Invalid status. Must be one of: ${DEADLINE_STATUSES.join(", ")}` }),
  }),
  importance: z.enum(DEADLINE_IMPORTANCE, {
    errorMap: () => ({ message: `Invalid importance. Must be one of: ${DEADLINE_IMPORTANCE.join(", ")}` }),
  }),
  description: z.string({ required_error: "Description is required" }).trim().min(1, "Description is required"),
  source: z.string({ required_error: "Source is required" }).trim().min(1, "Source is required"),
  lastUpdated: z.string({ required_error: "Last updated label is required" }).trim().min(1, "Last updated label is required"),
  relatedArticleTitle: z.string().trim().nullable().optional(),
  relatedArticleHref: z.string().trim().nullable().optional(),
  applicationUrl: z.string().trim().nullable().optional(),
  tags: z.array(z.string().trim()).optional().default([]),
  content: z.string().trim().nullable().optional(),
};
export const DeadlineCreateSchema = z.object(DeadlineBaseSchema);
export const DeadlineUpdateSchema = z.object(DeadlineBaseSchema).omit({ id: true });

// ============================================================================
// SITE SETTINGS SCHEMA (admin singleton)
// ============================================================================
export const SettingsUpdateSchema = z.object({
  platformName: z.string({ required_error: "Platform name is required" }).trim().min(1, "Platform name is required"),
  tagline: z.string({ required_error: "Tagline is required" }).trim().min(1, "Tagline is required"),
  contactEmail: z
    .string({ required_error: "Editorial contact email is required" })
    .trim()
    .email("Invalid email address"),
  timezone: z.string({ required_error: "Primary timezone is required" }).trim().min(1, "Primary timezone is required"),
});

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

