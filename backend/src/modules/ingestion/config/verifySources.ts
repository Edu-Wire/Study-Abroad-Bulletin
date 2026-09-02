/**
 * `npm run verify:sources`
 *
 * Validates the Phase 1 registry, asserts every source resolves to a real
 * adapter, and regenerates `docs/ingestion/appendix-a-traceability.md`.
 *
 * The traceability table is generated, never hand-maintained: a hand-written
 * table drifts from the registry within a week, and the Appendix A working rule
 * is only worth anything if the document reflects what the code will actually
 * fetch.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PHASE1_SOURCES } from "./sourceRegistry";
import { validateRegistry } from "./registry.schema";
import { EXPECTED_SOURCE_COUNTS, PHASE1_SOURCE_INPUTS } from "./phase1Sources";
import { assertAdapterCoverage, KNOWN_ADAPTER_CODES } from "../adapters/index";
import { SOURCE_GEOS, type SourceConfig } from "./sourceConfig.schema";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../../../..");
const OUTPUT = resolve(REPO_ROOT, "docs/ingestion/appendix-a-traceability.md");

/**
 * Snapshot the registry for the Admin UI. The browser must not import the
 * registry module itself - that would pull Zod and the whole validation stack
 * into the client bundle - but the shell should still show the real 28 sources
 * with their real families, schedules and Appendix A references.
 */
const UI_SNAPSHOT = resolve(REPO_ROOT, "src/lib/generated/phase1-sources.json");

/** Appendix A official URLs, so the doc cites the research, not just the id. */
const APPENDIX_A_URLS: Record<string, string> = {
  R1: "https://docs.publishing.service.gov.uk/repos/search-api/using-the-search-api.html",
  R2: "https://docs.publishing.service.gov.uk/repos/content-store/content-store-api.html",
  R3: "https://www.gov.uk/government/collections/immigration-rules-statement-of-changes",
  R4: "https://www.canada.ca/en/immigration-refugees-citizenship/news/rss.html",
  R5: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
  R6: "https://www.studyaustralia.gov.au/en/tools-and-resources/news",
  R7: "https://www.education.gov.au/newsroom",
  R8: "https://www.education.gov.au/international-education-data-and-research/international-student-monthly-summary-and-data-tables",
  R9: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
  R10: "https://www.uscis.gov/newsroom/all-news",
  R11: "https://travel.state.gov/content/travel/en/us-visas/study.html",
  R12: "https://travel.state.gov/content/travel/en/News/visas-news.html",
  R13: "https://www.auswaertiges-amt.de/en/newsroom/newsletter/rss/229868-229868",
  R14: "https://www.immigration.govt.nz/about-us/news-centre/improvements-to-the-pathway-student-visa/",
  R15: "https://www.irishimmigration.ie/news-and-updates/",
  R16: "https://www.irishimmigration.ie/my-situation-has-changed-since-i-arrived-in-ireland/student-permission/",
  R17: "https://commission.europa.eu/news-and-media_en",
  R18: "https://github.com/tseidl/presscorner-builder/blob/main/SPEC.md",
  R19: "https://home-affairs.ec.europa.eu/news_en",
  R20: "https://education.ec.europa.eu/whats-new/news",
  R21: "https://erasmus-plus.ec.europa.eu/whats-new",
};

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function discoveryLabel(source: SourceConfig): string {
  const { mode } = source.discovery.pagination;
  const pagination = mode === "NONE" ? "single page" : mode.toLowerCase().replace("_", " ");
  return `${source.transport} · ${pagination}`;
}

function detailLabel(source: SourceConfig): string {
  return source.detail.requiresDetailFetch
    ? source.detail.strategy
    : `${source.detail.strategy} (no detail fetch)`;
}

function identityLabel(source: SourceConfig): string {
  return `${source.externalIdStrategy} → ${source.canonicalUrlRule}`;
}

function backfillLabel(source: SourceConfig): string {
  if (!source.backfill.enabled) return "none (now onward)";
  return `${source.backfill.depth} from ${source.backfill.startDate} · ${source.backfill.windowDays}d windows · ${source.backfill.overlapHours}h overlap`;
}

function healthLabel(source: SourceConfig): string {
  return `SLA ${source.health.freshnessSlaMinutes}m · reconcile ${source.health.reconcile}`;
}

function referenceLabel(source: SourceConfig): string {
  if (source.provenance.references.length === 0) {
    return "_exempt — named in §4.2/§5 without a dedicated entry_";
  }
  return source.provenance.references
    .map((ref) => (APPENDIX_A_URLS[ref] ? `[${ref}](${APPENDIX_A_URLS[ref]})` : ref))
    .join(", ");
}

/** The eleven columns from the execution plan's Appendix A working rule. */
function buildTable(sources: SourceConfig[]): string {
  const header =
    "| Source | Country | Appendix Ref | Official URL | Family | Discovery | Detail | Identity | Schedule | Backfill | Health |\n" +
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |";

  const rows = sources.map((source) =>
    [
      `**${cell(source.name)}**<br>\`${source.code}\`${source.enabled ? "" : " _(configured, disabled)_"}`,
      source.geo,
      referenceLabel(source),
      `[${cell(new URL(source.discovery.url).hostname)}](${source.discovery.url})`,
      source.adapter,
      cell(discoveryLabel(source)),
      cell(detailLabel(source)),
      cell(identityLabel(source)),
      `\`${source.schedule}\``,
      cell(backfillLabel(source)),
      cell(healthLabel(source)),
    ].join(" | ")
  );

  return `${header}\n| ${rows.join(" |\n| ")} |`;
}

function buildDocument(sources: SourceConfig[]): string {
  const enabled = sources.filter((source) => source.enabled);
  const byFamily = new Map<string, number>();
  for (const source of sources) {
    byFamily.set(source.adapter, (byFamily.get(source.adapter) ?? 0) + 1);
  }

  return `# Appendix A Traceability — Phase 1 Source Registry

> **Generated by \`npm run verify:sources\`. Do not edit by hand.**
> Every row is derived from \`backend/src/modules/ingestion/config/phase1Sources.ts\`,
> so this table is what the ingestion engine will actually fetch.

- **Sources configured:** ${sources.length}
- **Enabled for Phase 1 runs:** ${enabled.length} (${enabled.map((s) => `\`${s.code}\``).join(", ")})
- **By family:** ${[...byFamily.entries()].map(([family, count]) => `${family} ${count}`).join(" · ")}
- **By geography:** ${SOURCE_GEOS.map((geo) => `${geo} ${sources.filter((s) => s.geo === geo).length}`).join(" · ")}

Disabled sources are fully configured and adapter-backed; they are held off so
Phase 1 hardening happens against a small live surface rather than 28 endpoints
at once. Enabling one is a config change, not a code change.

## Source map

${buildTable(sources)}

## Invariants asserted at load

- Every record carries an Appendix A reference, or \`provenance.appendixExempt\`
  with a written justification (Appendix C step 1).
- Every record resolves to a registered adapter in \`ADAPTER_REGISTRY\`.
- \`editorial.autoPublish === false\` on every record, without exception
  (Blueprint §10.3 launch safety).
- Backfill-enabled records declare a start date.
- Schedules parse as five-field cron.
- Per-geography counts match the Admin navigation in Blueprint §13.1.
`;
}

/** The catalog fields the Admin UI needs. Operational state comes from the API. */
function buildUiSnapshot(sources: SourceConfig[]) {
  return {
    generatedBy: "npm run verify:sources",
    sourceCount: sources.length,
    sources: sources.map((source) => ({
      code: source.code,
      name: source.name,
      geo: source.geo,
      transport: source.transport,
      family: source.adapter,
      priority: source.priority,
      enabled: source.enabled,
      schedule: source.schedule,
      cadenceMinutes: source.cadenceMinutes,
      backfillDepth: source.backfill.depth,
      references: source.provenance.references,
      appendixExempt: source.provenance.appendixExempt,
      owner: source.provenance.owner,
      officialUrl: source.discovery.url,
      freshnessSlaMinutes: source.health.freshnessSlaMinutes,
      reconcile: source.health.reconcile,
    })),
  };
}

function main(): void {
  // Re-validate from the raw inputs so the CLI exercises the same gate the
  // module load does, plus adapter resolution the registry cannot check itself.
  validateRegistry(PHASE1_SOURCE_INPUTS, {
    expectedCounts: EXPECTED_SOURCE_COUNTS,
    knownAdapterCodes: KNOWN_ADAPTER_CODES,
  });
  assertAdapterCoverage();

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, buildDocument(PHASE1_SOURCES), "utf8");

  mkdirSync(dirname(UI_SNAPSHOT), { recursive: true });
  writeFileSync(UI_SNAPSHOT, `${JSON.stringify(buildUiSnapshot(PHASE1_SOURCES), null, 2)}\n`, "utf8");

  const enabled = PHASE1_SOURCES.filter((source) => source.enabled).length;
  console.log(`✓ registry valid — ${PHASE1_SOURCES.length} sources, ${enabled} enabled`);
  console.log(`✓ every source resolves to an adapter; all five families present`);
  console.log(`✓ traceability written to ${OUTPUT}`);
  console.log(`✓ Admin UI snapshot written to ${UI_SNAPSHOT}`);
}

main();
