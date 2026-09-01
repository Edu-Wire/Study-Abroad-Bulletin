/**
 * Adapter contract types (Blueprint 6).
 *
 * Every adapter implements the same business contract even though transports
 * differ. The normalized pipeline must never care whether an item arrived as
 * Atom, JSON, an HTML listing or a watched rule page.
 */

import type { SourceConfig, SourceHealthState } from "../../config/sourceConfig.schema";
import type {
  ChangeEvidence,
  NormalizedSourceDocument,
} from "../../schemas/candidate.schema";

/**
 * Shared HTTP surface the adapters are given. The implementation - retries,
 * timeouts, redirects, conditional requests, rate limiting, telemetry - is the
 * shared client (Blueprint 9); adapters must never reimplement any of it.
 */
export interface HttpFetcher {
  getText(url: string, init?: HttpRequestInit): Promise<HttpResponse<string>>;
  getJson<T = unknown>(url: string, init?: HttpRequestInit): Promise<HttpResponse<T>>;
  /** Returns the body as bytes; used by DATA_FILE adapters for XLSX/CSV/PDF. */
  getBinary(url: string, init?: HttpRequestInit): Promise<HttpResponse<Uint8Array>>;
}

export interface HttpRequestInit {
  headers?: Record<string, string>;
  /** Conditional GET (Blueprint 9): skip unchanged pages cheaply. */
  etag?: string;
  lastModified?: string;
  timeoutMs?: number;
  maxBytes?: number;
}

export interface HttpResponse<T> {
  status: number;
  body: T;
  headers: Record<string, string>;
  etag?: string;
  lastModified?: string;
  /** True when the source answered 304 and `body` is therefore not fresh. */
  notModified: boolean;
  finalUrl: string;
}

/**
 * Per-run context handed to `discover()`. The watermark and cursor implement the
 * Singer-style incremental bookmark model referenced in Blueprint 3.
 */
export interface DiscoverContext {
  source: SourceConfig;
  http: HttpFetcher;
  /** Cursor from the previous page of this same run, if any. */
  cursor?: string;
  /** Highest source watermark already ingested, e.g. an ISO date or refCode. */
  sinceWatermark?: string;
  /** Conditional-request state stored for this source's discovery URL. */
  etag?: string;
  lastModified?: string;
  /** Caps a single run so one adapter cannot monopolize the worker. */
  maxItems?: number;
  logger: AdapterLogger;
}

/** A discovery record: enough to dedupe and to fetch detail. Never a body. */
export interface DiscoveredItem {
  sourceId: string;
  externalId: string;
  url: string;
  title: string;
  publishedAt?: string;
  updatedAtSource?: string;
  /** Feed/listing synopsis. Explicitly NOT the article body (Blueprint 7.1). */
  summary?: string;
  documentType?: string;
  sourceTopics?: string[];
  /** Transport-specific fields the detail step needs, e.g. an EU refCode. */
  raw?: Record<string, unknown>;
}

export interface DiscoveryPage {
  items: DiscoveredItem[];
  nextCursor?: string;
  total?: number;
  /** New high-water mark to persist once the page is processed successfully. */
  sourceWatermark?: string;
}

/** The raw detail payload before normalization; kept for audit and reprocessing. */
export interface SourceDetail {
  item: DiscoveredItem;
  finalUrl: string;
  contentType: string;
  /** HTML or text body when the detail is a document. */
  body?: string;
  /** Parsed JSON when the detail came from an official API. */
  json?: unknown;
  /** Bytes plus checksum when the detail is a downloaded file (DATA_FILE). */
  file?: { bytes: Uint8Array; checksum: string; filename: string };
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
}

export interface BackfillWindow {
  from: string;
  to: string;
  cursor?: string;
}

export interface WatchTargetRef {
  key: string;
  url: string;
  /** Hash of the previous stored version; absent on the first snapshot. */
  previousHash?: string;
  etag?: string;
  lastModified?: string;
}

export interface WatchSnapshot {
  target: WatchTargetRef;
  contentHash: string;
  /** The meaningful content region only - navigation and banners removed (11.2). */
  extractedContent: string;
  changed: boolean;
  fetchedAt: string;
  /** Present only when `changed` is true. */
  evidence?: ChangeEvidence;
}

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

export interface AdapterLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export type { NormalizedSourceDocument };
