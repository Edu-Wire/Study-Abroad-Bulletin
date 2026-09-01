/**
 * SourceAdapter - the one contract every source implements (Blueprint 6).
 *
 * Day 1 ships the contract and the skeletons. Day 2 fills in the transports;
 * every unimplemented method fails loudly through `notImplemented()` rather than
 * returning an empty page, because an adapter that silently discovers nothing is
 * indistinguishable from a healthy source that published nothing.
 */

import type { SourceConfig } from "../../config/sourceConfig.schema";
import type {
  BackfillWindow,
  DiscoverContext,
  DiscoveredItem,
  DiscoveryPage,
  NormalizedSourceDocument,
  ReconcileRange,
  ReconcileResult,
  SourceDetail,
  SourceHealth,
  WatchSnapshot,
  WatchTargetRef,
} from "./types";

export interface SourceAdapter {
  /** Registry code this adapter instance serves. */
  readonly sourceId: string;
  /** Bumped whenever extraction changes, so 13.3 can show adapter version. */
  readonly adapterVersion: string;

  discover(ctx: DiscoverContext): Promise<DiscoveryPage>;
  fetchDetail(item: DiscoveredItem, ctx: DiscoverContext): Promise<SourceDetail>;
  normalize(detail: SourceDetail): Promise<NormalizedSourceDocument>;

  // Optional capabilities
  backfill?(window: BackfillWindow, ctx: DiscoverContext): Promise<DiscoveryPage>;
  snapshot?(target: WatchTargetRef, ctx: DiscoverContext): Promise<WatchSnapshot>;
  reconcile?(range: ReconcileRange, ctx: DiscoverContext): Promise<ReconcileResult>;
  healthcheck?(ctx: DiscoverContext): Promise<SourceHealth>;
}

/** Thrown by skeleton methods until the Day 2 transport work lands. */
export class AdapterNotImplementedError extends Error {
  constructor(
    readonly sourceId: string,
    readonly method: string
  ) {
    super(`${sourceId}: ${method}() is not implemented yet`);
    this.name = "AdapterNotImplementedError";
  }
}

/**
 * Shared base. Holds the source config and the identity rules that the dedupe
 * layer depends on; transports live in the generic subclasses.
 */
export abstract class BaseSourceAdapter implements SourceAdapter {
  readonly adapterVersion: string = "0.1.0-skeleton";

  constructor(protected readonly config: SourceConfig) {}

  get sourceId(): string {
    return this.config.code;
  }

  abstract discover(ctx: DiscoverContext): Promise<DiscoveryPage>;
  abstract fetchDetail(item: DiscoveredItem, ctx: DiscoverContext): Promise<SourceDetail>;
  abstract normalize(detail: SourceDetail): Promise<NormalizedSourceDocument>;

  protected notImplemented(method: string): never {
    throw new AdapterNotImplementedError(this.sourceId, method);
  }

  /**
   * Canonical URL rule from the registry (11.1 identity hierarchy). Day 2
   * resolves redirects and canonical tags through the shared HTTP client; the
   * origin/protocol normalization here is already safe to rely on.
   */
  protected canonicalize(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      // Tracking parameters are not part of a document's identity.
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
}
