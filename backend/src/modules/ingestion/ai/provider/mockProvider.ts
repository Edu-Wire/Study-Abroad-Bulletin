/**
 * Deterministic mock provider - the DEFAULT.
 *
 * Zero network, zero API key, same output for the same input. The Day-3
 * end-to-end demo must not depend on a provider account, and adapter contract
 * tests must not depend on model sampling.
 *
 * It derives scores from keyword evidence and source priors. It is not a
 * simulation of the model's judgement: it is a fixed, inspectable stand-in that
 * exercises the same schema, the same invariants and the same routing table.
 */

import { PROMPT_VERSION } from "../prompts/assessment.v1";
import type { AiProvider, AssessmentProviderResult, AssessmentRequest } from "./types";
import type { EditorialCategory } from "../../schemas/aiAssessment.schema";

/** Signals that decide the mock's category, strongest first. */
const CATEGORY_SIGNALS: Array<{ category: EditorialCategory; pattern: RegExp }> = [
  {
    category: "STUDENT_VISA",
    pattern:
      /\b(student visa|study permit|subclass 500|F-1|M-1|Tier 4|student route|CAS|confirmation of acceptance for studies|student permission|Stamp 2)\b/i,
  },
  {
    category: "POST_STUDY_WORK",
    pattern: /\b(post-?study work|PGWP|graduate route|graduate visa|OPT|CPT|work rights)\b/i,
  },
  {
    category: "SCHOLARSHIP",
    pattern:
      /\b(scholarship|bursary|stipend|fully funded|grant (?:for|to) students?|Erasmus Mundus joint master|funding (?:call|opportunity) for students?)\b/i,
  },
  {
    category: "ADMISSIONS",
    pattern: /\b(admission|enrol?ment|intake|application deadline|offer letter|entry requirement)\b/i,
  },
  {
    category: "DATA_INTELLIGENCE",
    pattern: /\b(dataset|data tables|statistics|monthly summary|enrolment data|commencements)\b/i,
  },
  {
    category: "IMMIGRATION_POLICY",
    pattern:
      /\b(immigration rules|statement of changes|migration policy|visa policy|residence permit|immigration act)\b/i,
  },
  {
    category: "INTERNATIONAL_EDUCATION",
    pattern:
      /\b(international education|student mobility|learning mobility|higher education sector|internationalisation)\b/i,
  },
];

/** Counts occurrences so a passing mention scores lower than a real subject. */
function hits(text: string, pattern: RegExp): number {
  return (text.match(new RegExp(pattern.source, "gi")) ?? []).length;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export class MockAiProvider implements AiProvider {
  readonly key = "mock";

  async assess(request: AssessmentRequest): Promise<AssessmentProviderResult> {
    const text = `${request.title}\n${request.fullText}`;
    const evidence = Math.min(4, request.prefilterMatches.length);

    const visaHits = hits(text, CATEGORY_SIGNALS[0].pattern);
    const pswHits = hits(text, CATEGORY_SIGNALS[1].pattern);
    const scholarshipHits = hits(text, CATEGORY_SIGNALS[2].pattern);
    const admissionsHits = hits(text, CATEGORY_SIGNALS[3].pattern);
    const dataHits = hits(text, CATEGORY_SIGNALS[4].pattern);
    const studentHits = hits(text, /\b(international students?|students?)\b/i);

    const visaRelevance = clamp(visaHits * 18 + evidence * 4);
    const postStudyWorkRelevance = clamp(pswHits * 20 + evidence * 3);
    // Deliberately conservative: a single passing mention of "scholarship" must
    // not clear the 60 threshold that unlocks the SCHOLARSHIP category.
    const scholarshipRelevance = clamp(scholarshipHits * 16 + (scholarshipHits > 2 ? 15 : 0));
    const internationalStudentRelevance = clamp(studentHits * 8 + evidence * 6);
    const studyAbroadRelevance = clamp(
      Math.max(visaRelevance, postStudyWorkRelevance, internationalStudentRelevance) * 0.9 +
        evidence * 3
    );

    const strongest = Math.max(studyAbroadRelevance, visaRelevance, postStudyWorkRelevance);
    // Thin documents and no keyword evidence produce low confidence, which is
    // what keeps an unclassifiable item out of the auto-draft lane.
    const confidence = clamp(
      35 + evidence * 12 + Math.min(20, Math.floor(request.fullText.length / 1500)) +
        (strongest > 60 ? 10 : 0)
    );

    const category = this.pickCategory(text, {
      scholarshipRelevance,
      dataHits,
      admissionsHits,
    });

    return {
      raw: {
        studyAbroadRelevance,
        visaRelevance,
        internationalStudentRelevance,
        scholarshipRelevance,
        postStudyWorkRelevance,
        policyImpact: clamp(strongest * 0.8 + (visaHits > 0 ? 15 : 0)),
        urgency: clamp(strongest * 0.5 + (/\b(immediate|with effect from|from \d{1,2} \w+ \d{4})\b/i.test(text) ? 25 : 0)),
        primaryCategory: category,
        secondaryCategories: [],
        affectedDestinations: request.countryCodes,
        affectedNationalities: [],
        effectiveDates: [],
        shortSummary: this.summarize(request),
        recommendedAction:
          strongest >= 75 && confidence >= 85 ? "CREATE_DRAFT" : strongest >= 55 ? "REVIEW" : "IGNORE",
        confidence,
        reasonCodes: this.reasonCodes({ visaHits, pswHits, scholarshipHits, dataHits, strongest }),
        reasoningSummary: `Mock provider: ${request.prefilterMatches.length} deterministic keyword match(es); strongest relevance axis ${strongest}/100.`,
      },
      modelKey: "mock-deterministic-v1",
      promptVersion: PROMPT_VERSION,
    };
  }

  /**
   * The category invariant is enforced downstream by the schema, but the mock
   * respects it here too - otherwise the fixture tests would be proving that
   * the guard works while the mock quietly feeds it clean input.
   */
  private pickCategory(
    text: string,
    context: { scholarshipRelevance: number; dataHits: number; admissionsHits: number }
  ): EditorialCategory {
    for (const signal of CATEGORY_SIGNALS) {
      if (!signal.pattern.test(text)) continue;
      if (signal.category === "SCHOLARSHIP" && context.scholarshipRelevance < 60) {
        continue; // Not funding-specific enough to earn the label.
      }
      return signal.category;
    }
    // EU institutional text with no student signal is EU policy, not "other
    // education news" and emphatically not a scholarship.
    if (
      /\b(European Commission|Commission work programme|Commissioner|Press Corner|Erasmus|EU Council|Member States)\b/i.test(
        text
      )
    ) {
      return "EU_POLICY";
    }
    return "OTHER";
  }

  private summarize(request: AssessmentRequest): string {
    const firstSentence = request.fullText
      .split(/(?<=[.!?])\s+/)
      .find((sentence) => sentence.trim().length > 40);
    return (firstSentence ?? request.title).slice(0, 280).trim();
  }

  private reasonCodes(context: {
    visaHits: number;
    pswHits: number;
    scholarshipHits: number;
    dataHits: number;
    strongest: number;
  }) {
    const codes: string[] = [];
    if (context.visaHits > 0) codes.push("STUDENT_VISA_RULE_CHANGE");
    if (context.pswHits > 0) codes.push("WORK_RIGHTS_CHANGE");
    if (context.scholarshipHits > 2) codes.push("SCHOLARSHIP_OPPORTUNITY");
    if (context.dataHits > 0) codes.push("DATA_RELEASE");
    if (context.strongest < 30) codes.push("NO_STUDENT_IMPACT");
    return codes;
  }
}
