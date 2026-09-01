/**
 * Source Registry - validated access to the Phase 1 catalog.
 *
 * The catalog is parsed once at module load, so a malformed source record fails
 * the process (and `tsc`/tests) rather than surfacing as a mystery at 03:00 in a
 * worker run. Everything downstream - adapters, the worker, the Admin API -
 * reads sources from here.
 */

import {
  sourceRegistrySchema,
  SOURCE_GEOS,
  type AdapterType,
  type SourceConfig,
  type SourceGeo,
} from "./sourceConfig.schema";
import { EXPECTED_SOURCE_COUNTS, PHASE1_SOURCE_INPUTS } from "./phase1Sources";

function loadRegistry(): SourceConfig[] {
  const parsed = sourceRegistrySchema.safeParse(PHASE1_SOURCE_INPUTS);

  // Error block for schema validation
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => {
        // issue.path[0] is the array index; name the offending source, not "[3]".
        const index = typeof issue.path[0] === "number" ? issue.path[0] : -1;
        const code =
          index >= 0 ? PHASE1_SOURCE_INPUTS[index]?.code ?? `#${index}` : "registry";
        return `${code}: ${issue.path.slice(1).join(".") || "(root)"} - ${issue.message}`;
      })
      .join("\n  ");
    throw new Error(`Phase 1 source registry failed validation:\n  ${detail}`);
  }

  const sources = parsed.data;

  const duplicates = sources
    .map((source) => source.code)
    .filter((code, index, all) => all.indexOf(code) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate source codes in registry: ${duplicates.join(", ")}`);
  }

  // Blueprint 13.1 publishes per-country counts in the Admin navigation. If a
  // source is dropped or added, this fails loudly instead of quietly changing
  // what "Phase 1 coverage" means.
  for (const geo of SOURCE_GEOS) {
    const actual = sources.filter((source) => source.geo === geo).length;
    const expected = EXPECTED_SOURCE_COUNTS[geo];
    if (actual !== expected) {
      throw new Error(
        `Source count drift for ${geo}: expected ${expected}, found ${actual}. ` +
        "Update EXPECTED_SOURCE_COUNTS together with the catalog."
      );
    }
  }

  return sources;
}

/** Every Phase 1 source, validated, in Admin navigation order. */
export const PHASE1_SOURCES: SourceConfig[] = loadRegistry();

const BY_CODE = new Map(PHASE1_SOURCES.map((source) => [source.code, source]));

export function getSource(code: string): SourceConfig | undefined {
  return BY_CODE.get(code);
}

/** Throwing variant for callers that treat an unknown code as a bug. */
export function requireSource(code: string): SourceConfig {
  const source = BY_CODE.get(code);
  if (!source) {
    throw new Error(`Unknown source code: ${code}`);
  }
  return source;
}

export function getSourcesByGeo(geo: SourceGeo): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) => source.geo === geo);
}

export function getSourcesByAdapter(adapter: AdapterType): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) => source.adapter === adapter);
}

export function getEnabledSources(): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) => source.enabled);
}

/** Sources that carry a given Appendix A reference, e.g. `R4`. */
export function getSourcesByReference(reference: string): SourceConfig[] {
  return PHASE1_SOURCES.filter((source) =>
    source.provenance.references.includes(reference)
  );
}

/** Per-geo counts for the Admin navigation (Blueprint 13.1). */
export function getSourceCountsByGeo(): Record<SourceGeo, number> {
  return Object.fromEntries(
    SOURCE_GEOS.map((geo) => [geo, getSourcesByGeo(geo).length])
  ) as Record<SourceGeo, number>;
}

/**
 * Freshness SLA per Blueprint 14: high-priority sources alert past 45 minutes,
 * everything else past twice its configured cadence.
 *
 * The flat 45-minute threshold applies only to high-priority sources that poll
 * more often than that. A 6-hour change watch is high-priority but cannot be
 * stale after 45 minutes, so it keeps the cadence-based SLA.
 */
export function getFreshnessSlaMinutes(source: SourceConfig): number {
  const isHighPriority = source.priority === "CRITICAL" || source.priority === "HIGH";
  if (isHighPriority && source.cadenceMinutes < 45) {
    return 45;
  }
  return source.cadenceMinutes * 2;
}
