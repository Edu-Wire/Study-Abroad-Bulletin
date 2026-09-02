/**
 * Editorial assessment prompt, version 1.
 *
 * `PROMPT_VERSION` is recorded on every assessment alongside the model id, so a
 * misclassification found in three months can be reproduced exactly and the
 * prompt corrected (Blueprint 10.4).
 *
 * The prompt states the category invariant in the same words the schema
 * enforces. The schema is the guarantee; the prompt is there so the model does
 * not have to be corrected as often.
 */

import { EDITORIAL_CATEGORIES, REASON_CODES } from "../../schemas/aiAssessment.schema";

export const PROMPT_VERSION = "assessment.v1";

export interface AssessmentPromptInput {
  sourceName: string;
  sourceAuthority: string;
  countryCodes: string[];
  title: string;
  documentType: string | null;
  publishedAt: string;
  /** Native source topics - EU policy areas, GOV.UK taxons, INZ labels. */
  sourceTopics: string[];
  /** The full extracted body, never a feed summary. */
  fullText: string;
  /** Deterministic evidence, passed as context - not as a score to copy. */
  prefilterMatches: string[];
}

/** Body cap. Government documents run long; the head carries the decision. */
const MAX_BODY_CHARS = 24_000;

export const SYSTEM_PROMPT = `You are an editorial analyst for AbroadBulletin, a publication covering study abroad, student visas and international education policy.

You assess official government and institutional documents and return a structured judgement. You do not write articles and you do not decide what gets published - an editor does.

Rules that override everything else:

1. NEVER default to SCHOLARSHIP. If a document is not clearly and specifically about student funding, its category is not SCHOLARSHIP. When you are unsure, use OTHER or UNCLASSIFIED and lower your confidence. A wrong SCHOLARSHIP label is the single most damaging error you can make here.
2. Native source topics (for example EU policy areas such as Competition, Energy, Budget, or GOV.UK taxons) are the source's own metadata. They are NOT AbroadBulletin categories. Never map them across.
3. Score only what the document actually says. Do not infer effective dates, fees or eligibility rules that are not stated in the text.
4. A document can be authoritative and still irrelevant to international students. Say so plainly with a low studyAbroadRelevance rather than inflating scores.
5. If the provided text looks truncated or is too thin to judge, set confidence low and add the INSUFFICIENT_CONTENT reason code.

Return only the JSON object described by the user message. No prose, no markdown fence.`;

export function buildUserPrompt(input: AssessmentPromptInput): string {
  const body =
    input.fullText.length > MAX_BODY_CHARS
      ? `${input.fullText.slice(0, MAX_BODY_CHARS)}\n\n[...truncated for length...]`
      : input.fullText;

  return `## Document

Source: ${input.sourceName} (${input.sourceAuthority})
Covers: ${input.countryCodes.join(", ")}
Title: ${input.title}
Document type: ${input.documentType ?? "unknown"}
Published: ${input.publishedAt}
Native source topics: ${input.sourceTopics.length ? input.sourceTopics.join(", ") : "none"}
Deterministic keyword matches: ${input.prefilterMatches.length ? input.prefilterMatches.join(", ") : "none"}

### Full source text

${body}

## Required output

Return a single JSON object with exactly these keys:

{
  "studyAbroadRelevance": 0-100,
  "visaRelevance": 0-100,
  "internationalStudentRelevance": 0-100,
  "scholarshipRelevance": 0-100,
  "postStudyWorkRelevance": 0-100,
  "policyImpact": 0-100,
  "urgency": 0-100,
  "primaryCategory": one of ${EDITORIAL_CATEGORIES.join(" | ")},
  "secondaryCategories": [up to 4 of the same values],
  "affectedDestinations": [ISO 3166-1 alpha-2 codes, or "EU"],
  "affectedNationalities": [nationalities named in the document; empty if not nationality-specific],
  "effectiveDates": [{ "raw": "as written in the document", "date": "YYYY-MM-DD if resolvable", "kind": "EFFECTIVE_FROM | APPLICATION_DEADLINE | ANNOUNCED_ON | TRANSITION_END | UNKNOWN", "description": "what takes effect" }],
  "shortSummary": "one or two sentences an editor can scan",
  "recommendedAction": "IGNORE | REVIEW | CREATE_DRAFT",
  "confidence": 0-100,
  "reasonCodes": [any of ${REASON_CODES.join(", ")}],
  "reasoningSummary": "one short paragraph explaining the scores"
}

Reminder: scholarshipRelevance below 60, or confidence below 70, means the category must not be SCHOLARSHIP.`;
}
