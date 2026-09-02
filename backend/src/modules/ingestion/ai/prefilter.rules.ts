/**
 * Deterministic prefilter - stage 1 of the two-stage relevance design (10.1).
 *
 * Runs on the **full normalized text plus native topics plus source priors** -
 * never title + snippet alone. Blueprint 10.4 names classifying from an RSS
 * snippet as a root cause of the current misclassifications.
 *
 * This stage may reject and rank. It never assigns an editorial category; that
 * is stage 2, under the 10.4 invariants.
 */

import type { SourceConfig } from "../config/sourceConfig.schema";
import type { NormalizedSourceDocument } from "../schemas/candidate.schema";
import type { ReasonCode } from "../schemas/aiAssessment.schema";

export type PrefilterVerdictKind = "PASS" | "HARD_EXCLUDE";

export interface PrefilterResult {
  score: number;
  verdict: PrefilterVerdictKind;
  matchedBoost: string[];
  matchedNegative: string[];
  reasonCodes: ReasonCode[];
  reason: string;
}

/**
 * Authority classes focused enough that one weak signal is worth an AI call.
 * A rules page or visa authority rarely publishes off-topic noise.
 */
const HIGH_TRUST_AUTHORITIES = new Set([
  "IMMIGRATION_AUTHORITY",
  "VISA_AUTHORITY",
  "POLICY_RULES",
  "STUDY_PORTAL_GOV",
]);

/**
 * Universal student vocabulary, checked in addition to each source's own boost
 * terms. A source-specific list can be wrong; this floor catches an obviously
 * student-relevant document on any feed.
 */
const UNIVERSAL_STUDENT_TERMS = [
  "international student",
  "student visa",
  "study permit",
  "study abroad",
  "post-study work",
  "student mobility",
  "higher education",
  "scholarship",
  "tuition",
];

/** Hard-exclude patterns per Blueprint 5, applied only to their own sources. */
const HARD_EXCLUDE_RULES: Array<{
  appliesTo: (source: SourceConfig) => boolean;
  pattern: RegExp;
  reason: string;
  reasonCode: ReasonCode;
}> = [
  {
    // 5.5: FFO feeds are broad diplomatic content; do not spend tokens on them.
    appliesTo: (source) => source.geo === "DE" && source.authorityType === "GENERAL_GOV_NEWS",
    pattern:
      /\b(?:bilateral talks|foreign minister|ambassador|peace (?:talks|process)|sanctions?|ceasefire|humanitarian (?:aid|corridor)|arms|troop|G7|G20|NATO)\b/i,
    reason: "Diplomatic content with no student angle",
    reasonCode: "GENERAL_DIPLOMATIC_CONTENT",
  },
  {
    // 5.7: citizenship / temporary protection is not study-abroad content
    // unless a student rule is explicitly affected.
    appliesTo: (source) => source.geo === "IE",
    pattern:
      /\b(?:citizenship ceremony|naturalisation|temporary protection|beneficiaries of temporary protection|asylum|international protection)\b/i,
    reason: "Citizenship or protection notice with no student rule affected",
    reasonCode: "OFF_TOPIC_FOR_SOURCE",
  },
  {
    // 5.3: domestic childcare/schools unless international education implicated.
    appliesTo: (source) => source.geo === "AU" && source.authorityType === "EDUCATION_GOV",
    pattern:
      /\b(?:childcare|early childhood|preschool|kindergarten|primary school|school funding|teacher shortage)\b/i,
    reason: "Domestic schooling story with no international education angle",
    reasonCode: "OFF_TOPIC_FOR_SOURCE",
  },
];

/**
 * Whole-term matching. Substring matching lets "PAL" hit "principal" and "OPT"
 * hit "option" - exactly the noise this stage exists to remove.
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
    if (pattern.test(haystack)) matched.push(term);
  }
  return matched;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Full text + native topics + document type, lowercased. Never title alone. */
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
 * Run the deterministic prefilter.
 *
 * `score` blends the source's configured prior with the strength of the keyword
 * evidence, so a focused source with one hit still outranks a broad newswire
 * with two. It orders the queue and gives the AI prompt context. It is never
 * displayed as a relevance score and never becomes a category.
 */
export function runPrefilter(
  source: SourceConfig,
  document: NormalizedSourceDocument
): PrefilterResult {
  const haystack = buildHaystack(document);
  const reasonCodes: ReasonCode[] = [];

  const matchedBoost = [
    ...new Set([
      ...matchTerms(haystack, source.prefilter.boostTerms),
      ...matchTerms(haystack, UNIVERSAL_STUDENT_TERMS),
    ]),
  ];
  const matchedNegative = matchTerms(haystack, source.prefilter.negativeTerms);

  const evidence = Math.min(50, matchedBoost.length * 12);
  const penalty = source.prefilter.strict ? matchedNegative.length * 15 : 0;
  const score = clamp(Math.round(source.relevancePriors.studyAbroad / 2) + evidence - penalty);

  const base = { score, matchedBoost, matchedNegative };

  // A change-watch item exists only because a watched rule page moved. The
  // change is the signal; keyword filtering it would discard the whole point.
  if (source.adapter === "CHANGE_WATCH") {
    return {
      ...base,
      verdict: "PASS",
      reasonCodes,
      reason: "Change-watch items always reach assessment",
    };
  }

  // 7.1: never judge on a feed snippet. Missing detail is a pipeline failure to
  // retry, not evidence of irrelevance.
  if (source.detail.requiresDetailFetch && document.fullText.trim().length === 0) {
    return {
      ...base,
      verdict: "HARD_EXCLUDE",
      reasonCodes: ["INSUFFICIENT_CONTENT"],
      reason: "Detail content not loaded; assessment deferred until enrichment",
    };
  }

  // Source-specific hard excludes, but only when nothing student-relevant is
  // present: a diplomatic story that does mention student visas still goes on.
  for (const rule of HARD_EXCLUDE_RULES) {
    if (!rule.appliesTo(source) || !rule.pattern.test(haystack)) continue;
    if (matchedBoost.length === 0) {
      return {
        ...base,
        verdict: "HARD_EXCLUDE",
        reasonCodes: [rule.reasonCode, "NO_STUDENT_IMPACT"],
        reason: rule.reason,
      };
    }
  }

  if (matchedBoost.length < source.prefilter.minBoostHits) {
    return {
      ...base,
      verdict: "HARD_EXCLUDE",
      reasonCodes: ["NO_STUDENT_IMPACT"],
      reason: `Needs ${source.prefilter.minBoostHits} student term(s), matched ${matchedBoost.length}`,
    };
  }

  // Strict sources (FFO, USCIS, general EU news) must not spend tokens on
  // off-topic government content that happens to mention a term once.
  if (source.prefilter.strict && matchedNegative.length > 0) {
    const trusted = HIGH_TRUST_AUTHORITIES.has(source.authorityType);
    const strongEnough = matchedBoost.length >= matchedNegative.length + (trusted ? 0 : 1);
    if (!strongEnough) {
      return {
        ...base,
        verdict: "HARD_EXCLUDE",
        reasonCodes: ["OFF_TOPIC_FOR_SOURCE"],
        reason: `Off-topic terms (${matchedNegative.join(", ")}) outweigh the student signal`,
      };
    }
  }

  return {
    ...base,
    verdict: "PASS",
    reasonCodes,
    reason:
      matchedBoost.length > 0
        ? `Matched ${matchedBoost.length} student-relevance term(s)`
        : "Source is focused enough to forward without keyword evidence",
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
