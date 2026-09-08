/**
 * Registry validation - the gate every source record must pass.
 *
 * Failures here are loud and specific. A registry that half-loads is worse than
 * one that refuses to load: a silently dropped source looks exactly like a
 * source that published nothing.
 */

import {
  sourceRegistrySchema,
  SOURCE_GEOS,
  type SourceConfig,
  type SourceConfigInput,
  type SourceGeo,
} from "./sourceConfig.schema";

export interface RegistryIssue {
  code: string;
  path: string;
  message: string;
}

export class RegistryValidationError extends Error {
  constructor(readonly issues: RegistryIssue[]) {
    super(
      `Phase 1 source registry failed validation (${issues.length} issue${
        issues.length === 1 ? "" : "s"
      }):\n  ` + issues.map((i) => `${i.code}: ${i.path} - ${i.message}`).join("\n  ")
    );
    this.name = "RegistryValidationError";
  }
}

export interface ValidateOptions {
  /** Adapter keys that exist in code. Every record must resolve to one. */
  knownAdapterCodes?: ReadonlySet<string>;
  /** Expected per-geo counts, asserted so coverage cannot drift unnoticed. */
  expectedCounts?: Partial<Record<SourceGeo, number>>;
}

/**
 * Parse and check the catalog. Throws `RegistryValidationError` listing every
 * problem at once - fixing them one exception at a time wastes a shift.
 *
 * Beyond the Zod schema (which already enforces the cron format, the Appendix A
 * reference, watch-target consistency and `autoPublish: false`), this checks the
 * cross-record invariants a single record cannot see.
 */
export function validateRegistry(
  inputs: SourceConfigInput[],
  options: ValidateOptions = {}
): SourceConfig[] {
  const parsed = sourceRegistrySchema.safeParse(inputs);

  if (!parsed.success) {
    throw new RegistryValidationError(
      parsed.error.issues.map((issue) => {
        const index = typeof issue.path[0] === "number" ? issue.path[0] : -1;
        return {
          code: index >= 0 ? inputs[index]?.code ?? `#${index}` : "registry",
          path: issue.path.slice(1).join(".") || "(root)",
          message: issue.message,
        };
      })
    );
  }

  const sources = parsed.data;
  const issues: RegistryIssue[] = [];

  const seen = new Set<string>();
  for (const source of sources) {
    if (seen.has(source.code)) {
      issues.push({ code: source.code, path: "code", message: "Duplicate source code" });
    }
    seen.add(source.code);

    // Belt and braces over the schema's `z.literal(false)`: this is the one
    // setting that could publish unreviewed government text to readers.
    if (source.editorial.autoPublish !== false) {
      issues.push({
        code: source.code,
        path: "editorial.autoPublish",
        message: "Phase 1 forbids auto-publish on every source without exception",
      });
    }

    if (!source.provenance.references.length && !source.provenance.appendixExempt) {
      issues.push({
        code: source.code,
        path: "provenance.references",
        message: "Missing Appendix A reference",
      });
    }

    if (!source.discovery.url) {
      issues.push({
        code: source.code,
        path: "discovery.url",
        message: "Missing official URL",
      });
    }

    if (options.knownAdapterCodes && !options.knownAdapterCodes.has(source.code)) {
      issues.push({
        code: source.code,
        path: "adapter",
        message: `No adapter registered for '${source.code}' in ADAPTER_REGISTRY`,
      });
    }

    if (source.backfill.enabled && !source.backfill.startDate) {
      issues.push({
        code: source.code,
        path: "backfill.startDate",
        message: "Backfill enabled without a start date",
      });
    }
  }

  if (options.expectedCounts) {
    for (const geo of SOURCE_GEOS) {
      const expected = options.expectedCounts[geo];
      if (expected === undefined) continue;
      const actual = sources.filter((source) => source.geo === geo).length;
      if (actual !== expected) {
        issues.push({
          code: `geo:${geo}`,
          path: "count",
          message: `Expected ${expected} sources, found ${actual}`,
        });
      }
    }
  }

  if (issues.length > 0) throw new RegistryValidationError(issues);
  return sources;
}
