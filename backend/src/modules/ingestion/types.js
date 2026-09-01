/**
 * AbroadBulletin — Ingestion Engine Constants & Runtime Enums
 */

export const SourceType = Object.freeze({
  API: "API",
  ATOM: "ATOM",
  RSS: "RSS",
  WEB: "WEB",
  WATCH: "WATCH",
  DATA: "DATA",
});

export const SourceHealthStatus = Object.freeze({
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED",
  STALE: "STALE",
  BROKEN: "BROKEN",
  RATE_LIMITED: "RATE_LIMITED",
});

export const SourceRunType = Object.freeze({
  LIVE: "LIVE",
  BACKFILL: "BACKFILL",
  RECONCILE: "RECONCILE",
  MANUAL: "MANUAL",
});

export const SourceRunStatus = Object.freeze({
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PARTIAL: "PARTIAL",
});

export const ProcessingStatus = Object.freeze({
  DISCOVERED: "DISCOVERED",
  DETAIL_PENDING: "DETAIL_PENDING",
  ENRICHED: "ENRICHED",
  NORMALIZED: "NORMALIZED",
  VERSIONED: "VERSIONED",
  SCORED: "SCORED",
  CLASSIFIED: "CLASSIFIED",
  ROUTED: "ROUTED",
  IMPORTED: "IMPORTED",
  PUBLISHED: "PUBLISHED",
});

export const RoutingDecision = Object.freeze({
  IGNORE: "IGNORE",
  REVIEW: "REVIEW",
  CREATE_DRAFT: "CREATE_DRAFT",
  PUBLISH: "PUBLISH",
});

export const CandidateStatus = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  AUTO_DRAFTED: "AUTO_DRAFTED",
  DRAFT_CREATED: "DRAFT_CREATED",
  IGNORED: "IGNORED",
});

export const SourceLinkType = Object.freeze({
  PRIMARY_SOURCE: "PRIMARY_SOURCE",
  REFERENCE: "REFERENCE",
  CORROBORATING: "CORROBORATING",
});

export const BackfillStatus = Object.freeze({
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PAUSED: "PAUSED",
});

export const WindowStatus = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
});

export const InternalAiCategory = Object.freeze({
  STUDENT_VISA: "STUDENT_VISA",
  IMMIGRATION_POLICY: "IMMIGRATION_POLICY",
  POST_STUDY_WORK: "POST_STUDY_WORK",
  INTERNATIONAL_EDUCATION: "INTERNATIONAL_EDUCATION",
  SCHOLARSHIP: "SCHOLARSHIP",
  ADMISSIONS: "ADMISSIONS",
  DATA_INTELLIGENCE: "DATA_INTELLIGENCE",
  EU_POLICY: "EU_POLICY",
  OTHER: "OTHER",
});

export const JobNames = Object.freeze({
  SOURCE_DISCOVER: "source.discover",
  SOURCE_DETAIL: "source.detail",
  SOURCE_CLASSIFY: "source.classify",
  CANDIDATE_DRAFT: "candidate.draft",
  BACKFILL_WINDOW: "backfill.window",
  SOURCE_RECONCILE: "source.reconcile",
});
