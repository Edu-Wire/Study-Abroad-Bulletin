/**
 * AI provider contract.
 *
 * The pipeline is provider-agnostic on purpose: Blueprint 15.1 requires that
 * ingestion evidence is never lost because a model provider is unavailable, and
 * that is only enforceable if the provider is swappable and its failures are
 * typed as retryable.
 */

import type { AssessmentPromptInput } from "../prompts/assessment.v1";

export interface AssessmentRequest extends AssessmentPromptInput {
  /** Registry code, for logging and per-source model routing later. */
  sourceCode: string;
}

export interface AssessmentProviderResult {
  /** Raw model output, still unvalidated. The Zod schema is the gate. */
  raw: unknown;
  modelKey: string;
  promptVersion: string;
}

export interface AiProvider {
  readonly key: string;
  assess(request: AssessmentRequest): Promise<AssessmentProviderResult>;
}

/**
 * Provider outage, rate limit or transport failure. `retryable: true` tells the
 * worker to re-queue rather than mark the item processed - the source evidence
 * is already stored and must not be dropped because the model was down.
 */
export class AiProviderError extends Error {
  readonly retryable = true;

  constructor(
    readonly provider: string,
    message: string,
    readonly cause?: unknown
  ) {
    super(`${provider}: ${message}`);
    this.name = "AiProviderError";
  }
}

/**
 * The model answered but the output was not valid against the 10.2 schema.
 * Also retryable: a reformat attempt is cheap, and a partially valid assessment
 * must never be persisted.
 */
export class ClassificationError extends Error {
  readonly retryable = true;

  constructor(
    readonly sourceCode: string,
    message: string,
    readonly issues?: unknown
  ) {
    super(`${sourceCode}: ${message}`);
    this.name = "ClassificationError";
  }
}
