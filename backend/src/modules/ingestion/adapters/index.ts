/**
 * Adapter factory - resolves a registry source to its adapter instance.
 *
 * The registry's `adapterClass` field is the key here, which keeps configuration
 * and code honest: a source naming an adapter that does not exist fails at
 * startup, not on its first scheduled run.
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

const ADAPTER_FACTORIES: Record<string, AdapterFactory> = {
  CanadaSourceAdapter: createCanadaAdapter,
  UkSourceAdapter: createUkAdapter,
  AustraliaSourceAdapter: createAustraliaAdapter,
  UsaSourceAdapter: createUsaAdapter,
  GermanySourceAdapter: createGermanyAdapter,
  NewZealandSourceAdapter: createNewZealandAdapter,
  IrelandSourceAdapter: createIrelandAdapter,
  EuSourceAdapter: createEuAdapter,
};

export function createAdapter(config: SourceConfig): SourceAdapter {
  const factory = ADAPTER_FACTORIES[config.adapterClass];
  if (!factory) {
    throw new Error(
      `Source ${config.code} names unknown adapterClass '${config.adapterClass}'`
    );
  }
  return factory(config);
}

/**
 * Instantiate every registered source. Called at worker startup so a broken
 * mapping surfaces immediately; also the assertion behind the Day 1 checkpoint
 * that all eight geographies have adapters.
 */
export function createAllAdapters(): Map<string, SourceAdapter> {
  return new Map(
    PHASE1_SOURCES.map((config) => [config.code, createAdapter(config)] as const)
  );
}

export { BaseSourceAdapter, AdapterNotImplementedError } from "./base/SourceAdapter";
export type { SourceAdapter } from "./base/SourceAdapter";
export * from "./base/types";
