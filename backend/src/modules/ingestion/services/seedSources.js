import { prisma } from "../../../config/prisma.js";
import { PHASE1_SOURCES } from "../config/sourceRegistry.ts";

const GEO_TO_COUNTRY_ID = {
  CA: "canada",
  UK: "uk",
  AU: "australia",
  US: "usa",
  DE: "germany",
  NZ: "new-zealand",
  IE: "ireland",
  EU: null,
};

const ADAPTER_TO_SOURCE_TYPE = {
  RSS_ATOM: "RSS",
  WEB_LISTING: "WEB",
  CHANGE_WATCH: "WATCH",
  JSON_API: "API",
  DATA_FILE: "DATA",
};

/**
 * Seeds or syncs all 28 registered Phase 1 sources from sourceRegistry into the PostgreSQL database.
 * Idempotent: Can be run multiple times safely without creating duplicates.
 *
 * @returns {Promise<{ seeded: number, updated: number, total: number }>}
 */
export async function seedPhase1Sources() {
  let seeded = 0;
  let updated = 0;

  for (const source of PHASE1_SOURCES) {
    const countryId = GEO_TO_COUNTRY_ID[source.geo] || null;
    const sourceType = ADAPTER_TO_SOURCE_TYPE[source.adapter] || "WEB";

    // Verify country exists in DB if countryId is set, otherwise set null
    let validCountryId = null;
    if (countryId) {
      const countryExists = await prisma.country.findUnique({
        where: { id: countryId },
        select: { id: true },
      });
      if (countryExists) {
        validCountryId = countryExists.id;
      }
    }

    const discoveryUrl =
      source.discovery?.url ||
      (source.watchTargets && source.watchTargets.length > 0 ? source.watchTargets[0].url : null) ||
      source.baseUrl ||
      "https://gov.reference.local";

    const feedUrl = source.discovery?.url || null;

    let baseUrl = discoveryUrl;
    try {
      const parsed = new URL(discoveryUrl);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {
      baseUrl = discoveryUrl;
    }

    const existing = await prisma.contentSource.findUnique({
      where: { code: source.code },
      select: { id: true },
    });

    const contentSource = await prisma.contentSource.upsert({
      where: { code: source.code },
      create: {
        code: source.code,
        name: source.name,
        countryId: validCountryId,
        sourceType,
        baseUrl,
        feedUrl,
        enabled: source.enabled ?? true,
        config: source,
        schedule: source.schedule || `*/${source.cadenceMinutes || 60} * * * *`,
        categoryHint: "VISA",
      },
      update: {
        name: source.name,
        countryId: validCountryId,
        sourceType,
        baseUrl,
        feedUrl,
        enabled: source.enabled ?? true,
        config: source,
        schedule: source.schedule || `*/${source.cadenceMinutes || 60} * * * *`,
      },
    });

    // Ensure SourceSyncState exists
    await prisma.sourceSyncState.upsert({
      where: { contentSourceId: contentSource.id },
      create: {
        contentSourceId: contentSource.id,
        healthStatus: "HEALTHY",
      },
      update: {},
    });

    if (existing) {
      updated++;
    } else {
      seeded++;
    }
  }

  return { seeded, updated, total: PHASE1_SOURCES.length };
}
