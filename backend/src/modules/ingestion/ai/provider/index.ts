/**
 * Provider selection.
 *
 * `mock` is the default on purpose: the Day-3 end-to-end demo and every fixture
 * test must run without an API key, and a deterministic provider makes a failed
 * assertion mean something.
 */

import { MockAiProvider } from "./mockProvider";
import { AnthropicAiProvider } from "./anthropicProvider";
import type { AiProvider } from "./types";

export type ProviderKey = "mock" | "anthropic";

let cached: AiProvider | null = null;

export function resolveProviderKey(override?: ProviderKey): ProviderKey {
  if (override) return override;
  return process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "mock";
}

/**
 * The provider for this process. Cached because `AnthropicAiProvider` validates
 * its credentials in the constructor and a worker builds one per job otherwise.
 */
export function getProvider(override?: ProviderKey): AiProvider {
  const key = resolveProviderKey(override);
  if (cached?.key === key) return cached;
  cached = key === "anthropic" ? new AnthropicAiProvider() : new MockAiProvider();
  return cached;
}

/** Test seam: drops the cached provider so env changes take effect. */
export function resetProvider(): void {
  cached = null;
}

export { MockAiProvider } from "./mockProvider";
export { AnthropicAiProvider } from "./anthropicProvider";
export { AiProviderError, ClassificationError } from "./types";
export type { AiProvider, AssessmentRequest, AssessmentProviderResult } from "./types";
