/**
 * Centralized Country Architecture & Normalization for Study Abroad Intelligence
 * Single source of truth for ISO 3166-1 alpha-2 mappings and country metadata.
 */

export interface CountryConfig {
  code: string;
  name: string;
  slug: string;
  continent: string;
  currency: string;
  language: string;
}

export const countryMap: Record<string, CountryConfig> = {
  CA: {
    code: "CA",
    name: "Canada",
    slug: "canada",
    continent: "North America",
    currency: "CAD",
    language: "English / French",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    slug: "uk",
    continent: "Europe",
    currency: "GBP",
    language: "English",
  },
  US: {
    code: "US",
    name: "United States",
    slug: "usa",
    continent: "North America",
    currency: "USD",
    language: "English",
  },
  AU: {
    code: "AU",
    name: "Australia",
    slug: "australia",
    continent: "Oceania",
    currency: "AUD",
    language: "English",
  },
  DE: {
    code: "DE",
    name: "Germany",
    slug: "germany",
    continent: "Europe",
    currency: "EUR",
    language: "German",
  },
  IE: {
    code: "IE",
    name: "Ireland",
    slug: "ireland",
    continent: "Europe",
    currency: "EUR",
    language: "English",
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    slug: "netherlands",
    continent: "Europe",
    currency: "EUR",
    language: "Dutch / English",
  },
  FR: {
    code: "FR",
    name: "France",
    slug: "france",
    continent: "Europe",
    currency: "EUR",
    language: "French",
  },
};

/** List of all supported countries in canonical order */
export const allCountries = Object.values(countryMap);

/** Normalizes any country name string or 2-letter alias into ISO 3166-1 alpha-2 code */
export function getCountryCode(input?: string): string | null {
  if (!input) return null;
  const clean = input.trim();

  // If already 2 letters uppercase
  if (/^[A-Z]{2}$/i.test(clean)) {
    const code = clean.toUpperCase();
    if (code in countryMap || code === "EU") return code;
  }

  const lower = clean.toLowerCase();
  if (lower === "canada") return "CA";
  if (
    lower === "united kingdom" ||
    lower === "uk" ||
    lower === "britain" ||
    lower === "great britain"
  )
    return "GB";
  if (
    lower === "united states" ||
    lower === "usa" ||
    lower === "us" ||
    lower === "america"
  )
    return "US";
  if (lower === "australia") return "AU";
  if (lower === "germany") return "DE";
  if (lower === "ireland") return "IE";
  if (lower === "netherlands" || lower === "holland") return "NL";
  if (lower === "france") return "FR";
  if (lower === "europe" || lower === "european union") return "EU";

  return null;
}

/** Returns normalized canonical country name for display */
export function getCanonicalCountryName(input?: string): string {
  if (!input) return "";
  const code = getCountryCode(input);
  if (code && code in countryMap) {
    return countryMap[code].name;
  }
  return input;
}
