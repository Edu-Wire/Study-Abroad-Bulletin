/**
 * Article candidate - the bridge between the source corpus and the CMS.
 *
 * Blueprint 8: source ingestion data stays separate from the editorial Article
 * row. A candidate is the joined view an editor acts on (13.2 candidate card):
 * normalized source document + AI assessment + routing decision. Creating an
 * Article from a candidate is an editorial act, never an ingestion side effect.
 *
 * Table shapes and persistence belong to the database layer; this file defines
 * the contract both sides agree on.
 */

import { z } from "zod";
import {
  aiAssessmentSchema,
  EDITORIAL_ROUTES,
  type EditorialRoute,
} from "./aiAssessment.schema";
import { SOURCE_GEOS } from "../config/sourceConfig.schema";

// ============================================================
// Normalized source document (Blueprint 7.2)
// ============================================================

/**
 * What every adapter's `normalize()` returns, whatever the transport was.
 * Downstream code must never be able to tell Atom from JSON from HTML.
 */
export const normalizedSourceDocumentSchema = z
  .object({
    /** Registry source code, e.g. `eu-press-corner-api`. */
    sourceId: z.string().min(1),
    /** Stable native identity per the source's `externalIdStrategy` (11.1). */
    externalId: z.string().min(1),
    canonicalUrl: z.string().url(),
    countryCodes: z.array(z.string().min(2)).nonempty(),
    publishedAt: z.iso.datetime(),
    updatedAtSource: z.iso.datetime().nullable().default(null),
    /** The source's own document type, e.g. "Speech", "Notice", "Guidance". */
    documentType: z.string().nullable().default(null),
    title: z.string().min(1),
    /**
     * The feed/listing synopsis. Kept separate from `fullText` because 7.1 is
     * explicit: a summary is a discovery record, not the body, and classifying
     * from it is what produced the current misclassifications.
     */
    sourceSummary: z.string().nullable().default(null),
    /** Body extracted from the detail document. Empty until detail succeeds. */
    fullText: z.string(),
    /**
     * The source's own topic labels (EU policy areas, INZ topics, GOV.UK
     * taxons). Stored, displayed, never mapped onto editorial categories (10.4).
     */
    sourceTopics: z.array(z.string()).default([]),
    language: z.string().min(2).default("en"),
    /** Normalized content hash used for dedupe and change detection (11.2). */
    contentHash: z.string().min(1),
    /** Transport-specific extras kept verbatim for audit and reprocessing. */
    rawMetadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type NormalizedSourceDocument = z.infer<typeof normalizedSourceDocumentSchema>;

// ============================================================
// Prefilter outcome (Blueprint 10.1 stage 1)
// ============================================================

export const prefilterVerdictSchema = z.object({
  /** False means the item never reaches the AI stage. */
  passed: z.boolean(),
  matchedBoostTerms: z.array(z.string()).default([]),
  matchedNegativeTerms: z.array(z.string()).default([]),
  /** Deterministic 0-100 signal, source prior included. Not an AI score. */
  signal: z.number().int().min(0).max(100),
  reason: z.string().min(1),
});
export type PrefilterVerdict = z.infer<typeof prefilterVerdictSchema>;

// ============================================================
// Change-watch evidence (Blueprint 11.2 / 11.3)
// ============================================================

export const MATERIAL_FACT_TYPES = [
  "MONEY",
  "TIME",
  "ELIGIBILITY",
  "WORK_RIGHTS",
  "DOCUMENTS",
  "PROGRAM_RULES",
] as const;
export type MaterialFactType = (typeof MATERIAL_FACT_TYPES)[number];

export const materialChangeSchema = z.object({
  factType: z.enum(MATERIAL_FACT_TYPES),
  field: z.string().min(1),
  previousValue: z.string().nullable().default(null),
  currentValue: z.string().nullable().default(null),
  /** Whether this change matters to students - drives the high-priority event. */
  materialToStudents: z.boolean(),
});
export type MaterialChange = z.infer<typeof materialChangeSchema>;

export const changeEvidenceSchema = z.object({
  watchTargetKey: z.string().min(1),
  previousVersionHash: z.string().min(1),
  currentVersionHash: z.string().min(1),
  detectedAt: z.iso.datetime(),
  changes: z.array(materialChangeSchema).default([]),
  /** Unified text diff of the meaningful content region, for the editor view. */
  textDiff: z.string().optional(),
});
export type ChangeEvidence = z.infer<typeof changeEvidenceSchema>;

// ============================================================
// Candidate
// ============================================================

export const CANDIDATE_STATUSES = [
  "PENDING_ASSESSMENT",
  "IGNORED",
  "HELD",
  "AWAITING_REVIEW",
  "DRAFT_CREATED",
  /** 11.2: the source changed after a draft existed. Never silently rewritten. */
  "SOURCE_UPDATED",
  "DISMISSED_BY_EDITOR",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const articleCandidateSchema = z
  .object({
    id: z.string().min(1),
    sourceId: z.string().min(1),
    geo: z.enum(SOURCE_GEOS),
    document: normalizedSourceDocumentSchema,
    prefilter: prefilterVerdictSchema,
    /**
     * Absent while the item is queued for assessment, or when the prefilter
     * rejected it outright - an unassessed candidate is not a low-relevance one.
     */
    assessment: aiAssessmentSchema.optional(),
    route: z.enum(EDITORIAL_ROUTES),
    status: z.enum(CANDIDATE_STATUSES),
    /** Present for change-watch candidates; absent for news-style items. */
    changeEvidence: changeEvidenceSchema.optional(),
    /** Set once an editor creates the Article. The link is one-way and explicit. */
    linkedArticleId: z.string().nullable().default(null),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((candidate, ctx) => {
    if (candidate.status === "DRAFT_CREATED" && !candidate.assessment) {
      ctx.addIssue({
        code: "custom",
        path: ["assessment"],
        message: "A draft cannot be created from an unassessed candidate",
      });
    }
    if (candidate.linkedArticleId && candidate.status === "PENDING_ASSESSMENT") {
      ctx.addIssue({
        code: "custom",
        path: ["linkedArticleId"],
        message: "A pending candidate cannot already be linked to an Article",
      });
    }
  });
export type ArticleCandidate = z.infer<typeof articleCandidateSchema>;

/** Statuses that put an item in front of a human. */
export const EDITOR_VISIBLE_STATUSES: readonly CandidateStatus[] = [
  "AWAITING_REVIEW",
  "DRAFT_CREATED",
  "SOURCE_UPDATED",
];

/** Map a routing decision onto the candidate's initial status. */
export function statusForRoute(route: EditorialRoute): CandidateStatus {
  switch (route) {
    case "IGNORE":
      // 10.3: the source item is still kept for audit, it just makes no candidate.
      return "IGNORED";
    case "HOLD":
      return "HELD";
    case "REVIEW":
      return "AWAITING_REVIEW";
    case "AUTO_DRAFT":
    case "CRITICAL_DRAFT_ALERT":
      return "DRAFT_CREATED";
  }
}
