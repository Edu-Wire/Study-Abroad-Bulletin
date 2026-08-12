/**
 * Study Abroad Intelligence — Centralized Taxonomy
 *
 * This file provides the single source of truth for:
 * 1. Editorial content categories + subcategories
 * 2. Advertising categories + subcategories
 * 3. Country taxonomy
 * 4. Ad placement slot identifiers
 * 5. Ad format definitions
 *
 * Both editorial content and advertising systems reference this taxonomy.
 * Future CMS / ad-server integrations can import and extend these structures
 * without requiring another major frontend redesign.
 */

// ============================================================
// EDITORIAL TAXONOMY
// ============================================================

export const editorialTaxonomy = {
  NEWS: {
    label: "News",
    slug: "news",
    subcategories: [
      { label: "University News", slug: "university-news" },
      { label: "Admissions", slug: "admissions" },
      { label: "Scholarships", slug: "scholarships" },
      { label: "Visa & Immigration", slug: "visa-immigration" },
      { label: "Policy Updates", slug: "policy-updates" },
      { label: "Education Policy", slug: "education-policy" },
      { label: "International Education", slug: "international-education" },
    ],
  },
  UNIVERSITIES: {
    label: "Universities",
    slug: "universities",
    subcategories: [
      { label: "University Rankings", slug: "rankings" },
      { label: "University Admissions", slug: "admissions" },
      { label: "University Reviews", slug: "reviews" },
      { label: "Courses", slug: "courses" },
      { label: "Tuition & Fees", slug: "tuition" },
      { label: "Campus Life", slug: "campus-life" },
    ],
  },
  SCHOLARSHIPS: {
    label: "Scholarships",
    slug: "scholarships",
    subcategories: [
      { label: "Fully Funded", slug: "fully-funded" },
      { label: "Partial Funding", slug: "partial" },
      { label: "Government Scholarships", slug: "government" },
      { label: "University Scholarships", slug: "university" },
      { label: "Merit Scholarships", slug: "merit" },
      { label: "Need-Based", slug: "need-based" },
      { label: "Research Scholarships", slug: "research" },
    ],
  },
  COUNTRIES: {
    label: "Countries",
    slug: "countries",
    subcategories: [
      { label: "Canada", slug: "canada" },
      { label: "United Kingdom", slug: "uk" },
      { label: "United States", slug: "usa" },
      { label: "Australia", slug: "australia" },
      { label: "Germany", slug: "germany" },
      { label: "Ireland", slug: "ireland" },
      { label: "Netherlands", slug: "netherlands" },
      { label: "France", slug: "france" },
    ],
  },
  VISA: {
    label: "Visa & Immigration",
    slug: "visa",
    subcategories: [
      { label: "Student Visa", slug: "student-visa" },
      { label: "Visa Updates", slug: "updates" },
      { label: "Visa Requirements", slug: "requirements" },
      { label: "Post-Study Work", slug: "post-study-work" },
      { label: "Immigration Policy", slug: "policy" },
    ],
  },
  ADMISSIONS: {
    label: "Admissions",
    slug: "admissions",
    subcategories: [
      { label: "Application Process", slug: "process" },
      { label: "SOP", slug: "sop" },
      { label: "LOR", slug: "lor" },
      { label: "Deadlines", slug: "deadlines" },
      { label: "Eligibility", slug: "eligibility" },
      { label: "Requirements", slug: "requirements" },
    ],
  },
  EXAMS: {
    label: "Exams & Test Prep",
    slug: "exams",
    subcategories: [
      { label: "IELTS", slug: "ielts" },
      { label: "TOEFL", slug: "toefl" },
      { label: "PTE", slug: "pte" },
      { label: "GRE", slug: "gre" },
      { label: "GMAT", slug: "gmat" },
      { label: "SAT", slug: "sat" },
      { label: "ACT", slug: "act" },
    ],
  },
  STUDENT_LIFE: {
    label: "Student Life",
    slug: "student-life",
    subcategories: [
      { label: "Accommodation", slug: "accommodation" },
      { label: "Cost of Living", slug: "cost-of-living" },
      { label: "Part-Time Jobs", slug: "jobs" },
      { label: "Health", slug: "health" },
      { label: "Travel", slug: "travel" },
      { label: "Campus Life", slug: "campus-life" },
    ],
  },
  CAREERS: {
    label: "Careers",
    slug: "careers",
    subcategories: [
      { label: "Internships", slug: "internships" },
      { label: "Graduate Jobs", slug: "graduate-jobs" },
      { label: "Post-Study Careers", slug: "post-study" },
      { label: "Salary", slug: "salary" },
      { label: "Work Visa", slug: "work-visa" },
    ],
  },
  GUIDES: {
    label: "Guides",
    slug: "guides",
    subcategories: [
      { label: "Application Guides", slug: "applications" },
      { label: "Scholarship Guides", slug: "scholarships" },
      { label: "Visa Guides", slug: "visa" },
      { label: "Country Guides", slug: "countries" },
      { label: "University Guides", slug: "universities" },
      { label: "Student Finance", slug: "finance" },
    ],
  },
} as const;

export type EditorialCategoryKey = keyof typeof editorialTaxonomy;

// ============================================================
// ADVERTISING TAXONOMY
// ============================================================

export const adTaxonomy = {
  UNIVERSITIES_COLLEGES: {
    label: "Universities & Colleges",
    slug: "universities-colleges",
    subcategories: [
      { label: "Universities", slug: "universities" },
      { label: "Colleges", slug: "colleges" },
      { label: "Business Schools", slug: "business-schools" },
      { label: "Medical Schools", slug: "medical-schools" },
      { label: "Engineering Schools", slug: "engineering-schools" },
      { label: "Language Schools", slug: "language-schools" },
      { label: "Online Universities", slug: "online-universities" },
    ],
  },
  EDUCATION_CONSULTANCIES: {
    label: "Education Consultancies",
    slug: "consultancies",
    subcategories: [
      { label: "Study Abroad Consultants", slug: "study-abroad" },
      { label: "Application Assistance", slug: "application" },
      { label: "Visa Assistance", slug: "visa" },
      { label: "University Counselling", slug: "counselling" },
      { label: "Career Counselling", slug: "career" },
    ],
  },
  TEST_PREPARATION: {
    label: "Test Preparation",
    slug: "test-prep",
    subcategories: [
      { label: "IELTS", slug: "ielts" },
      { label: "TOEFL", slug: "toefl" },
      { label: "PTE", slug: "pte" },
      { label: "GRE", slug: "gre" },
      { label: "GMAT", slug: "gmat" },
      { label: "SAT", slug: "sat" },
      { label: "Test Preparation Courses", slug: "courses" },
    ],
  },
  LANGUAGE_LEARNING: {
    label: "Language Learning",
    slug: "language",
    subcategories: [
      { label: "English", slug: "english" },
      { label: "German", slug: "german" },
      { label: "French", slug: "french" },
      { label: "Spanish", slug: "spanish" },
      { label: "Other Languages", slug: "other" },
    ],
  },
  EDUCATION_FINANCE: {
    label: "Education Loans & Finance",
    slug: "finance",
    subcategories: [
      { label: "Student Loans", slug: "loans" },
      { label: "Education Financing", slug: "financing" },
      { label: "Banking", slug: "banking" },
      { label: "Forex", slug: "forex" },
      { label: "International Payments", slug: "payments" },
    ],
  },
  ACCOMMODATION: {
    label: "Student Accommodation",
    slug: "accommodation",
    subcategories: [
      { label: "Student Housing", slug: "student-housing" },
      { label: "Hostels", slug: "hostels" },
      { label: "Private Rentals", slug: "private" },
      { label: "Co-living", slug: "coliving" },
    ],
  },
  TRAVEL: {
    label: "Travel",
    slug: "travel",
    subcategories: [
      { label: "Flights", slug: "flights" },
      { label: "Travel Agencies", slug: "agencies" },
      { label: "Student Travel", slug: "student-travel" },
      { label: "Airport Transfers", slug: "transfers" },
    ],
  },
  INSURANCE: {
    label: "Student Insurance",
    slug: "insurance",
    subcategories: [
      { label: "Health Insurance", slug: "health" },
      { label: "Travel Insurance", slug: "travel" },
      { label: "International Student Insurance", slug: "international" },
    ],
  },
  BANKING_FOREX: {
    label: "Banking & Forex",
    slug: "banking",
    subcategories: [
      { label: "Student Bank Accounts", slug: "accounts" },
      { label: "International Banking", slug: "international" },
      { label: "Currency Exchange", slug: "forex" },
      { label: "Money Transfer", slug: "transfer" },
    ],
  },
  STUDENT_SERVICES: {
    label: "Student Services",
    slug: "services",
    subcategories: [
      { label: "SIM Cards", slug: "sim" },
      { label: "Mobile Plans", slug: "mobile" },
      { label: "Relocation Services", slug: "relocation" },
      { label: "Document Services", slug: "documents" },
    ],
  },
  TECHNOLOGY: {
    label: "Technology",
    slug: "technology",
    subcategories: [
      { label: "Laptops", slug: "laptops" },
      { label: "Software", slug: "software" },
      { label: "Productivity Tools", slug: "productivity" },
    ],
  },
  CAREERS_RECRUITMENT: {
    label: "Careers & Recruitment",
    slug: "careers",
    subcategories: [
      { label: "Internships", slug: "internships" },
      { label: "Graduate Jobs", slug: "graduate" },
      { label: "Recruitment Agencies", slug: "agencies" },
      { label: "Career Platforms", slug: "platforms" },
    ],
  },
  EDUCATION_EVENTS: {
    label: "Education Events",
    slug: "events",
    subcategories: [
      { label: "University Fairs", slug: "fairs" },
      { label: "Education Expos", slug: "expos" },
      { label: "Webinars", slug: "webinars" },
      { label: "Open Days", slug: "open-days" },
    ],
  },
  ONLINE_EDUCATION: {
    label: "Online Education",
    slug: "online",
    subcategories: [
      { label: "Online Degrees", slug: "degrees" },
      { label: "Professional Courses", slug: "professional" },
      { label: "Certifications", slug: "certifications" },
      { label: "Bootcamps", slug: "bootcamps" },
    ],
  },
  IMMIGRATION_VISA: {
    label: "Immigration & Visa Services",
    slug: "immigration",
    subcategories: [
      { label: "Visa Consultants", slug: "consultants" },
      { label: "Immigration Services", slug: "services" },
      { label: "Legal Services", slug: "legal" },
      { label: "Document Assistance", slug: "documents" },
    ],
  },
} as const;

export type AdCategoryKey = keyof typeof adTaxonomy;

// ============================================================
// AD FORMATS
// ============================================================

export type AdFormat =
  | "leaderboard"    // 728×90 — desktop top/bottom
  | "billboard"      // 970×250 — desktop prominant
  | "rectangle"      // 300×250 — sidebar
  | "large-rectangle" // 336×280
  | "skyscraper"     // 160×600 — sidebar
  | "native-card"    // Matches content card dimensions
  | "native-article" // Full-width between article sections
  | "sponsored-card" // Labeled sponsored content card
  | "newsletter"     // Inside newsletter block
  | "mobile-banner"  // 320×50 — mobile
  | "interstitial";  // Full-width between sections

// ============================================================
// AD PLACEMENT SLOTS
// ============================================================

export type AdPlacementSlot =
  // Homepage
  | "homepage-top"
  | "homepage-after-hero"
  | "homepage-between-briefing-news"
  | "homepage-between-news-universities"
  | "homepage-between-scholarships-visa"
  | "homepage-before-newsletter"

  // News listing
  | "news-listing-top"
  | "news-listing-between-stories"
  | "news-listing-sidebar"

  // Article pages
  | "article-top"
  | "article-inline-01"
  | "article-inline-02"
  | "article-sidebar-top"
  | "article-sidebar-mid"

  // University pages
  | "universities-listing-top"
  | "universities-listing-inline"
  | "universities-listing-sidebar"
  | "university-detail-inline"
  | "university-detail-sidebar"

  // Scholarship pages
  | "scholarships-listing-top"
  | "scholarships-listing-inline"
  | "scholarships-listing-sidebar"
  | "scholarship-detail-inline"
  | "scholarship-detail-sidebar"

  // Country pages
  | "countries-listing-top"
  | "country-detail-inline-01"
  | "country-detail-inline-02"
  | "country-detail-sidebar"

  // Guide pages
  | "guides-listing-top"
  | "guide-detail-inline-01"
  | "guide-detail-inline-02"
  | "guide-detail-sidebar"

  // Visa & Tracker pages
  | "visa-listing-top"
  | "visa-listing-inline"
  | "visa-listing-sidebar"
  | "immigration-tracker-top"
  | "immigration-tracker-inline"
  | "immigration-tracker-sidebar"

  // Directory & Consultant pages
  | "directory-top"
  | "directory-featured"
  | "directory-sidebar"
  | "consultant-profile-sidebar"

  // Informational & Trust pages
  | "about-inline"
  | "editorial-standards-inline"

  // Global
  | "newsletter-sponsor"
  | "footer-ad";

// ============================================================
// AD TARGETING METADATA
// ============================================================

/**
 * Structure for future ad targeting.
 * When a backend/ad-server is integrated, this interface
 * defines what targeting parameters each ad placement supports.
 */
export interface AdTarget {
  slot: AdPlacementSlot;
  format: AdFormat;
  /** Which editorial category this placement is contextually relevant to */
  editorialCategory?: EditorialCategoryKey;
  /** Countries this placement is relevant to */
  countries?: string[];
  /** Which ad categories are eligible for this placement */
  eligibleAdCategories?: AdCategoryKey[];
}

// ============================================================
// COUNTRY TAXONOMY
// ============================================================

export const countryTaxonomy = [
  {
    slug: "canada",
    name: "Canada",
    flag: "🇨🇦",
    continent: "North America",
    currency: "CAD",
    language: "English / French",
  },
  {
    slug: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    continent: "Europe",
    currency: "GBP",
    language: "English",
  },
  {
    slug: "usa",
    name: "United States",
    flag: "🇺🇸",
    continent: "North America",
    currency: "USD",
    language: "English",
  },
  {
    slug: "australia",
    name: "Australia",
    flag: "🇦🇺",
    continent: "Oceania",
    currency: "AUD",
    language: "English",
  },
  {
    slug: "germany",
    name: "Germany",
    flag: "🇩🇪",
    continent: "Europe",
    currency: "EUR",
    language: "German",
  },
  {
    slug: "ireland",
    name: "Ireland",
    flag: "🇮🇪",
    continent: "Europe",
    currency: "EUR",
    language: "English",
  },
  {
    slug: "netherlands",
    name: "Netherlands",
    flag: "🇳🇱",
    continent: "Europe",
    currency: "EUR",
    language: "Dutch / English",
  },
  {
    slug: "france",
    name: "France",
    flag: "🇫🇷",
    continent: "Europe",
    currency: "EUR",
    language: "French",
  },
] as const;

export type CountrySlug = (typeof countryTaxonomy)[number]["slug"];
