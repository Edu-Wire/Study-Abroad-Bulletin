/**
 * Phase 1 Source Catalog - the data behind the registry.
 *
 * One record per official source in Blueprint 4.2 ("Consolidated Phase 1 source
 * map"), with the per-country handling rules from 5 encoded as configuration
 * and every record carrying its Appendix A research references.
 *
 * Counts here match the Admin navigation in Blueprint 13.1:
 *   CA 3 | UK 3 | AU 4 | US 5 | DE 4 | NZ 2 | IE 2 | EU 5  = 28 sources
 *
 * Records are authored as `SourceConfigInput` and validated in
 * `sourceRegistry.ts`; schema defaults supply anything omitted here.
 */

import type { SourceConfigInput } from "./sourceConfig.schema";

// ============================================================
// Shared cron cadences (Blueprint 4.2 "Cadence" column)
// ============================================================

const CRON = {
  every15m: "*/15 * * * *",
  every30m: "*/30 * * * *",
  hourly: "0 * * * *",
  every6h: "0 */6 * * *",
  every12h: "0 */12 * * *",
  monthly: "0 6 1 * *",
} as const;

/**
 * Backfill start dates for the 4.2 depth column, anchored to the Phase 1 build
 * date (2026-09). Depth strings stay human-readable for the Admin UI.
 */
const BACKFILL_FROM = {
  twelveMonths: "2025-09-01",
  twoYears: "2024-09-01",
  threeYears: "2023-09-01",
  fiveYears: "2021-09-01",
  ukStatementsOfChanges: "2021-01-01",
} as const;

// ============================================================
// Shared deterministic prefilter vocabulary (Blueprint 10.1)
// ============================================================

/** Core study-abroad signal shared by every geography. */
const CORE_STUDENT_TERMS = [
  "international student",
  "student visa",
  "study permit",
  "student permit",
  "higher education",
  "university",
  "tuition",
  "scholarship",
  "post-study work",
  "graduate route",
  "student mobility",
];

/**
 * Terms that mark a government item as off-topic for a study-abroad desk.
 * Used only by sources whose feeds are broad (5.5 FFO, 5.7 Ireland).
 */
const GENERIC_NEGATIVE_TERMS = [
  "military",
  "defence",
  "defense",
  "sanctions",
  "ambassador",
  "peacekeeping",
  "ceasefire",
  "humanitarian aid",
  "climate summit",
  "energy price",
];

// ============================================================
// Canada - Blueprint 5.1 [R4][R5]
// ============================================================

const CANADA_SOURCES: SourceConfigInput[] = [
  {
    code: "ca-ircc-atom",
    name: "IRCC Newsroom (Atom API)",
    geo: "CA",
    countryCodes: ["CA"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "RSS_ATOM",
    adapterClass: "CanadaSourceAdapter",
    transport: "ATOM",
    enabled: true,
    priority: "HIGH",
    schedule: CRON.every15m,
    cadenceMinutes: 15,
    externalIdStrategy: "NATIVE_GUID",
    canonicalUrlRule: "Canada.ca article URL from the Atom link, redirects resolved",
    discovery: {
      url: "https://api.io.canada.ca/io-server/gc/news/en/v2",
      params: {
        dept: "departmentofcitizenshipandimmigration",
        sort: "publishedDate",
        orderBy: "desc",
        pick: "50",
        format: "atom",
      },
      pagination: { mode: "NONE" },
    },
    detail: {
      // 5.1: the feed carries a summary, so the detail page is fetched before
      // classification.
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", ".mwsgeneric-base-html"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twoYears,
      windowDays: 30,
      depth: "2y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 70 },
    prefilter: {
      boostTerms: [
        ...CORE_STUDENT_TERMS,
        "study permit",
        "designated learning institution",
        "DLI",
        "PAL",
        "TAL",
        "PGWP",
        "student work",
        "spousal open work permit",
      ],
      minBoostHits: 1,
    },
    provenance: {
      references: ["R4"],
      owner: "Immigration, Refugees and Citizenship Canada",
      blueprintSection: "5.1 Canada",
      note: "Official Atom API filtered to the immigration department, pick=50.",
    },
  },
  {
    code: "ca-ircc-notices",
    name: "IRCC Notices",
    geo: "CA",
    countryCodes: ["CA"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "WEB_LISTING",
    adapterClass: "CanadaSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "HIGH",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "Notice detail URL under canada.ca/en/immigration-refugees-citizenship",
    discovery: {
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 20 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", ".mwsgeneric-base-html"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 75 },
    prefilter: {
      boostTerms: [
        ...CORE_STUDENT_TERMS,
        "study permit",
        "DLI",
        "PAL",
        "TAL",
        "PGWP",
        "processing time",
      ],
      minBoostHits: 1,
    },
    provenance: {
      references: ["R4"],
      owner: "Immigration, Refugees and Citizenship Canada",
      blueprintSection: "4.2 / 5.1 Canada",
      note: "Operational notices often carry student changes ahead of press releases.",
    },
  },
  {
    code: "ca-study-permit-watch",
    name: "IRCC Study Permit rules watch",
    geo: "CA",
    countryCodes: ["CA"],
    authorityType: "POLICY_RULES",
    trust: 100,
    adapter: "CHANGE_WATCH",
    adapterClass: "CanadaSourceAdapter",
    transport: "WATCH",
    enabled: true,
    priority: "CRITICAL",
    schedule: CRON.every6h,
    cadenceMinutes: 360,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched page URL itself; versions are keyed by content hash",
    discovery: {
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "WATCH_SNAPSHOT_DIFF",
      requiresDetailFetch: true,
      contentSelectors: ["main"],
    },
    watchTargets: [
      {
        key: "study-permit-hub",
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
        label: "Study permit hub",
        materialFacts: ["eligibility", "fees", "PAL/TAL requirement", "processing"],
      },
      {
        key: "study-permit-eligibility",
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/eligibility.html",
        label: "Study permit eligibility",
        materialFacts: ["eligibility", "financial proof", "DLI requirement"],
      },
      {
        key: "study-permit-work",
        url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work.html",
        label: "Work while studying",
        materialFacts: ["work hours", "on/off campus work", "co-op permit"],
      },
    ],
    // "Now onward" in 4.2: a watch has no historical corpus to backfill.
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 1, retryLimit: 4 },
    editorial: { relevancePrior: 95, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R5"],
      owner: "Immigration, Refugees and Citizenship Canada",
      blueprintSection: "5.1 Canada",
      note: "6-hour watch over study-permit pages; hash + version + diff per 11.2.",
    },
  },
];

// ============================================================
// United Kingdom - Blueprint 5.2 [R1][R2][R3]
// ============================================================

const UK_SOURCES: SourceConfigInput[] = [
  {
    code: "uk-govuk-search-api",
    name: "GOV.UK Search API (UKVI / Home Office discovery)",
    geo: "UK",
    countryCodes: ["GB"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "JSON_API",
    adapterClass: "UkSourceAdapter",
    transport: "API",
    enabled: true,
    priority: "HIGH",
    schedule: CRON.every15m,
    cadenceMinutes: 15,
    // 5.2: track content_id/base_path so slug changes do not fake duplicates.
    externalIdStrategy: "CONTENT_ID",
    canonicalUrlRule: "https://www.gov.uk + base_path from the search result",
    discovery: {
      url: "https://www.gov.uk/api/search.json",
      params: { q: "student visa", count: "100", start: "0" },
      pagination: { mode: "OFFSET", pageParam: "start", pageSizeParam: "count", pageSize: 100, maxPages: 20 },
    },
    detail: {
      // Search gives metadata only; the Content API is the authoritative body.
      strategy: "OFFICIAL_JSON_API",
      urlTemplate: "https://www.gov.uk/api/content/:basePath",
      requiresDetailFetch: true,
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twoYears,
      windowDays: 30,
      depth: "2y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 80 },
    prefilter: {
      boostTerms: [
        ...CORE_STUDENT_TERMS,
        "Appendix Student",
        "Child Student",
        "Graduate route",
        "student sponsor",
        "CAS",
        "confirmation of acceptance for studies",
        "immigration health surcharge",
      ],
      minBoostHits: 1,
    },
    provenance: {
      references: ["R1", "R2"],
      owner: "Government Digital Service / UKVI",
      blueprintSection: "5.2 United Kingdom",
      note: "Search API for discovery, Content API for detail. Never scrape rendered HTML.",
    },
  },
  {
    code: "uk-govuk-content-api",
    name: "Immigration Rules: Statements of Changes (Content API)",
    geo: "UK",
    countryCodes: ["GB"],
    authorityType: "POLICY_RULES",
    trust: 100,
    adapter: "JSON_API",
    adapterClass: "UkSourceAdapter",
    transport: "API",
    enabled: false,
    priority: "CRITICAL",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CONTENT_ID",
    canonicalUrlRule: "https://www.gov.uk + base_path of the statement of changes document",
    discovery: {
      // The collection page is itself a content item whose links list every
      // statement of changes (1994 onward).
      url: "https://www.gov.uk/api/content/government/collections/immigration-rules-statement-of-changes",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "OFFICIAL_JSON_API",
      urlTemplate: "https://www.gov.uk/api/content/:basePath",
      requiresDetailFetch: true,
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.ukStatementsOfChanges,
      windowDays: 90,
      depth: "2021+",
    },
    http: { timeoutMs: 30_000, maxConcurrencyPerDomain: 2, retryLimit: 4, maxPayloadBytes: 20_000_000 },
    editorial: { relevancePrior: 90, autoDraftMinRelevance: 70 },
    prefilter: {
      boostTerms: [
        "Appendix Student",
        "Child Student",
        "Graduate",
        "student sponsor",
        "Appendix ATAS",
        "Appendix Finance",
        ...CORE_STUDENT_TERMS,
      ],
      minBoostHits: 0,
    },
    provenance: {
      references: ["R2", "R3"],
      owner: "Home Office / GOV.UK Content Store",
      blueprintSection: "5.2 United Kingdom",
      note: "Parse accessible HTML when present; retain the PDF URL as evidence. Any Appendix Student / Child Student / Graduate / sponsor change is high-priority for AI review.",
    },
  },
  {
    code: "uk-immigration-rules-watch",
    name: "Student / Graduate / sponsor guidance watch",
    geo: "UK",
    countryCodes: ["GB"],
    authorityType: "POLICY_RULES",
    trust: 100,
    adapter: "CHANGE_WATCH",
    adapterClass: "UkSourceAdapter",
    transport: "WATCH",
    enabled: false,
    priority: "CRITICAL",
    schedule: CRON.every6h,
    cadenceMinutes: 360,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched GOV.UK page URL; versions keyed by content hash",
    discovery: {
      url: "https://www.gov.uk/api/content/student-visa",
      pagination: { mode: "NONE" },
    },
    detail: {
      // JSON diff, not HTML diff: the Content API gives a stable structure.
      strategy: "WATCH_SNAPSHOT_DIFF",
      urlTemplate: "https://www.gov.uk/api/content/:basePath",
      requiresDetailFetch: true,
    },
    watchTargets: [
      {
        key: "student-visa",
        url: "https://www.gov.uk/api/content/student-visa",
        label: "Student visa",
        materialFacts: ["fees", "financial requirement", "eligibility", "work rights"],
      },
      {
        key: "graduate-visa",
        url: "https://www.gov.uk/api/content/graduate-visa",
        label: "Graduate visa",
        materialFacts: ["duration", "eligibility", "fees"],
      },
      {
        key: "student-sponsor-guidance",
        url: "https://www.gov.uk/api/content/government/collections/sponsorship-information-for-employers-and-educators",
        label: "Student sponsor guidance",
        materialFacts: ["sponsor duties", "licence conditions", "CAS allocation"],
      },
    ],
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 95, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R2", "R3"],
      owner: "Home Office / GOV.UK Content Store",
      blueprintSection: "4.2 / 5.2 United Kingdom",
      note: "Rules pages can change without a press release, so the watch is independent of discovery.",
    },
  },
];

// ============================================================
// Australia - Blueprint 5.3 [R6][R7][R8][R9]
// ============================================================

const AUSTRALIA_SOURCES: SourceConfigInput[] = [
  {
    code: "au-study-australia-news",
    name: "Study Australia News",
    geo: "AU",
    countryCodes: ["AU"],
    authorityType: "STUDY_PORTAL_GOV",
    trust: 95,
    adapter: "WEB_LISTING",
    adapterClass: "AustraliaSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "HIGH",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "studyaustralia.gov.au article URL after redirect and canonical tag",
    discovery: {
      url: "https://www.studyaustralia.gov.au/en/tools-and-resources/news",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 30 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["article", "main"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twoYears,
      windowDays: 30,
      depth: "2y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    // 5.3: editorially high-signal, so the prior is high and nothing is gated out.
    editorial: { relevancePrior: 90 },
    prefilter: { boostTerms: [...CORE_STUDENT_TERMS, "CRICOS", "subclass 500"], minBoostHits: 0 },
    provenance: {
      references: ["R6"],
      owner: "Australian Trade and Investment Commission (Austrade)",
      blueprintSection: "5.3 Australia",
      note: "High student relevance: visa fees, CRICOS, scholarships.",
    },
  },
  {
    code: "au-education-newsroom-rss",
    name: "Department of Education Newsroom (RSS)",
    geo: "AU",
    countryCodes: ["AU"],
    authorityType: "EDUCATION_GOV",
    trust: 100,
    adapter: "RSS_ATOM",
    adapterClass: "AustraliaSourceAdapter",
    transport: "RSS",
    enabled: false,
    priority: "MEDIUM",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "NATIVE_GUID",
    canonicalUrlRule: "education.gov.au article URL from the feed link",
    discovery: {
      url: "https://www.education.gov.au/newsroom/rss.xml",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["article", "main"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twoYears,
      windowDays: 30,
      depth: "2y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 55 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "international education", "ESOS", "CRICOS", "onshore student"],
      // 5.3: filter out domestic childcare/school stories unless international
      // education is implicated.
      negativeTerms: ["childcare", "early childhood", "preschool", "primary school", "school funding"],
      minBoostHits: 1,
    },
    provenance: {
      references: ["R7"],
      owner: "Australian Government Department of Education",
      blueprintSection: "5.3 Australia",
    },
  },
  {
    code: "au-homeaffairs-subclass500-watch",
    name: "Home Affairs Subclass 500 Student visa watch",
    geo: "AU",
    countryCodes: ["AU"],
    authorityType: "VISA_AUTHORITY",
    trust: 100,
    adapter: "CHANGE_WATCH",
    adapterClass: "AustraliaSourceAdapter",
    transport: "WATCH",
    enabled: false,
    priority: "CRITICAL",
    schedule: CRON.every6h,
    cadenceMinutes: 360,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched immi.homeaffairs.gov.au page URL",
    discovery: {
      url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "WATCH_SNAPSHOT_DIFF",
      requiresDetailFetch: true,
      contentSelectors: ["main", ".main-content"],
    },
    watchTargets: [
      {
        key: "subclass-500",
        url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
        label: "Subclass 500 Student visa",
        // 5.3 names exactly what a diff must be checked against.
        materialFacts: [
          "requirements",
          "fee",
          "processing time",
          "work rights",
          "English test",
          "financial evidence",
          "application conditions",
        ],
      },
    ],
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 1, retryLimit: 4 },
    editorial: { relevancePrior: 95, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R9"],
      owner: "Australian Department of Home Affairs",
      blueprintSection: "5.3 Australia",
    },
  },
  {
    code: "au-education-monthly-data",
    name: "International Student monthly summary and data tables",
    geo: "AU",
    countryCodes: ["AU"],
    authorityType: "DATA_GOV",
    trust: 100,
    adapter: "DATA_FILE",
    adapterClass: "AustraliaSourceAdapter",
    transport: "DATA",
    enabled: true,
    priority: "LOW",
    schedule: CRON.monthly,
    cadenceMinutes: 43_200,
    externalIdStrategy: "DATASET_RELEASE_KEY",
    canonicalUrlRule: "Release page URL plus dataset release month",
    discovery: {
      url: "https://www.education.gov.au/international-education-data-and-research/international-student-monthly-summary-and-data-tables",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "FILE_DOWNLOAD",
      requiresDetailFetch: true,
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.fiveYears,
      windowDays: 365,
      depth: "5y",
    },
    // XLSX releases are large; give this source its own payload ceiling.
    http: { timeoutMs: 120_000, maxConcurrencyPerDomain: 1, retryLimit: 3, maxPayloadBytes: 120_000_000 },
    // 5.3: a data import, never an article. Nothing here should reach the
    // editorial draft path, so the auto-draft bar is set out of reach.
    editorial: { relevancePrior: 40, autoDraftMinRelevance: 100, autoDraftMinConfidence: 100 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R8"],
      owner: "Australian Government Department of Education",
      blueprintSection: "5.3 Australia",
      note: "Separate data_import run: persist dataset metadata/checksum and normalized aggregates, not each row as a news article.",
    },
  },
];

// ============================================================
// United States - Blueprint 5.4 [R10][R11][R12]
// ============================================================

const US_SOURCES: SourceConfigInput[] = [
  {
    code: "us-uscis-news-rss",
    name: "USCIS All News",
    geo: "US",
    countryCodes: ["US"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "RSS_ATOM",
    adapterClass: "UsaSourceAdapter",
    transport: "RSS",
    enabled: false,
    priority: "MEDIUM",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "NATIVE_GUID",
    canonicalUrlRule: "uscis.gov newsroom URL from the feed link",
    discovery: {
      url: "https://www.uscis.gov/news/rss-feed/60288",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["article", "main"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twoYears,
      windowDays: 30,
      depth: "2y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 50 },
    // 5.4: apply deterministic student filters before AI - USCIS is broad.
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "F-1", "M-1", "J-1", "OPT", "CPT", "SEVP", "SEVIS", "STEM OPT"],
      negativeTerms: ["asylum", "naturalization ceremony", "green card lottery"],
      minBoostHits: 1,
      strict: true,
    },
    provenance: {
      references: ["R10"],
      owner: "U.S. Citizenship and Immigration Services",
      blueprintSection: "5.4 United States",
      note: "Feed URL verified against the All News listing during onboarding (Appendix C step 2).",
    },
  },
  {
    code: "us-uscis-alerts",
    name: "USCIS Alerts",
    geo: "US",
    countryCodes: ["US"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "WEB_LISTING",
    adapterClass: "UsaSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "HIGH",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "uscis.gov alert URL after redirect normalization",
    discovery: {
      url: "https://www.uscis.gov/newsroom/alerts",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 30 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["article", "main"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twoYears,
      windowDays: 30,
      depth: "2y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 60 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "F-1", "M-1", "J-1", "OPT", "CPT", "SEVP", "SEVIS"],
      minBoostHits: 1,
      strict: true,
    },
    provenance: {
      references: ["R10"],
      owner: "U.S. Citizenship and Immigration Services",
      blueprintSection: "4.2 United States",
      note: "Operational immigration alerts; separate stream from All News.",
    },
  },
  {
    code: "us-state-visas-news",
    name: "Department of State - U.S. Visas News",
    geo: "US",
    countryCodes: ["US"],
    authorityType: "VISA_AUTHORITY",
    trust: 100,
    adapter: "WEB_LISTING",
    adapterClass: "UsaSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "HIGH",
    schedule: CRON.every15m,
    cadenceMinutes: 15,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "travel.state.gov news item URL after redirect normalization",
    discovery: {
      url: "https://travel.state.gov/content/travel/en/News/visas-news.html",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", ".tsg-rwd-content-page-parsysxxx"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    // 5.4: visa operational changes are time-sensitive and nationality-specific.
    editorial: { relevancePrior: 80 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "F-1", "M-1", "J-1", "visa interview", "appointment", "visa bulletin"],
      minBoostHits: 0,
    },
    provenance: {
      references: ["R12"],
      owner: "U.S. Department of State - Bureau of Consular Affairs",
      blueprintSection: "5.4 United States",
    },
  },
  {
    code: "us-state-study-exchange-watch",
    name: "State Department Study & Exchange (F/M/J) watch",
    geo: "US",
    countryCodes: ["US"],
    authorityType: "VISA_AUTHORITY",
    trust: 100,
    adapter: "CHANGE_WATCH",
    adapterClass: "UsaSourceAdapter",
    transport: "WATCH",
    enabled: false,
    priority: "CRITICAL",
    schedule: CRON.every6h,
    cadenceMinutes: 360,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched travel.state.gov page URL",
    discovery: {
      url: "https://travel.state.gov/content/travel/en/us-visas/study.html",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "WATCH_SNAPSHOT_DIFF",
      requiresDetailFetch: true,
      contentSelectors: ["main"],
    },
    watchTargets: [
      {
        key: "study-exchange-hub",
        url: "https://travel.state.gov/content/travel/en/us-visas/study.html",
        label: "Study & Exchange visas",
        materialFacts: ["visa categories", "eligibility", "fees", "application steps"],
      },
      {
        key: "student-visa-fm",
        url: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
        label: "Student visa (F/M)",
        materialFacts: ["eligibility", "SEVIS fee", "interview requirement", "work rights"],
      },
      {
        key: "exchange-visitor-j",
        url: "https://travel.state.gov/content/travel/en/us-visas/study/exchange.html",
        label: "Exchange visitor visa (J)",
        materialFacts: ["eligibility", "two-year home residency", "program sponsor rules"],
      },
    ],
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 1, retryLimit: 4 },
    editorial: { relevancePrior: 95, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R11"],
      owner: "U.S. Department of State - Bureau of Consular Affairs",
      blueprintSection: "5.4 United States",
    },
  },
  {
    code: "us-ice-sevp-watch",
    name: "ICE / SEVP student guidance watch",
    geo: "US",
    countryCodes: ["US"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "CHANGE_WATCH",
    adapterClass: "UsaSourceAdapter",
    transport: "WATCH",
    enabled: false,
    priority: "HIGH",
    schedule: CRON.every12h,
    cadenceMinutes: 720,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched ice.gov / studyinthestates.dhs.gov page URL",
    discovery: {
      url: "https://studyinthestates.dhs.gov/students",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "WATCH_SNAPSHOT_DIFF",
      requiresDetailFetch: true,
      contentSelectors: ["main"],
    },
    watchTargets: [
      {
        key: "sevp-students",
        url: "https://studyinthestates.dhs.gov/students",
        label: "Study in the States - students",
        materialFacts: ["F/M status", "travel guidance", "employment guidance"],
      },
      {
        key: "sevp-employment",
        url: "https://studyinthestates.dhs.gov/students/work",
        label: "Student employment guidance",
        materialFacts: ["OPT", "CPT", "STEM OPT", "on-campus work"],
      },
    ],
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 1, retryLimit: 4 },
    editorial: { relevancePrior: 90, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: [],
      owner: "U.S. Immigration and Customs Enforcement / SEVP",
      appendixExempt: true,
      blueprintSection: "4.2 United States",
      note: "Named in the 4.2 source map without a dedicated Appendix A reference. Public guidance pages only - 5.4 forbids crawling authenticated SEVIS.",
    },
  },
];

// ============================================================
// Germany - Blueprint 5.5 [R13]
// ============================================================

/** 5.5: the FFO feeds are broad diplomatic content and must be filtered hard. */
const FFO_PREFILTER = {
  boostTerms: [
    ...CORE_STUDENT_TERMS,
    "national visa",
    "residence permit",
    "student applicant",
    "language course visa",
    "academic",
    "DAAD",
    "recognition of qualifications",
  ],
  negativeTerms: GENERIC_NEGATIVE_TERMS,
  minBoostHits: 1,
  strict: true,
};

const GERMANY_SOURCES: SourceConfigInput[] = [
  {
    code: "de-ffo-news-rss",
    name: "Federal Foreign Office - current articles (RSS)",
    geo: "DE",
    countryCodes: ["DE"],
    authorityType: "GENERAL_GOV_NEWS",
    trust: 100,
    adapter: "RSS_ATOM",
    adapterClass: "GermanySourceAdapter",
    transport: "RSS",
    enabled: false,
    priority: "LOW",
    schedule: CRON.hourly,
    cadenceMinutes: 60,
    externalIdStrategy: "NATIVE_GUID",
    canonicalUrlRule: "auswaertiges-amt.de article URL from the feed link",
    discovery: {
      url: "https://www.auswaertiges-amt.de/en/newsroom/newsletter/rss/229868-229868",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["article", "main"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twelveMonths,
      windowDays: 30,
      depth: "12m",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 30 },
    prefilter: FFO_PREFILTER,
    provenance: {
      references: ["R13"],
      owner: "German Federal Foreign Office",
      blueprintSection: "5.5 Germany",
      note: "Authoritative but broad. Strong prefilter: do not spend AI tokens on obviously unrelated geopolitical stories.",
    },
  },
  {
    code: "de-ffo-press-releases-rss",
    name: "Federal Foreign Office - press releases and speeches (RSS)",
    geo: "DE",
    countryCodes: ["DE"],
    authorityType: "GENERAL_GOV_NEWS",
    trust: 100,
    adapter: "RSS_ATOM",
    adapterClass: "GermanySourceAdapter",
    transport: "RSS",
    enabled: false,
    priority: "LOW",
    schedule: CRON.hourly,
    cadenceMinutes: 60,
    externalIdStrategy: "NATIVE_GUID",
    canonicalUrlRule: "auswaertiges-amt.de item URL from the feed link",
    discovery: {
      url: "https://www.auswaertiges-amt.de/en/newsroom/newsletter/rss/229870-229870",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["article", "main"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twelveMonths,
      windowDays: 30,
      depth: "12m",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 25 },
    prefilter: FFO_PREFILTER,
    provenance: {
      references: ["R13"],
      owner: "German Federal Foreign Office",
      blueprintSection: "4.2 / 5.5 Germany",
      note: "Low/medium relevance; filter aggressively.",
    },
  },
  {
    code: "de-make-it-in-germany-watch",
    name: "Make it in Germany - Visa for studying watch",
    geo: "DE",
    countryCodes: ["DE"],
    authorityType: "STUDY_PORTAL_GOV",
    trust: 95,
    adapter: "CHANGE_WATCH",
    adapterClass: "GermanySourceAdapter",
    transport: "WATCH",
    enabled: false,
    priority: "CRITICAL",
    schedule: CRON.every6h,
    cadenceMinutes: 360,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched make-it-in-germany.com page URL",
    discovery: {
      url: "https://www.make-it-in-germany.com/en/visa-residence/types/study-training/study",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "WATCH_SNAPSHOT_DIFF",
      requiresDetailFetch: true,
      contentSelectors: ["main"],
    },
    watchTargets: [
      {
        key: "visa-for-studying",
        url: "https://www.make-it-in-germany.com/en/visa-residence/types/study-training/study",
        label: "Visa for studying",
        // 5.5 names the three diffs that matter here.
        materialFacts: ["financial proof", "work limits", "post-study residence"],
      },
    ],
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 1, retryLimit: 4 },
    editorial: { relevancePrior: 95, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R13"],
      owner: "Federal Ministry for Economic Affairs and Climate Action (Make it in Germany)",
      blueprintSection: "5.5 Germany",
      note: "Critical rule watch, high-priority despite the portal's non-authority classification.",
    },
  },
  {
    code: "de-daad-news",
    name: "DAAD press, news and scholarship items",
    geo: "DE",
    countryCodes: ["DE"],
    authorityType: "MOBILITY_EDUCATION",
    trust: 95,
    adapter: "WEB_LISTING",
    adapterClass: "GermanySourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "MEDIUM",
    schedule: CRON.hourly,
    cadenceMinutes: 60,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "daad.de item URL after redirect and canonical tag",
    discovery: {
      url: "https://www.daad.de/en/the-daad/communication-publications/press/press-releases/",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 20 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["article", "main"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.twoYears,
      windowDays: 30,
      depth: "2y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 75 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "DAAD", "funding programme", "call for applications", "mobility"],
      minBoostHits: 0,
    },
    provenance: {
      references: [],
      owner: "Deutscher Akademischer Austauschdienst (DAAD)",
      appendixExempt: true,
      blueprintSection: "5.5 Germany",
      note: "Named in 4.2/5.5 without a dedicated Appendix A reference. Classification must distinguish scholarship opportunities from general mobility news.",
    },
  },
];

// ============================================================
// New Zealand - Blueprint 5.6 [R14]
// ============================================================

const NEW_ZEALAND_SOURCES: SourceConfigInput[] = [
  {
    code: "nz-immigration-news",
    name: "Immigration New Zealand News Centre",
    geo: "NZ",
    countryCodes: ["NZ"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "WEB_LISTING",
    adapterClass: "NewZealandSourceAdapter",
    transport: "WEB",
    enabled: true,
    priority: "HIGH",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "immigration.govt.nz news item URL after redirect normalization",
    discovery: {
      // 5.6: poll filtered by Study / Study to work / Immigration rules topics.
      url: "https://www.immigration.govt.nz/about-us/news-centre",
      params: { topic: "study" },
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 40 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", "article"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 90 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "Pathway Student Visa", "study to work", "post study work visa"],
      minBoostHits: 0,
    },
    provenance: {
      references: ["R14"],
      owner: "Immigration New Zealand",
      blueprintSection: "5.6 New Zealand",
      note: "Native topic labels are stored separately from AbroadBulletin editorial categories.",
    },
  },
  {
    code: "nz-pathway-student-watch",
    name: "Pathway Student Visa & post-study work guidance watch",
    geo: "NZ",
    countryCodes: ["NZ"],
    authorityType: "POLICY_RULES",
    trust: 100,
    adapter: "CHANGE_WATCH",
    adapterClass: "NewZealandSourceAdapter",
    transport: "WATCH",
    enabled: false,
    priority: "CRITICAL",
    schedule: CRON.every6h,
    cadenceMinutes: 360,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched immigration.govt.nz page URL",
    discovery: {
      url: "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/pathway-student-visa",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "WATCH_SNAPSHOT_DIFF",
      requiresDetailFetch: true,
      contentSelectors: ["main"],
    },
    watchTargets: [
      {
        key: "pathway-student-visa",
        url: "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/pathway-student-visa",
        label: "Pathway Student Visa",
        materialFacts: ["eligibility", "duration", "fees", "provider requirements"],
      },
      {
        key: "post-study-work-visa",
        url: "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/post-study-work-visa",
        label: "Post Study Work Visa",
        materialFacts: ["eligibility", "duration", "qualification level", "work rights"],
      },
    ],
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 1, retryLimit: 4 },
    editorial: { relevancePrior: 95, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R14"],
      owner: "Immigration New Zealand",
      blueprintSection: "5.6 New Zealand",
      note: "Watches operational changes that never receive a dedicated news item.",
    },
  },
];

// ============================================================
// Ireland - Blueprint 5.7 [R15][R16]
// ============================================================

const IRELAND_SOURCES: SourceConfigInput[] = [
  {
    code: "ie-isd-news-updates",
    name: "Immigration Service Delivery - News and Updates",
    geo: "IE",
    countryCodes: ["IE"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "WEB_LISTING",
    adapterClass: "IrelandSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "HIGH",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "irishimmigration.ie item URL after redirect normalization",
    discovery: {
      url: "https://www.irishimmigration.ie/news-and-updates/",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 40 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", "article"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 70 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "Stamp 2", "student permission", "non-EEA student", "bridging permission"],
      // 5.7: citizenship / temporary protection updates are not study-abroad
      // content unless a student rule is explicitly affected. The AI stage still
      // sees an item that also hits a boost term.
      negativeTerms: ["citizenship ceremony", "naturalisation", "temporary protection", "asylum"],
      minBoostHits: 1,
    },
    provenance: {
      references: ["R15"],
      owner: "Irish Department of Justice - Immigration Service Delivery",
      blueprintSection: "5.7 Ireland",
      note: "Student-specific operational notices appear in the same collection as general notices.",
    },
  },
  {
    code: "ie-student-permission-watch",
    name: "ISD Student Permission / Stamp 2 rules watch",
    geo: "IE",
    countryCodes: ["IE"],
    authorityType: "POLICY_RULES",
    trust: 100,
    adapter: "CHANGE_WATCH",
    adapterClass: "IrelandSourceAdapter",
    transport: "WATCH",
    enabled: false,
    priority: "CRITICAL",
    schedule: CRON.every6h,
    cadenceMinutes: 360,
    externalIdStrategy: "WATCH_TARGET_URL",
    canonicalUrlRule: "The watched irishimmigration.ie page URL",
    discovery: {
      url: "https://www.irishimmigration.ie/my-situation-has-changed-since-i-arrived-in-ireland/student-permission/",
      pagination: { mode: "NONE" },
    },
    detail: {
      strategy: "WATCH_SNAPSHOT_DIFF",
      requiresDetailFetch: true,
      contentSelectors: ["main"],
    },
    watchTargets: [
      {
        key: "student-permission",
        url: "https://www.irishimmigration.ie/my-situation-has-changed-since-i-arrived-in-ireland/student-permission/",
        label: "Student permission (Stamp 2)",
        // 5.7 names the four fields a diff must version.
        materialFacts: ["student finance", "eligible programme", "permission conditions", "work conditions"],
      },
      {
        key: "coming-to-study",
        url: "https://www.irishimmigration.ie/coming-to-study-in-ireland/",
        label: "Coming to study in Ireland",
        materialFacts: ["eligibility", "finance", "programme list", "visa requirement"],
      },
    ],
    backfill: { enabled: false, depth: "Now onward" },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 1, retryLimit: 4 },
    editorial: { relevancePrior: 95, autoDraftMinRelevance: 70 },
    prefilter: { minBoostHits: 0 },
    provenance: {
      references: ["R16"],
      owner: "Irish Department of Justice - Immigration Service Delivery",
      blueprintSection: "5.7 Ireland",
    },
  },
];

// ============================================================
// European Union - Blueprint 5.8 [R17][R18][R19][R20][R21]
// ============================================================

const EU_SOURCES: SourceConfigInput[] = [
  {
    code: "eu-press-corner-api",
    name: "European Commission Press Corner (Search + Document API)",
    geo: "EU",
    countryCodes: ["EU"],
    authorityType: "GOVERNMENT_PRESS",
    trust: 100,
    adapter: "JSON_API",
    adapterClass: "EuSourceAdapter",
    transport: "API",
    enabled: true,
    priority: "HIGH",
    schedule: CRON.every15m,
    cadenceMinutes: 15,
    // 5.8: external ID is the refCode, e.g. SPEECH/26/1765.
    externalIdStrategy: "NATIVE_REFERENCE",
    canonicalUrlRule: "Press Corner detail URL built from the refCode and language",
    discovery: {
      url: "https://ec.europa.eu/commission/presscorner/api/search",
      params: { language: "en", pagesize: "100", pagenumber: "1" },
      pagination: {
        mode: "PAGE_NUMBER",
        pageParam: "pagenumber",
        pageSizeParam: "pagesize",
        pageSize: 100,
        maxPages: 50,
      },
    },
    detail: {
      // The RSS card carries a summary only - this is the bug 1 calls out.
      // htmlContent from /api/documents is the authoritative body.
      strategy: "OFFICIAL_JSON_API",
      urlTemplate: "https://ec.europa.eu/commission/presscorner/api/documents?reference=:refCode&language=en",
      requiresDetailFetch: true,
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      // 5.8 mandates the 72-hour overlap on incremental API search.
      overlapHours: 72,
      depth: "3y targeted",
    },
    http: { timeoutMs: 30_000, maxConcurrencyPerDomain: 2, retryLimit: 4, maxPayloadBytes: 15_000_000 },
    editorial: { relevancePrior: 45 },
    prefilter: {
      boostTerms: [
        ...CORE_STUDENT_TERMS,
        "Erasmus",
        "student mobility",
        "recognition of qualifications",
        "legal migration",
        "researcher",
        "Blue Card",
      ],
      // General Commission press releases are mostly off-desk. The AI still gets
      // anything that hits a boost term; nothing is auto-labelled by topic.
      negativeTerms: GENERIC_NEGATIVE_TERMS,
      minBoostHits: 1,
      strict: true,
    },
    provenance: {
      references: ["R17", "R18"],
      owner: "European Commission - Spokesperson's Service",
      blueprintSection: "5.8 European Union",
      note: "Preserve native document type, policy areas, commissioner/place, eventDate/publishDate and full HTML. Never treat a failed page as end-of-results. Native policy areas are source metadata, never AbroadBulletin categories (10.4).",
    },
  },
  {
    code: "eu-commission-dept-news",
    name: "European Commission Department News",
    geo: "EU",
    countryCodes: ["EU"],
    authorityType: "GOVERNMENT_PRESS",
    trust: 100,
    adapter: "RSS_ATOM",
    adapterClass: "EuSourceAdapter",
    transport: "RSS",
    enabled: false,
    priority: "MEDIUM",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "NATIVE_GUID",
    canonicalUrlRule: "commission.europa.eu item URL from the feed link",
    discovery: {
      url: "https://commission.europa.eu/news-and-media_en",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 30 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", "article"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 40 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "Erasmus", "student mobility", "education area"],
      negativeTerms: GENERIC_NEGATIVE_TERMS,
      minBoostHits: 1,
      strict: true,
    },
    provenance: {
      references: ["R17"],
      owner: "European Commission",
      blueprintSection: "5.8 European Union",
      note: "Separate source from Press Corner: it covers Commission services outside the Spokesperson stream.",
    },
  },
  {
    code: "eu-dg-home-news",
    name: "DG Migration and Home Affairs - News",
    geo: "EU",
    countryCodes: ["EU"],
    authorityType: "IMMIGRATION_AUTHORITY",
    trust: 100,
    adapter: "WEB_LISTING",
    adapterClass: "EuSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "HIGH",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "home-affairs.ec.europa.eu item URL after redirect normalization",
    discovery: {
      url: "https://home-affairs.ec.europa.eu/news_en",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 30 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", "article"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    // 5.8: DG HOME / Education Area / Erasmus+ get higher study-abroad priors
    // than general Commission news.
    editorial: { relevancePrior: 70 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "legal migration", "visa policy", "students and researchers directive"],
      minBoostHits: 0,
    },
    provenance: {
      references: ["R19"],
      owner: "European Commission DG Migration and Home Affairs",
      blueprintSection: "5.8 European Union",
    },
  },
  {
    code: "eu-education-area-news",
    name: "European Education Area - News",
    geo: "EU",
    countryCodes: ["EU"],
    authorityType: "MOBILITY_EDUCATION",
    trust: 95,
    adapter: "WEB_LISTING",
    adapterClass: "EuSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "MEDIUM",
    schedule: CRON.every30m,
    cadenceMinutes: 30,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "education.ec.europa.eu item URL after redirect normalization",
    discovery: {
      url: "https://education.ec.europa.eu/whats-new/news",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 30 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", "article"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 80 },
    prefilter: {
      boostTerms: [...CORE_STUDENT_TERMS, "learning mobility", "European Universities", "micro-credentials"],
      minBoostHits: 0,
    },
    provenance: {
      references: ["R20"],
      owner: "European Commission - European Education Area",
      blueprintSection: "5.8 European Union",
    },
  },
  {
    code: "eu-erasmus-plus-news",
    name: "Erasmus+ News / Erasmus Mundus",
    geo: "EU",
    countryCodes: ["EU"],
    authorityType: "MOBILITY_EDUCATION",
    trust: 95,
    adapter: "WEB_LISTING",
    adapterClass: "EuSourceAdapter",
    transport: "WEB",
    enabled: false,
    priority: "MEDIUM",
    schedule: CRON.hourly,
    cadenceMinutes: 60,
    externalIdStrategy: "CANONICAL_URL",
    canonicalUrlRule: "erasmus-plus.ec.europa.eu item URL after redirect normalization",
    discovery: {
      url: "https://erasmus-plus.ec.europa.eu/whats-new",
      pagination: { mode: "PAGE_NUMBER", pageParam: "page", maxPages: 30 },
    },
    detail: {
      strategy: "SERVER_RENDERED_HTML",
      requiresDetailFetch: true,
      contentSelectors: ["main", "article"],
    },
    backfill: {
      enabled: true,
      startDate: BACKFILL_FROM.threeYears,
      windowDays: 30,
      depth: "3y",
    },
    http: { timeoutMs: 20_000, maxConcurrencyPerDomain: 2, retryLimit: 4 },
    editorial: { relevancePrior: 85 },
    prefilter: {
      boostTerms: [
        ...CORE_STUDENT_TERMS,
        "Erasmus Mundus",
        "joint master",
        "call for proposals",
        "mobility grant",
      ],
      minBoostHits: 0,
    },
    provenance: {
      references: ["R21"],
      owner: "European Commission - Erasmus+",
      blueprintSection: "5.8 European Union",
      note: "Supplies mobility, Erasmus Mundus and funding/news. Scholarship framing still requires the scholarshipRelevance threshold (10.4).",
    },
  },
];

// ============================================================
// Catalog
// ============================================================

/**
 * The full Phase 1 catalog in Admin navigation order. Validated (and turned into
 * `SourceConfig`) by `sourceRegistry.ts` - import from there, not from here.
 */
export const PHASE1_SOURCE_INPUTS: SourceConfigInput[] = [
  ...CANADA_SOURCES,
  ...UK_SOURCES,
  ...AUSTRALIA_SOURCES,
  ...US_SOURCES,
  ...GERMANY_SOURCES,
  ...NEW_ZEALAND_SOURCES,
  ...IRELAND_SOURCES,
  ...EU_SOURCES,
];

/** Expected per-geo counts from Blueprint 13.1; asserted by the registry. */
export const EXPECTED_SOURCE_COUNTS = {
  CA: 3,
  UK: 3,
  AU: 4,
  US: 5,
  DE: 4,
  NZ: 2,
  IE: 2,
  EU: 5,
} as const;
