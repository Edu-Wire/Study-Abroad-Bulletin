/**
 * Source Configuration Registry - schema and vocabulary.
 *
 * Blueprint 4 "Phase 1 Source Registry": the registry is data-driven. Adapters
 * are code; schedules, countries, priority, enabled state, backfill depth,
 * overlap window, rate limits, extraction strategy and AI thresholds are
 * configuration. A country is a grouping dimension, not the source itself.
 *
 * This file owns the *shape*. `phase1Sources.ts` owns the *data*.
 * Persistence of these records belongs to the database layer (Developer A);
 * nothing here reads or writes a database.
 */

import { z } from "zod";

// ============================================================
// Vocabulary
// ============================================================

/** Phase 1 geographies. `EU` is a region, not an ISO country - intentional. */
export const SOURCE_GEOS = ["CA", "UK", "AU", "US", "DE", "NZ", "IE", "EU"] as const;
export type SourceGeo = (typeof SOURCE_GEOS)[number];

/** Blueprint 4.1 source classes, plus GOVERNMENT_PRESS from Appendix B. */
export const AUTHORITY_TYPES = [
  "IMMIGRATION_AUTHORITY",
  "VISA_AUTHORITY",
  "POLICY_RULES",
  "EDUCATION_GOV",
  "STUDY_PORTAL_GOV",
  "MOBILITY_EDUCATION",
  "GENERAL_GOV_NEWS",
  "GOVERNMENT_PRESS",
  "DATA_GOV",
] as const;
export type AuthorityType = (typeof AUTHORITY_TYPES)[number];

/** Blueprint 6.1 generic adapter types. */
export const ADAPTER_TYPES = [
  "RSS_ATOM",
  "JSON_API",
  "WEB_LISTING",
  "CHANGE_WATCH",
  "DATA_FILE",
] as const;
export type AdapterType = (typeof ADAPTER_TYPES)[number];

/** Admin UI method badge (Blueprint 13.1). Transport, not adapter class. */
export const TRANSPORT_BADGES = ["API", "ATOM", "RSS", "WEB", "WATCH", "DATA"] as const;
export type TransportBadge = (typeof TRANSPORT_BADGES)[number];

export const SOURCE_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type SourcePriority = (typeof SOURCE_PRIORITIES)[number];

/** Blueprint 14.1 source health states. */
export const SOURCE_HEALTH_STATES = [
  "HEALTHY",
  "DEGRADED",
  "STALE",
  "BROKEN",
  "RATE_LIMITED",
  "BACKFILLING",
] as const;
export type SourceHealthState = (typeof SOURCE_HEALTH_STATES)[number];

/**
 * Blueprint 11.1 identity hierarchy, strongest first. Recorded per source so
 * the dedupe layer knows which key it is allowed to trust.
 */
export const EXTERNAL_ID_STRATEGIES = [
  "NATIVE_GUID",
  "NATIVE_REFERENCE",
  "CONTENT_ID",
  "API_COMPOSITE_KEY",
  "CANONICAL_URL",
  "NORMALIZED_URL_PLUS_DATE",
  "WATCH_TARGET_URL",
  "DATASET_RELEASE_KEY",
] as const;
export type ExternalIdStrategy = (typeof EXTERNAL_ID_STRATEGIES)[number];

/** Blueprint 9.2 extraction fallback order. */
export const DETAIL_STRATEGIES = [
  "OFFICIAL_JSON_API",
  "FEED_FULL_CONTENT",
  "SERVER_RENDERED_HTML",
  "STRUCTURED_DATA_JSONLD",
  "DISCOVERED_JSON_ENDPOINT",
  "FILE_DOWNLOAD",
  "WATCH_SNAPSHOT_DIFF",
] as const;
export type DetailStrategy = (typeof DETAIL_STRATEGIES)[number];

/** Appendix A research reference ids, R1 through R26. */
export const APPENDIX_A_REFERENCE_PATTERN = /^R([1-9]|1\d|2[0-6])$/;

// ============================================================
// Sub-schemas
// ============================================================

export const appendixAReferenceSchema = z
  .string()
  .regex(APPENDIX_A_REFERENCE_PATTERN, "Must be an Appendix A reference id such as 'R4'");

/**
 * Every source states where its authority claim comes from. Appendix C
 * ("Definition of Done") opens with verified source ownership, so a source with
 * no traceable reference does not belong in this registry.
 */
export const provenanceSchema = z.object({
  /**
   * Appendix A ids backing this source. Empty only for the few sources the
   * blueprint names in 4.2/5 without a dedicated reference; those must explain
   * themselves in `note`.
   */
  references: z.array(appendixAReferenceSchema),
  /** Owning authority / domain, verified per Appendix C step 1. */
  owner: z.string().min(1),
  /** Blueprint section that specifies this source's handling rules. */
  blueprintSection: z.string().min(1),
  note: z.string().optional(),
  /**
   * A source the blueprint's 4.2/5 source map names without giving it a
   * dedicated Appendix A entry. Validation refuses a reference-less source
   * unless it is marked here AND explains itself in `note`, so nothing enters
   * the registry untraceable by accident.
   */
  appendixExempt: z.boolean().default(false),
});
export type Provenance = z.infer<typeof provenanceSchema>;

export const discoverySchema = z.object({
  /** Entry point for `discover()`. For CHANGE_WATCH this is the hub page. */
  url: z.string().url(),
  /** Query parameters the adapter sends verbatim (documented API contract). */
  params: z.record(z.string(), z.string()).optional(),
  /** How pagination is walked, so live and backfill share one cursor concept. */
  pagination: z
    .object({
      mode: z.enum(["NONE", "PAGE_NUMBER", "OFFSET", "CURSOR", "DATE_WINDOW"]),
      pageParam: z.string().optional(),
      pageSizeParam: z.string().optional(),
      pageSize: z.number().int().positive().optional(),
      maxPages: z.number().int().positive().optional(),
    })
    .default({ mode: "NONE" }),
});
export type DiscoveryConfig = z.infer<typeof discoverySchema>;

export const detailSchema = z.object({
  strategy: z.enum(DETAIL_STRATEGIES),
  /** Detail request template; `:token` placeholders are filled by the adapter. */
  urlTemplate: z.string().optional(),
  /**
   * Blueprint 7.1: feed text is not the final body. When true the pipeline must
   * load the detail document before classification and never classify a snippet.
   */
  requiresDetailFetch: z.boolean(),
  /** Preferred content-region selectors; extraction may still fall back per 9.2. */
  contentSelectors: z.array(z.string()).default([]),
});
export type DetailConfig = z.infer<typeof detailSchema>;

export const watchTargetSchema = z.object({
  key: z.string().min(1),
  url: z.string().url(),
  label: z.string().min(1),
  /** Facts whose change is material to students (Blueprint 11.3). */
  materialFacts: z.array(z.string()).default([]),
});
export type WatchTarget = z.infer<typeof watchTargetSchema>;

export const backfillSchema = z.object({
  enabled: z.boolean(),
  /** ISO date. Blueprint 3.3 sets the recommended Phase 1 depth per source. */
  startDate: z.string().optional(),
  windowDays: z.number().int().positive().optional(),
  /** 5.8: 72h overlap on incremental search so nothing slips between windows. */
  overlapHours: z.number().int().nonnegative().default(72),
  /** Human-facing depth from the 4.2 source map, e.g. "2y" or "Now onward". */
  depth: z.string().min(1),
});
export type BackfillConfig = z.infer<typeof backfillSchema>;

export const httpSchema = z.object({
  timeoutMs: z.number().int().positive().default(20_000),
  maxConcurrencyPerDomain: z.number().int().positive().default(2),
  retryLimit: z.number().int().nonnegative().default(4),
  maxPayloadBytes: z.number().int().positive().default(5_000_000),
  /** Conditional GET is polite and cheap; disable only where a source breaks. */
  conditionalRequests: z.boolean().default(true),
});
export type HttpConfig = z.infer<typeof httpSchema>;

export const editorialSchema = z.object({
  /** Blueprint 10.3 routing thresholds. */
  autoDraftMinRelevance: z.number().int().min(0).max(100).default(75),
  autoDraftMinConfidence: z.number().int().min(0).max(100).default(85),
  /** 10.3 launch safety: Phase 1 auto-drafts but never auto-publishes. */
  autoPublish: z.literal(false).default(false),
  /**
   * Source relevance prior (0-100) for the deterministic prefilter - not an AI
   * score. A GENERAL_GOV_NEWS feed starts low; Immigration NZ starts high.
   */
  relevancePrior: z.number().int().min(0).max(100),
});
export type EditorialConfig = z.infer<typeof editorialSchema>;

export const healthSchema = z.object({
  /**
   * Blueprint 14: a high-priority source alerts past 45 minutes, everything
   * else past twice its cadence. Derived from priority + cadence when omitted,
   * so the rule lives in one place and a source can still override it.
   */
  freshnessSlaMinutes: z.number().int().positive(),
  /** How often a closed range is re-queried to catch silently dropped pages. */
  reconcile: z.enum(["DAILY", "WEEKLY", "MONTHLY", "NONE"]),
});
export type HealthConfig = z.infer<typeof healthSchema>;

/**
 * Per-source starting expectations for the deterministic prefilter, on the same
 * 0-100 scale as the AI axes but never mistaken for an AI score. DG HOME starts
 * higher than general Commission news (5.8); the FFO feeds start near the floor.
 */
export const relevancePriorsSchema = z.object({
  studyAbroad: z.number().int().min(0).max(100),
  scholarship: z.number().int().min(0).max(100),
});
export type RelevancePriors = z.infer<typeof relevancePriorsSchema>;

export const prefilterSchema = z.object({
  /** Terms that raise the deterministic student signal (per-country rules, 5). */
  boostTerms: z.array(z.string()).default([]),
  /** Terms marking an item as almost certainly off-topic for this source. */
  negativeTerms: z.array(z.string()).default([]),
  /**
   * Minimum distinct boost-term hits before an item may reach the AI stage.
   * 10.1: cheaply remove obvious noise and protect the AI budget. 0 means the
   * source is focused enough to forward everything (e.g. a student visa watch).
   */
  minBoostHits: z.number().int().nonnegative().default(0),
  /** 5.5: FFO-style feeds must not spend AI tokens on geopolitical stories. */
  strict: z.boolean().default(false),
});
export type PrefilterConfig = z.infer<typeof prefilterSchema>;

// ============================================================
// Source configuration record
// ============================================================

export const sourceConfigSchema = z
  .object({
    /** Stable registry key and adapter lookup key. Lower-kebab, geo-prefixed. */
    code: z.string().regex(/^[a-z]{2}-[a-z0-9-]+$/, "code must look like 'ca-ircc-atom'"),
    name: z.string().min(1),
    geo: z.enum(SOURCE_GEOS),
    /** Codes the source speaks for; EU sources carry the region code itself. */
    countryCodes: z.array(z.string().min(2)).nonempty(),
    authorityType: z.enum(AUTHORITY_TYPES),
    /** 4.1 default trust for the source class (0-100). */
    trust: z.number().int().min(0).max(100),
    adapter: z.enum(ADAPTER_TYPES),
    /** Country adapter class that owns this source, e.g. `CanadaSourceAdapter`. */
    adapterClass: z.string().min(1),
    transport: z.enum(TRANSPORT_BADGES),
    enabled: z.boolean(),
    priority: z.enum(SOURCE_PRIORITIES),
    /** Cron expression for the worker schedule (consumed by the queue layer). */
    schedule: z.string().min(1),
    /** The same cadence in minutes; drives the freshness SLA in 14. */
    cadenceMinutes: z.number().int().positive(),
    externalIdStrategy: z.enum(EXTERNAL_ID_STRATEGIES),
    canonicalUrlRule: z.string().min(1),
    discovery: discoverySchema,
    detail: detailSchema,
    watchTargets: z.array(watchTargetSchema).default([]),
    backfill: backfillSchema,
    http: httpSchema,
    editorial: editorialSchema,
    prefilter: prefilterSchema,
    provenance: provenanceSchema,
    /**
     * Derived from priority + cadence when omitted (see `deriveHealth`), so the
     * Blueprint 14 rule is written once and a source can still override it.
     */
    health: healthSchema.optional(),
    /** Derived from `editorial.relevancePrior` + authority type when omitted. */
    relevancePriors: relevancePriorsSchema.optional(),
  })
  .strict()
  .superRefine((source, ctx) => {
    if (source.adapter === "CHANGE_WATCH" && source.watchTargets.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["watchTargets"],
        message: "CHANGE_WATCH sources must declare at least one watch target",
      });
    }
    if (source.adapter !== "CHANGE_WATCH" && source.watchTargets.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["watchTargets"],
        message: "watchTargets belong to CHANGE_WATCH sources only",
      });
    }
    if (source.backfill.enabled && !source.backfill.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["backfill", "startDate"],
        message: "Backfill-enabled sources must declare a startDate",
      });
    }
    // Appendix C step 1: source ownership must be verified and documented.
    if (source.provenance.references.length === 0 && !source.provenance.appendixExempt) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "references"],
        message:
          "Every source needs an Appendix A reference, or provenance.appendixExempt with a note",
      });
    }
    if (source.provenance.appendixExempt && !source.provenance.note) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "note"],
        message: "An Appendix-exempt source must explain itself in provenance.note",
      });
    }
    if (!isValidCron(source.schedule)) {
      ctx.addIssue({
        code: "custom",
        path: ["schedule"],
        message: `Not a valid 5-field cron expression: '${source.schedule}'`,
      });
    }
  })
  .transform((source) => ({
    ...source,
    health: source.health ?? deriveHealth(source),
    relevancePriors: source.relevancePriors ?? derivePriors(source),
  }));

/**
 * Blueprint 14 freshness SLA. The flat 45-minute threshold applies only to
 * high-priority sources polling faster than that: a 6-hour rule watch is
 * CRITICAL but cannot be stale after 45 minutes, so it keeps 2x its cadence.
 */
function deriveHealth(source: {
  priority: SourcePriority;
  cadenceMinutes: number;
  backfill: { enabled: boolean };
}): HealthConfig {
  const isHighPriority = source.priority === "CRITICAL" || source.priority === "HIGH";
  return {
    freshnessSlaMinutes:
      isHighPriority && source.cadenceMinutes < 45 ? 45 : source.cadenceMinutes * 2,
    // Reconciliation only means something for a source with a historical
    // corpus to compare against; a change watch has no archive to re-query.
    reconcile: !source.backfill.enabled ? "NONE" : isHighPriority ? "DAILY" : "WEEKLY",
  };
}

/**
 * A source's scholarship prior is deliberately much lower than its study-abroad
 * prior everywhere except the mobility/education bodies. Blueprint 10.4: the
 * scholarship label is earned by the document, never inherited from the feed.
 */
function derivePriors(source: {
  authorityType: AuthorityType;
  editorial: { relevancePrior: number };
}): RelevancePriors {
  const studyAbroad = source.editorial.relevancePrior;
  const scholarshipLeaning = source.authorityType === "MOBILITY_EDUCATION";
  return {
    studyAbroad,
    scholarship: scholarshipLeaning ? Math.round(studyAbroad * 0.6) : Math.min(15, studyAbroad),
  };
}

/** Five-field cron, as consumed by the worker's scheduler. */
export function isValidCron(expression: string): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const ranges: Array<[number, number]> = [
    [0, 59],
    [0, 23],
    [1, 31],
    [1, 12],
    [0, 7],
  ];

  return fields.every((field, index) => {
    const [min, max] = ranges[index];
    return field.split(",").every((part) => {
      const [range, step] = part.split("/");
      if (step !== undefined && !/^\d+$/.test(step)) return false;
      if (range === "*") return true;
      const [start, end] = range.split("-");
      const inRange = (value: string) =>
        /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;
      return end === undefined ? inRange(start) : inRange(start) && inRange(end);
    });
  });
}

export type SourceConfig = z.infer<typeof sourceConfigSchema>;
/** Authoring shape for the registry: schema defaults fill in the rest. */
export type SourceConfigInput = z.input<typeof sourceConfigSchema>;

export const sourceRegistrySchema = z.array(sourceConfigSchema);