/**
 * Source Registry - validated access to the Phase 1 catalog.
 *
 * The catalog is parsed once at module load, so a malformed record fails the
 * process (and `tsc`/`verify:sources`) rather than surfacing as a mystery at
 * 03:00 in a worker run. Everything downstream - adapters, the worker, the Admin
 * API - reads sources from here.
 *
 * Adapter resolution is checked separately in `adapters/index.ts` to avoid a
 * circular import: the registry cannot depend on the adapters that consume it.
 */

import { SOURCE_GEOS, type AdapterType, type SourceConfig, type SourceGeo } from "./sourceConfig.schema";
import { validateRegistry } from "./registry.schema";
import { EXPECTED_SOURCE_COUNTS, PHASE1_SOURCE_INPUTS } from "./phase1Sources";

/** Every Phase 1 source, validated, in Admin navigation order. */
export const PHASE1_SOURCES: SourceConfig[] = validateRegistry(PHASE1_SOURCE_INPUTS, {
  expectedCounts: EXPECTED_SOURCE_COUNTS,
});

const BY_CODE = new Map(PHASE1_SOURCES.map((source) => [source.code, source]));

export function getSource(code: string): SourceConfig | undefined {
  return BY_CODE.get(code);
}

/** Throwing variant for callers that treat an unknown code as a bug. */
export function requireSource(code: string): SourceConfig {
  const source = BY_CODE.get(code);
  if (!source) throw new Error(`Unknown source code: ${code}`);
  return source;
}

export function getSourcesByGeo(geo: SourceGeo): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) => source.geo === geo);
}

export function getSourcesByAdapter(adapter: AdapterType): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) => source.adapter === adapter);
}

/**
 * Sources the scheduler should actually run. Phase 1 enables one source per
 * adapter family plus EU Press Corner; the rest are fully configured but off,
 * so Day 3 is hardening rather than firefighting 28 live endpoints.
 */
export function getEnabledSources(): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) => source.enabled);
}

/** Sources carrying a given Appendix A reference, e.g. `R4`. */
export function getSourcesByReference(reference: string): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) => source.provenance.references.includes(reference));
}

/** Per-geo counts for the Admin navigation (Blueprint 13.1). */
export function getSourceCountsByGeo(): Record<SourceGeo, number> {
  return Object.fromEntries(
    SOURCE_GEOS.map((geo) => [geo, getSourcesByGeo(geo).length])
  ) as Record<SourceGeo, number>;
}

/** Blueprint 14 freshness SLA, resolved on the record at parse time. */
export function getFreshnessSlaMinutes(source: SourceConfig): number {
  return source.health.freshnessSlaMinutes;
}

export { validateRegistry, RegistryValidationError } from "./registry.schema";
export { EXPECTED_SOURCE_COUNTS, PHASE1_SOURCE_INPUTS } from "./phase1Sources";
