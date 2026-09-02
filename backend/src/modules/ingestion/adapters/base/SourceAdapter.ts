/**
 * SourceAdapter - the one contract every source implements (Blueprint 6).
 *
 * `BaseSourceAdapter` holds everything transport-agnostic: identity resolution
 * (11.1), URL resolution, date parsing, and page construction. It deliberately
 * does NOT hash, version, or diff - that is Developer A's pipeline. Adapters
 * emit normalized content; the worker decides what changed.
 */

import type { SourceConfig } from "../../config/sourceConfig.schema";
import type {
  AdapterContext,
  BackfillWindow,
  DiscoveredItem,
  DiscoveryPage,
  ExtractedFacts,
  NormalizedSourceDocument,
  ReconcileRange,
  ReconcileResult,
  SourceDetail,
  SourceHealth,
  WatchSnapshot,
} from "./types";

export interface SourceAdapter {
  readonly code: string;
  readonly family: string;
  readonly appendixRef: string[];
  readonly officialUrl: string;
  readonly adapterVersion: string;

  discover(ctx: AdapterContext): Promise<DiscoveryPage>;
  fetchDetail(item: DiscoveredItem, ctx: AdapterContext): Promise<SourceDetail>;
  normalize(
    detail: SourceDetail,
    item: DiscoveredItem,
    ctx: AdapterContext
  ): Promise<NormalizedSourceDocument>;

  backfill?(window: BackfillWindow, ctx: AdapterContext): Promise<DiscoveryPage>;
  snapshot?(ctx: AdapterContext): Promise<WatchSnapshot[]>;
  reconcile?(range: ReconcileRange, ctx: AdapterContext): Promise<ReconcileResult>;
  healthcheck?(ctx: AdapterContext): Promise<SourceHealth>;
}

/**
 * A discovery page failed. Blueprint 15.1: this must propagate. Swallowing it
 * into an empty page is indistinguishable from "the source published nothing",
 * which silently truncates a backfill.
 */
export class DiscoveryPageError extends Error {
  constructor(
    readonly sourceId: string,
    readonly page: { pageNumber?: number; cursor?: string; url: string },
    readonly cause?: unknown
  ) {
    super(`${sourceId}: discovery page failed (${page.url})`);
    this.name = "DiscoveryPageError";
  }
}

/** Detail extraction produced nothing usable. Retryable unless `JS_ONLY`. */
export class DetailExtractionError extends Error {
  constructor(
    readonly sourceId: string,
    readonly url: string,
    readonly reason: string
  ) {
    super(`${sourceId}: detail extraction failed at ${url} (${reason})`);
    this.name = "DetailExtractionError";
  }
}

export class AdapterNotImplementedError extends Error {
  constructor(
    readonly sourceId: string,
    readonly method: string
  ) {
    super(`${sourceId}: ${method}() is not implemented`);
    this.name = "AdapterNotImplementedError";
  }
}

export abstract class BaseSourceAdapter implements SourceAdapter {
  readonly adapterVersion: string = "1.0.0";

  constructor(protected readonly config: SourceConfig) {}

  get code(): string {
    return this.config.code;
  }

  get family(): string {
    return this.config.adapter;
  }

  get appendixRef(): string[] {
    return this.config.provenance.references;
  }

  get officialUrl(): string {
    return this.config.discovery.url;
  }

  abstract discover(ctx: AdapterContext): Promise<DiscoveryPage>;
  abstract fetchDetail(item: DiscoveredItem, ctx: AdapterContext): Promise<SourceDetail>;
  abstract normalize(
    detail: SourceDetail,
    item: DiscoveredItem,
    ctx: AdapterContext
  ): Promise<NormalizedSourceDocument>;

  protected notImplemented(method: string): never {
    throw new AdapterNotImplementedError(this.code, method);
  }

  // ----------------------------------------------------------
  // Shared helpers
  // ----------------------------------------------------------

  /** Relative href -> absolute URL. Returns undefined rather than throwing. */
  protected resolveUrl(href: string | undefined, baseUrl: string): string | undefined {
    if (!href) return undefined;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return undefined;
    }
  }

  /** Strip fragments and tracking parameters before URL-based identity. */
  protected canonicalize(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      for (const key of [...parsed.searchParams.keys()]) {
        if (key.startsWith("utm_") || key === "fbclid" || key === "gclid") {
          parsed.searchParams.delete(key);
        }
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Blueprint 11.1 identity hierarchy, strongest first. Candidates are tried in
   * the order given; the first non-empty one wins.
   *
   * Title similarity is deliberately absent - it is a secondary review signal,
   * never a primary key.
   */
  protected pickExternalId(candidates: Array<string | undefined>): string {
    for (const candidate of candidates) {
      const trimmed = candidate?.trim();
      if (trimmed) return trimmed;
    }
    throw new Error(`${this.code}: no external id could be derived for an item`);
  }

  /** Lenient date parsing to ISO. Undefined when the source gave nothing usable. */
  protected parseDate(raw: string | undefined | null): string | undefined {
    if (!raw) return undefined;
    const trimmed = String(raw).trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    // Sources sometimes publish "27 August 2026" or "2026-08-27 10:00".
    const normalized = trimmed.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, "$1T$2:00Z");
    const retry = new Date(normalized);
    return Number.isNaN(retry.getTime()) ? undefined : retry.toISOString();
  }

  protected buildDiscoveryPage(
    items: DiscoveredItem[],
    extras: Partial<Omit<DiscoveryPage, "items">> = {}
  ): DiscoveryPage {
    const capped = extras.notModified ? [] : items;
    return {
      items: capped,
      nextCursor: extras.nextCursor,
      total: extras.total,
      sourceWatermark: extras.sourceWatermark ?? this.latestPublishedAt(capped),
      notModified: extras.notModified ?? false,
    };
  }

  /** Highest publishedAt in a page - the default incremental watermark. */
  protected latestPublishedAt(items: DiscoveredItem[]): string | undefined {
    let latest: string | undefined;
    for (const item of items) {
      if (item.publishedAt && (!latest || item.publishedAt > latest)) {
        latest = item.publishedAt;
      }
    }
    return latest;
  }

  /** Items already ingested, per the persisted watermark. */
  protected isBeforeWatermark(item: DiscoveredItem, ctx: AdapterContext): boolean {
    const watermark = ctx.syncState?.watermarkAt;
    return Boolean(watermark && item.publishedAt && item.publishedAt <= watermark);
  }

  /** Empty fact buckets; change-watch adapters fill what applies to them. */
  protected emptyFacts(): ExtractedFacts {
    return {
      money: [],
      time: [],
      eligibility: [],
      workRights: [],
      documents: [],
      programRules: [],
    };
  }

  /**
   * The 7.2 normalized document. `fullText` must come from the detail body -
   * a caller passing a feed summary here is the exact defect 7.1 warns about.
   */
  protected buildDocument(
    item: DiscoveredItem,
    detail: SourceDetail,
    fullText: string,
    extras: {
      documentType?: string | null;
      sourceTopics?: string[];
      rawMetadata?: Record<string, unknown>;
      publishedAt?: string;
      language?: string;
    } = {}
  ): NormalizedSourceDocument {
    return {
      sourceId: this.code,
      externalId: item.externalId,
      canonicalUrl: this.canonicalize(detail.finalUrl || item.canonicalUrl),
      countryCodes: this.config.countryCodes,
      publishedAt: extras.publishedAt ?? item.publishedAt ?? detail.fetchedAt,
      updatedAtSource: item.updatedAtSource ?? null,
      documentType: extras.documentType ?? item.documentType ?? null,
      title: item.title,
      sourceSummary: item.sourceSummary ?? null,
      fullText,
      sourceTopics: extras.sourceTopics ?? item.sourceTopics ?? [],
      language: extras.language ?? "en",
      // Hashing is Developer A's job (versioning/diff). The adapter states that
      // explicitly rather than leaving an empty string that looks like a bug.
      contentHash: "PENDING_PIPELINE_HASH",
      rawMetadata: {
        ...(item.discoveryRaw ?? {}),
        ...(extras.rawMetadata ?? {}),
        detailStatus: detail.detailStatus,
        adapterVersion: this.adapterVersion,
        appendixRef: this.appendixRef,
      },
    };
  }
}
