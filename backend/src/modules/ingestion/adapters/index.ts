/**
 * Adapter registry - resolves a registry source to its adapter instance.
 *
 * `ADAPTER_REGISTRY` is keyed by source code, which is already the registry's
 * unique key; a separate `adapterKey` field would be a second name for the same
 * thing and a second thing to keep in sync. `assertAdapterCoverage()` gives the
 * guarantee that matters: every configured source resolves to real code, and
 * every adapter has a source.
 */

import type { SourceAdapter } from "./base/SourceAdapter";
import type { SourceConfig } from "../config/sourceConfig.schema";
import { PHASE1_SOURCES } from "../config/sourceRegistry";
import { createAustraliaAdapter } from "./australia/AustraliaSourceAdapter";
import { createCanadaAdapter } from "./canada/CanadaSourceAdapter";
import { createEuAdapter } from "./eu/EuSourceAdapter";
import { createGermanyAdapter } from "./germany/GermanySourceAdapter";
import { createIrelandAdapter } from "./ireland/IrelandSourceAdapter";
import { createNewZealandAdapter } from "./newZealand/NewZealandSourceAdapter";
import { createUkAdapter } from "./uk/UkSourceAdapter";
import { createUsaAdapter } from "./usa/UsaSourceAdapter";

type AdapterFactory = (config: SourceConfig) => SourceAdapter;

/** Country factory per `adapterClass`. Each throws on an unmapped source code. */
const COUNTRY_FACTORIES: Record<string, AdapterFactory> = {
  CanadaSourceAdapter: createCanadaAdapter,
  UkSourceAdapter: createUkAdapter,
  AustraliaSourceAdapter: createAustraliaAdapter,
  UsaSourceAdapter: createUsaAdapter,
  GermanySourceAdapter: createGermanyAdapter,
  NewZealandSourceAdapter: createNewZealandAdapter,
  IrelandSourceAdapter: createIrelandAdapter,
  EuSourceAdapter: createEuAdapter,
};

/**
 * Source code -> the factory that builds its adapter. Built from the registry
 * itself, so the two cannot drift: a source with no country factory fails here,
 * and a country factory with no source is simply never reached.
 */
export const ADAPTER_REGISTRY: Record<string, AdapterFactory> = Object.fromEntries(
  PHASE1_SOURCES.map((source) => {
    const factory = COUNTRY_FACTORIES[source.adapterClass];
    if (!factory) {
      throw new Error(
        `Source ${source.code} names unknown adapterClass '${source.adapterClass}'`
      );
    }
    return [source.code, factory];
  })
);

export const KNOWN_ADAPTER_CODES: ReadonlySet<string> = new Set(Object.keys(ADAPTER_REGISTRY));

export function createAdapter(config: SourceConfig): SourceAdapter {
  const factory = ADAPTER_REGISTRY[config.code];
  if (!factory) throw new Error(`No adapter registered for source ${config.code}`);
  return factory(config);
}

/**
 * Instantiate every registered source. Called at worker startup so a broken
 * mapping surfaces immediately, and by `verify:sources` as the Day-2 checkpoint
 * that all eight geographies and all five families have working adapters.
 */
export function createAllAdapters(): Map<string, SourceAdapter> {
  return new Map(
    PHASE1_SOURCES.map((config) => [config.code, createAdapter(config)] as const)
  );
}

/** Throws unless every source resolves and every family is represented. */
export function assertAdapterCoverage(): void {
  const adapters = createAllAdapters();
  const families = new Set([...adapters.values()].map((adapter) => adapter.family));

  for (const family of ["RSS_ATOM", "JSON_API", "WEB_LISTING", "CHANGE_WATCH", "DATA_FILE"]) {
    if (!families.has(family)) {
      throw new Error(`No adapter implements the ${family} family`);
    }
  }
}

export {
  BaseSourceAdapter,
  AdapterNotImplementedError,
  DiscoveryPageError,
  DetailExtractionError,
} from "./base/SourceAdapter";
export type { SourceAdapter } from "./base/SourceAdapter";
export * from "./base/types";
