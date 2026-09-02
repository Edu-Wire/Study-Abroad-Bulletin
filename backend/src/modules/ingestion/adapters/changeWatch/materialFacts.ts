/**
 * Material-fact extraction for watched rule pages (Blueprint 11.3).
 *
 * A rule page changes constantly in ways that do not matter (a reworded intro, a
 * new related link). What matters to a student is money, time, eligibility, work
 * rights, documents and programme rules. Pulling those out here gives Developer
 * A's diff something structured to compare, so "material change" is a decision
 * about facts rather than about character counts.
 *
 * Pure. Sentence-level matching, deliberately conservative: a missed fact costs
 * an editor a read, a fabricated one costs trust.
 */

import type { ExtractedFacts } from "../base/types";

/** Sentences carrying an amount: visa fees, maintenance funds, tuition floors. */
const MONEY = /(?:[£$€]\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:CAD|AUD|NZD|USD|EUR|GBP)\b|\b(?:fee|cost|funds|financial (?:proof|evidence|requirement)|maintenance)\b)/i;

/** Processing times, application windows, effective dates, grace periods. */
const TIME =
  /\b(?:\d+\s*(?:calendar |working |business )?(?:days?|weeks?|months?|years?)|processing time|from \d{1,2} \w+ \d{4}|effective (?:from|on)|with effect from|deadline|expires?|valid for)\b/i;

/** Who qualifies, at what level, from where, through which institution. */
const ELIGIBILITY =
  /\b(?:eligib\w+|qualify|requirements?|must (?:hold|have|be)|not eligible|criteria|applicants? (?:must|who)|English language (?:test|requirement)|IELTS|TOEFL|PTE)\b/i;

/** Hours, in-study employment, and the post-study work permissions by name. */
const WORK_RIGHTS =
  /\b(?:work(?:ing)? (?:rights?|hours?|permission|entitlement)|hours per (?:week|fortnight)|on-campus|off-campus|OPT|CPT|part-time work|full-time work|employment)\b/i;

/** The paperwork a student must produce. */
const DOCUMENTS =
  /\b(?:PAL|TAL|CAS|CoE|I-20|DS-2019|passport|biometric|police (?:check|certificate)|medical (?:exam|certificate)|insurance|transcript|offer letter|acceptance letter|financial evidence)\b/i;

/** Named programmes and route rules. */
const PROGRAM_RULES =
  /\b(?:PGWP|Post-?Graduation Work Permit|Graduate route|Post[- ]Study Work|Pathway Student Visa|subclass \d{3}|Stamp \d|dependants?|sponsor (?:duties|licence|license)|DLI|CRICOS)\b/i;

const MATCHERS: Array<[keyof ExtractedFacts, RegExp]> = [
  ["money", MONEY],
  ["time", TIME],
  ["eligibility", ELIGIBILITY],
  ["workRights", WORK_RIGHTS],
  ["documents", DOCUMENTS],
  ["programRules", PROGRAM_RULES],
];

/** Cap per bucket: a diff wants representative facts, not the whole page back. */
const MAX_PER_BUCKET = 25;

function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?:])\s+|\n+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 20 && sentence.length <= 400);
}

/**
 * Bucket a page's sentences by fact type.
 *
 * `configuredFacts` are the per-target `materialFacts` from the registry. They
 * do not gate extraction - they add source-specific phrases the generic patterns
 * would miss (e.g. "PAL/TAL requirement" on the IRCC study-permit watch).
 */
export function extractMaterialFacts(
  text: string,
  configuredFacts: string[] = []
): ExtractedFacts {
  const facts: ExtractedFacts = {
    money: [],
    time: [],
    eligibility: [],
    workRights: [],
    documents: [],
    programRules: [],
  };

  const configuredPattern = buildConfiguredPattern(configuredFacts);

  for (const sentence of toSentences(text)) {
    let matched = false;

    for (const [bucket, pattern] of MATCHERS) {
      if (pattern.test(sentence) && facts[bucket].length < MAX_PER_BUCKET) {
        facts[bucket].push(sentence);
        matched = true;
      }
    }

    // A sentence naming a configured fact is material even when no generic
    // pattern fires - that is why the registry lists them per target.
    if (!matched && configuredPattern?.test(sentence) && facts.eligibility.length < MAX_PER_BUCKET) {
      facts.eligibility.push(sentence);
    }
  }

  return facts;
}

function buildConfiguredPattern(configuredFacts: string[]): RegExp | null {
  const terms = configuredFacts
    .flatMap((fact) => fact.split(/[/,]/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  return terms.length > 0 ? new RegExp(`\\b(?:${terms.join("|")})\\b`, "i") : null;
}

/** Whether a page yielded anything worth diffing at all. */
export function hasMaterialFacts(facts: ExtractedFacts): boolean {
  return Object.values(facts).some((bucket) => bucket.length > 0);
}
