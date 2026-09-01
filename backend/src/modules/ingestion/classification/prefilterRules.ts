/**
 * Deterministic prefilter - stage 1 of the two-stage relevance design (10.1).
 *
 * Keywords, source class, document type, country and native topics decide
 * cheaply whether an item is worth an AI call. This stage may only *reject*
 * noise and rank; it never assigns an editorial category. Categories come from
 * stage 2 under the 10.4 invariants.
 */

import type { SourceConfig } from "../config/sourceConfig.schema";
import type {
  NormalizedSourceDocument,
  PrefilterVerdict,
} from "../schemas/candidate.schema";

/**
 * Authority classes trusted enough that a single weak signal is worth an AI
 * call. A rules page or visa authority rarely publishes off-topic noise.
 */
const HIGH_TRUST_AUTHORITIES = new Set([
  "IMMIGRATION_AUTHORITY",
  "VISA_AUTHORITY",
  "POLICY_RULES",
  "STUDY_PORTAL_GOV",
]);

/** Lowercased haystack: title, summary, native topics and the body. */
function buildHaystack(document: NormalizedSourceDocument): string {
  return [
    document.title,
    document.sourceSummary ?? "",
    document.sourceTopics.join(" "),
    document.documentType ?? "",
    document.fullText,
  ]
    .join("\n")
    .toLowerCase();
}

/**
 * Whole-term match. Substring matching would let "PAL" hit "principal" and
 * "OPT" hit "option", which is exactly the noise this stage exists to remove.
 */
function matchTerms(haystack: string, terms: string[]): string[] {
  const matched: string[] = [];
  for (const term of terms) {
    const normalized = term.toLowerCase().trim();
    if (!normalized) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(normalized)}(?![\\p{L}\\p{N}])`,
      "u"
    );
    if (pattern.test(haystack)) {
      matched.push(term);
    }
  }
  return matched;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Run the deterministic prefilter for one document against its source config.
 *
 * `signal` blends the source's configured relevance prior with the strength of
 * the keyword evidence, so a high-signal source with one hit still outranks a
 * broad newswire with two. It feeds ordering and the AI prompt as context; it is
 * never shown as a relevance score.
 */
export function runPrefilter(
  source: SourceConfig,
  document: NormalizedSourceDocument
): PrefilterVerdict {
  const haystack = buildHaystack(document);
  const matchedBoostTerms = matchTerms(haystack, source.prefilter.boostTerms);
  const matchedNegativeTerms = matchTerms(haystack, source.prefilter.negativeTerms);

  const boostHits = matchedBoostTerms.length;
  const evidence = Math.min(50, boostHits * 12);
  const penalty = source.prefilter.strict ? matchedNegativeTerms.length * 15 : 0;
  const signal = clampScore(
    Math.round(source.editorial.relevancePrior / 2) + evidence - penalty
  );

  const base = { matchedBoostTerms, matchedNegativeTerms, signal };

  // A change-watch item exists only because a watched rule page moved, so it is
  // never filtered on keywords - the change itself is the signal.
  if (source.adapter === "CHANGE_WATCH") {
    return { ...base, passed: true, reason: "Change-watch items always reach assessment" };
  }

  // 7.1: never judge an item on a feed snippet. Missing detail is a pipeline
  // failure to retry, not evidence of irrelevance.
  if (source.detail.requiresDetailFetch && document.fullText.trim().length === 0) {
    return {
      ...base,
      passed: false,
      reason: "Detail content not yet loaded; assessment deferred until enrichment",
    };
  }

  if (boostHits < source.prefilter.minBoostHits) {
    return {
      ...base,
      passed: false,
      reason: `Needs ${source.prefilter.minBoostHits} boost term(s), matched ${boostHits}`,
    };
  }

  // Strict sources (5.5 FFO, 5.4 USCIS, EU general news) must not spend AI
  // tokens on off-topic government content that happens to mention a term once.
  if (source.prefilter.strict && matchedNegativeTerms.length > 0) {
    const trusted = HIGH_TRUST_AUTHORITIES.has(source.authorityType);
    const strongEnough = boostHits >= matchedNegativeTerms.length + (trusted ? 0 : 1);
    if (!strongEnough) {
      return {
        ...base,
        passed: false,
        reason: `Off-topic terms (${matchedNegativeTerms.join(", ")}) outweigh student signal`,
      };
    }
  }

  return {
    ...base,
    passed: true,
    reason:
      boostHits > 0
        ? `Matched ${boostHits} student-relevance term(s)`
        : "Source is focused enough to forward without keyword evidence",
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}
