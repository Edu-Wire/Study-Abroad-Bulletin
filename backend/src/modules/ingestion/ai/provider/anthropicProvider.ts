/**
 * Anthropic provider - opt-in via `AI_PROVIDER=anthropic`.
 *
 * Uses the Messages API over raw HTTP rather than `@anthropic-ai/sdk`. The SDK
 * is the better long-term choice, but adding a dependency mid-sprint means a
 * lockfile change and a guaranteed merge conflict with Developer A's branch.
 * `docs/ingestion/developer-b-contracts.md` records the swap as a follow-up:
 * only `callApi()` below changes.
 *
 * The response is NOT trusted here. Whatever comes back goes through the Zod
 * schema and the 10.4 category invariants in `classification.service`; this file
 * is transport plus JSON extraction only.
 */

import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from "../prompts/assessment.v1";
import { AiProviderError, type AiProvider, type AssessmentProviderResult, type AssessmentRequest } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

/**
 * Claude Opus 5. Overridable with `AI_MODEL` when a cheaper tier proves
 * sufficient on measured editorial-acceptance rates (Blueprint 14).
 */
const DEFAULT_MODEL = "claude-opus-5";

/** Enough for the assessment JSON with its summary and reasoning paragraph. */
const MAX_TOKENS = 4000;

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
  stop_details?: { category?: string; explanation?: string };
  model?: string;
}

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export class AnthropicAiProvider implements AiProvider {
  readonly key = "anthropic";

  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: AnthropicProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AiProviderError(
        "anthropic",
        "ANTHROPIC_API_KEY is not set. Use AI_PROVIDER=mock for local runs."
      );
    }
    this.apiKey = apiKey;
    this.model = options.model ?? process.env.AI_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  async assess(request: AssessmentRequest): Promise<AssessmentProviderResult> {
    const response = await this.callApi(request);

    // Classification is a judgement, not an open-ended task: a decline here
    // means the document tripped a safety classifier, and the item must go to a
    // human rather than be silently dropped.
    if (response.stop_reason === "refusal") {
      throw new AiProviderError(
        "anthropic",
        `Model declined to assess ${request.sourceCode} (${response.stop_details?.category ?? "unknown"})`
      );
    }

    const text = (response.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new AiProviderError("anthropic", "Model returned no text content");
    }

    return {
      raw: extractJson(text),
      modelKey: response.model ?? this.model,
      promptVersion: PROMPT_VERSION,
    };
  }

  /** The only method that changes when this moves onto the official SDK. */
  private async callApi(request: AssessmentRequest): Promise<AnthropicResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const httpResponse = await fetch(API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: MAX_TOKENS,
          // Classification is a bounded judgement; low effort keeps the
          // per-document cost sane across thousands of government documents.
          output_config: { effort: "low" },
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildUserPrompt(request) }],
        }),
      });

      if (!httpResponse.ok) {
        const detail = await httpResponse.text().catch(() => "");
        throw new AiProviderError(
          "anthropic",
          `HTTP ${httpResponse.status}: ${detail.slice(0, 400)}`
        );
      }

      return (await httpResponse.json()) as AnthropicResponse;
    } catch (cause) {
      if (cause instanceof AiProviderError) throw cause;
      // Timeouts, DNS failures, rate limits: all retryable by construction, so
      // the source evidence already stored is never lost (15.1).
      throw new AiProviderError("anthropic", "Request failed", cause);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Pull the JSON object out of a model response. The prompt asks for bare JSON,
 * but a stray fence or preamble should cost a reformat, not the whole item.
 */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to the outermost braces.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        // Fall through to the throw below.
      }
    }
    throw new AiProviderError("anthropic", "Response was not valid JSON");
  }
}
