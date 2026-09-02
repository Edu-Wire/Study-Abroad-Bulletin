/**
 * Adapter contract types (Blueprint 6) - the frozen injection boundary.
 *
 * Every adapter implements the same business contract even though transports
 * differ. The normalized pipeline must never care whether an item arrived as
 * Atom, JSON, an HTML listing or a watched rule page.
 *
 * Nothing here performs I/O. `AdapterContext` is supplied by the worker
 * (Developer A) at call time; adapters never construct a client, never import
 * Prisma, and never call fetch/axios/node:https directly.
 *
 * Human-readable freeze: `docs/ingestion/developer-b-contracts.md`.
 */

import type { SourceConfig, SourceHealthState } from "../../config/sourceConfig.schema";
import type {
  ChangeEvidence,
  NormalizedSourceDocument,
} from "../../schemas/candidate.schema";

// ============================================================
// Injected I/O
// ============================================================

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  responseType?: "text" | "json" | "buffer";
  /** Conditional GET (Blueprint 9): skip unchanged pages cheaply. */
  conditional?: { etag?: string; lastModified?: string };
}

export interface HttpResponse<T = string> {
  status: number;
  headers: Record<string, string>;
  /** URL after redirects. The canonical-URL fallback in the identity hierarchy. */
  finalUrl: string;
  body: T;
  /** True when the source answered 304; `body` is then not fresh. */
  notModified: boolean;
}

/**
 * Implemented by Developer A over `utils/httpClient.js#safeFetch`: timeouts,
 * retries, backoff, Retry-After, redirect caps, payload limits, SSRF guard.
 */
export interface HttpClient {
  get<T = string>(url: string, opts?: HttpRequestOptions): Promise<HttpResponse<T>>;
}

/** Safe XML parsing (DTD/entity expansion disabled) - A's `safeXmlParser.js`. */
export interface XmlParser {
  parse(text: string): unknown;
}

export interface AdapterLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Incremental bookmark state (Singer-style, Blueprint 3). The worker persists
 * it; adapters read it to resume and return the next value to store.
 */
export interface SyncState {
  watermarkAt?: string;
  cursor?: string;
  etag?: string;
  lastModified?: string;
}

export interface BackfillWindow {
  start: Date;
  end: Date;
  cursor?: string;
}

/** Everything an adapter is allowed to touch during one call. */
export interface AdapterContext {
  source: SourceConfig;
  http: HttpClient;
  xml: XmlParser;
  logger: AdapterLogger;
  now(): Date;
  syncState?: SyncState;
  /** Present on the backfill lane only. */
  window?: BackfillWindow;
  signal?: AbortSignal;
  /** Caps one run so a single adapter cannot monopolize the worker. */
  maxItems?: number;
}

// ============================================================
// Persistence handed in by Developer A (B never calls Prisma)
// ============================================================

export interface IngestionRepos {
  aiAssessment: {
    create(payload: Record<string, unknown>): Promise<{ id: string }>;
  };
  articleCandidate: {
    upsertBySourceItem(
      payload: Record<string, unknown>
    ): Promise<{ id: string; status: string }>;
    findBySourceItem(sourceItemId: string): Promise<Record<string, unknown> | null>;
  };
  article: {
    createDraftFromCandidate(
      payload: Record<string, unknown>
    ): Promise<{ id: string; slug: string }>;
  };
  articleSourceLink: {
    link(payload: Record<string, unknown>): Promise<void>;
  };
  country: {
    findIdsByCodes(codes: string[]): Promise<Record<string, string>>;
  };
}

// ============================================================
// Discovery
// ============================================================

/**
 * A discovery record: enough to dedupe and to fetch detail, never a body.
 * There is deliberately no `fullText` field here - Blueprint 7.1.
 */
export interface DiscoveredItem {
  sourceId: string;
  externalId: string;
  canonicalUrl: string;
  title: string;
  publishedAt?: string;
  updatedAtSource?: string;
  /** Feed/listing synopsis. Explicitly NOT the article body. */
  sourceSummary?: string;
  documentType?: string;
  sourceTopics?: string[];
  /** Transport-specific fields the detail step needs, e.g. an EU refCode. */
  discoveryRaw?: Record<string, unknown>;
}

export interface DiscoveryPage {
  items: DiscoveredItem[];
  nextCursor?: string;
  total?: number;
  /** New high-water mark to persist once the page is processed successfully. */
  sourceWatermark?: string;
  /** 304 from a conditional request: nothing new, and not an error. */
  notModified?: boolean;
}

// ============================================================
// Detail
// ============================================================

export const DETAIL_STATUSES = ["ENRICHED", "PARTIAL", "FAILED"] as const;
export type DetailStatus = (typeof DETAIL_STATUSES)[number];

export const DETAIL_FAILURE_REASONS = [
  /** Page returned a JS shell with no server-rendered content. No Playwright in Phase 1. */
  "JS_ONLY",
  "HTTP_ERROR",
  "EMPTY_CONTENT",
  "UNSUPPORTED_CONTENT_TYPE",
  "PAYLOAD_TOO_LARGE",
] as const;
export type DetailFailureReason = (typeof DETAIL_FAILURE_REASONS)[number];

/** Raw detail payload before normalization; retained for audit and reprocessing. */
export interface SourceDetail {
  item: DiscoveredItem;
  finalUrl: string;
  contentType: string;
  detailStatus: DetailStatus;
  reason?: DetailFailureReason;
  /** Extracted content region for document sources. */
  body?: string;
  /** Parsed JSON when detail came from an official API. */
  json?: unknown;
  /** Metadata only for DATA_FILE sources - never the parsed rows. */
  file?: {
    fileUrl: string;
    contentType: string;
    contentLength?: number;
    lastModified?: string;
    checksum?: string;
  };
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
}

// ============================================================
// Change watch
// ============================================================

/** Blueprint 11.3 material-fact taxonomy. */
export interface ExtractedFacts {
  money: string[];
  time: string[];
  eligibility: string[];
  workRights: string[];
  documents: string[];
  programRules: string[];
}

/**
 * What a watch run returns. B extracts the content region and the facts;
 * Developer A hashes it, stores the version and computes the diff.
 */
export interface WatchSnapshot {
  targetKey: string;
  url: string;
  finalUrl: string;
  contentRegionText: string;
  contentRegionHtml: string;
  extractedFacts: ExtractedFacts;
  capturedAt: string;
  notModified: boolean;
  etag?: string;
  lastModified?: string;
}

// ============================================================
// Reconciliation and health
// ============================================================

export interface ReconcileRange {
  from: string;
  to: string;
}

export interface ReconcileResult {
  expected: number;
  found: number;
  missingExternalIds: string[];
  repaired: number;
}

export interface SourceHealth {
  state: SourceHealthState;
  checkedAt: string;
  message?: string;
  latencyMs?: number;
}

export type { NormalizedSourceDocument, ChangeEvidence, SourceConfig };
