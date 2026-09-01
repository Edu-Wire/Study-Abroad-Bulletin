/**
 * AbroadBulletin — Ingestion Engine Shared Types & Adapter Contracts
 *
 * This file contains the complete type contracts for the automated ingestion pipeline.
 * Developer B can implement source adapters, AI classification, and editorial candidates
 * against these interfaces without circular dependencies on pipeline internals.
 */

// ============================================================
// ENUMS & LITERAL UNION TYPES
// ============================================================

export type SourceType = "API" | "ATOM" | "RSS" | "WEB" | "WATCH" | "DATA";

export type SourceHealthStatus = "HEALTHY" | "DEGRADED" | "STALE" | "BROKEN" | "RATE_LIMITED";

export type SourceRunType = "LIVE" | "BACKFILL" | "RECONCILE" | "MANUAL";

export type SourceRunStatus = "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";

export type ProcessingStatus =
  | "DISCOVERED"
  | "DETAIL_PENDING"
  | "ENRICHED"
  | "NORMALIZED"
  | "VERSIONED"
  | "SCORED"
  | "CLASSIFIED"
  | "ROUTED"
  | "IMPORTED"
  | "PUBLISHED";

export type RoutingDecision = "IGNORE" | "REVIEW" | "CREATE_DRAFT" | "PUBLISH";

export type CandidateStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "AUTO_DRAFTED"
  | "DRAFT_CREATED"
  | "IGNORED";

export type SourceLinkType = "PRIMARY_SOURCE" | "REFERENCE" | "CORROBORATING";

export type BackfillStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PAUSED";

export type WindowStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type InternalAiCategory =
  | "STUDENT_VISA"
  | "IMMIGRATION_POLICY"
  | "POST_STUDY_WORK"
  | "INTERNATIONAL_EDUCATION"
  | "SCHOLARSHIP"
  | "ADMISSIONS"
  | "DATA_INTELLIGENCE"
  | "EU_POLICY"
  | "OTHER";

// ============================================================
// PIPELINE DATA STRUCTURES
// ============================================================

export interface DiscoveredItem {
  /** Source-assigned unique ID (GUID, content_id, entry ID, etc.) */
  externalId?: string | null;
  /** Primary URL linking to the item */
  url: string;
  /** Extracted raw title */
  title: string;
  /** Publication timestamp if present in feed / listing */
  publishedAt?: Date | string | null;
  /** Brief summary or teaser text */
  summary?: string | null;
  /** Native tags, categories, or taxonomy assigned by the source */
  nativeTopics?: string[];
  /** Language code, e.g. "en", "de", "fr" */
  language?: string;
  /** Raw unparsed object metadata from feed/API response */
  rawMetadata?: Record<string, any> | null;
}

export interface SourceDetail {
  sourceItemId?: string;
  url: string;
  title?: string | null;
  rawBody?: string | null;
  cleanHtml?: string | null;
  cleanText?: string | null;
  authors?: string[];
  publishedAt?: Date | string | null;
  modifiedAt?: Date | string | null;
  httpStatus?: number | null;
  etag?: string | null;
  lastModified?: string | null;
  metadata?: Record<string, any> | null;
}

export interface NormalizedSourceDocument {
  sourceItemId?: string;
  canonicalUrl: string;
  canonicalUrlHash: string;
  contentHash: string;
  title: string;
  summary?: string | null;
  cleanHtml?: string | null;
  cleanText?: string | null;
  authors: string[];
  publishedAt?: Date | string | null;
  nativeTopics: string[];
  countryId?: string | null;
  language: string;
  rawMetadata?: Record<string, any> | null;
}

export interface DiscoveryPage {
  items: DiscoveredItem[];
  nextCursor?: string | null;
  pageNumber?: number | null;
  hasMore: boolean;
  totalItems?: number | null;
}

export interface Checkpoint {
  cursor?: string | null;
  watermark?: Date | string | null;
  etag?: string | null;
  lastModified?: string | null;
}

export interface WatchedSnapshot {
  url: string;
  title?: string | null;
  contentHash: string;
  cleanHtml?: string | null;
  cleanText?: string | null;
  capturedAt: Date;
  metadata?: Record<string, any> | null;
}

export interface ReconcileResult {
  sourceId: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  expectedCount?: number;
  actualCount?: number;
  missingExternalIds: string[];
  reconciledCount: number;
}

// ============================================================
// EXECUTION CONTEXTS
// ============================================================

export interface SourceLogger {
  info: (msg: string, ...args: any[]) => void;
  warn: (msg: string, ...args: any[]) => void;
  error: (msg: string, ...args: any[]) => void;
  debug?: (msg: string, ...args: any[]) => void;
}

export interface ExecutionContext {
  sourceId: string;
  sourceCode: string;
  sourceType: SourceType;
  countryId?: string | null;
  config?: Record<string, any>;
  runId?: string;
  checkpoint?: Checkpoint;
  logger?: SourceLogger;
}

export interface BackfillWindowContext extends ExecutionContext {
  windowId: string;
  windowStart: Date | string;
  windowEnd: Date | string;
  cursor?: string | null;
  pageNumber?: number;
}

// ============================================================
// ADAPTER INTERFACES
// ============================================================

/**
 * Base SourceAdapter required for every ingestion source.
 */
export interface SourceAdapter {
  /**
   * Discover items from live feed, API, or listing.
   */
  discover(ctx: ExecutionContext): Promise<DiscoveredItem[]>;

  /**
   * Fetch complete source detail for a discovered item (full HTML/API payload).
   */
  fetchDetail(item: DiscoveredItem, ctx: ExecutionContext): Promise<SourceDetail>;

  /**
   * Normalize detail into canonical document format ready for versioning and AI scoring.
   */
  normalize(
    detail: SourceDetail,
    item: DiscoveredItem,
    ctx: ExecutionContext
  ): Promise<NormalizedSourceDocument>;

  /**
   * Optional checkpoint extraction from response headers / cursors.
   */
  getCheckpoint?(response: any, ctx: ExecutionContext): Promise<Checkpoint>;
}

/**
 * Optional capability for sources supporting historical backfilling.
 */
export interface BackfillableAdapter {
  backfill(window: BackfillWindowContext, ctx: ExecutionContext): Promise<DiscoveryPage>;
}

/**
 * Optional capability for change-watch sources (e.g. policy requirement pages).
 */
export interface WatchAdapter {
  snapshot(ctx: ExecutionContext): Promise<WatchedSnapshot>;
}

/**
 * Optional capability for reconciliation routines.
 */
export interface ReconcileAdapter {
  reconcile(
    period: { start: Date | string; end: Date | string },
    ctx: ExecutionContext
  ): Promise<ReconcileResult>;
}

/**
 * Optional capability for custom source health diagnostic probes.
 */
export interface HealthcheckAdapter {
  healthcheck(ctx: ExecutionContext): Promise<{ status: SourceHealthStatus; message?: string }>;
}
