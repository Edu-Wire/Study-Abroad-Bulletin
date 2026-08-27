/**
 * RSS Source Registry
 *
 * Every RSS/Atom feed the site ingests is declared here.
 * Country-specific fetchers (ircc.ts, uk.ts, …) import their own source
 * object from this file rather than hardcoding URLs and metadata.
 *
 * To add a new source later:
 *   1. Add an entry to rssSources below.
 *   2. Create src/lib/rss/<country>.ts following the same pattern as uk.ts.
 *   3. Call it from src/lib/rss/index.ts.
 *   4. That's it — the UI needs no changes.
 */

export interface RssSource {
  /** Unique identifier used by fetchers to look up their own config. */
  id: string;
  /** Human-readable source name shown in article attribution. */
  name: string;
  /** Country value written to every article produced by this source. */
  country: string;
  /** Category value written to every article produced by this source. */
  category: "Visa" | "Universities" | "Admissions" | "Scholarships" | "Student Life" | "Career";
  /** Broad source classification. */
  sourceType: "government" | "university" | "news";
  /** The feed URL. Empty string when enabled is false. */
  feedUrl: string;
  /** Set to false to exclude this source from fetching without deleting the config. */
  enabled: boolean;
  /**
   * Required when enabled is false.
   * Explains exactly why the source was not activated, so a future developer
   * knows what to investigate before re-enabling it.
   */
  disabledReason?: string;
  /**
   * Short prefix prepended to every slug generated from this source.
   * Prevents slug collisions between sources with similar headlines.
   * Example: "ircc" -> slug "ircc-canada-expands-passport-renewal"
   */
  slugPrefix: string;
  /**
   * Image used when the feed provides no article image.
   * Images are out of scope for Phase 1 -- this keeps cards from breaking.
   */
  fallbackImage: string;
}

export const rssSources: RssSource[] = [
  // Canada
  {
    id: "ircc-canada",
    name: "Immigration, Refugees and Citizenship Canada",
    country: "Canada",
    category: "Visa",
    sourceType: "government",
    feedUrl:
      "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=departmentofcitizenshipandimmigration&sort=publishedDate&orderBy=desc&publishedDate%3E=2021-07-23&pick=50&format=atom&atomtitle=Immigration%2C%20Refugees%20and%20Citizenship%20Canada",
    enabled: true,
    slugPrefix: "ircc",
    fallbackImage: "/images/news-canada-hero.jpg",
  },

  // United Kingdom
  {
    id: "ukvi",
    name: "UK Visas and Immigration",
    country: "United Kingdom",
    category: "Visa",
    sourceType: "government",
    // Official GOV.UK Atom feed filtered to the UK Visas and Immigration organisation.
    // Verified live on 2026-08-13: returns valid Atom XML with current UKVI news.
    feedUrl:
      "https://www.gov.uk/search/news-and-communications.atom?organisations[]=uk-visas-and-immigration",
    enabled: true,
    slugPrefix: "ukvi",
    fallbackImage: "/images/news-uk.jpg",
  },

  // Australia
  {
    id: "australia-home-affairs",
    name: "Australian Department of Home Affairs",
    country: "Australia",
    category: "Visa",
    sourceType: "government",
    feedUrl: "",
    enabled: false,
    disabledReason:
      "The Australian Department of Home Affairs does not publish an official RSS or Atom feed. " +
      "All candidate URLs (homeaffairs.gov.au, immi.homeaffairs.gov.au) returned connection " +
      "timeouts during live verification on 2026-08-13. A web search confirmed this: the " +
      "department distributes news via HTML pages and social media only. " +
      "Re-enable this source if they introduce a machine-readable feed in future.",
    slugPrefix: "aus",
    fallbackImage: "/images/news-australia.jpg",
  },

  // United States
  {
    id: "us-state-dept",
    name: "USCIS (U.S. Citizenship and Immigration Services)",
    country: "United States",
    category: "Visa",
    sourceType: "government",
    // Verified live on 2026-08-21: RSS 2.0 feed, 200 OK, ~20+ items.
    // Covers official USCIS news: student/exchange visa policy (I-539, I-765),
    // immigration alerts, policy manual updates, and news releases.
    feedUrl: "https://www.uscis.gov/news/rss-feed/59144",
    enabled: true,
    slugPrefix: "uscis",
    fallbackImage: "/images/news-library.jpg",
  },

  // Germany — Federal Foreign Office (Articles)
  {
    id: "germany-ffo-articles",
    name: "German Federal Foreign Office (Articles)",
    country: "Germany",
    category: "Visa",
    sourceType: "government",
    feedUrl: "https://www.auswaertiges-amt.de/static/includes/rss_en/RSS_Aktuelle_Artikel.xml",
    enabled: true,
    slugPrefix: "ffo-de",
    fallbackImage: "/images/news-germany.jpg",
  },

  // Germany — Federal Foreign Office (Press Releases & Speeches)
  {
    id: "germany-ffo-press",
    name: "German Federal Foreign Office (Press Releases)",
    country: "Germany",
    category: "Visa",
    sourceType: "government",
    feedUrl: "https://www.auswaertiges-amt.de/static/includes/rss_en/RSS_Pressemitteilungen_Reden.xml",
    enabled: true,
    slugPrefix: "ffo-press",
    fallbackImage: "/images/news-germany.jpg",
  },

  // New Zealand — Beehive (Ministry of Education)
  {
    id: "nz-beehive-education",
    name: "NZ Beehive (Ministry of Education)",
    country: "New Zealand",
    category: "Universities",
    sourceType: "government",
    feedUrl: "https://www.beehive.govt.nz/taxonomy/term/6729/feed",
    enabled: true,
    slugPrefix: "nz-edu",
    fallbackImage: "/images/news-library.jpg",
  },

  // European Union — European Commission Press Corner
  {
    id: "eu-press-corner",
    name: "European Commission Press Corner",
    country: "European Union",
    category: "Scholarships",
    sourceType: "government",
    feedUrl: "https://ec.europa.eu/commission/presscorner/api/rss?language=en&pagesize=50",
    enabled: true,
    slugPrefix: "eu-press",
    fallbackImage: "/images/news-scholarship.jpg",
  },
];

/** Returns all sources that are currently enabled. */
export function getEnabledSources(): RssSource[] {
  return rssSources.filter((s) => s.enabled);
}

/** Returns a single source by its id, or undefined if not found. */
export function getSourceById(id: string): RssSource | undefined {
  return rssSources.find((s) => s.id === id);
}
