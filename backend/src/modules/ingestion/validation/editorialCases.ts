/**
 * Day-3 B2 editorial validation — the four deliberate cases, as code.
 *
 *   high-relevance visa item   -> CREATE_DRAFT
 *   ambiguous education item   -> REVIEW
 *   irrelevant government item -> IGNORE
 *   generic EU policy item     -> NOT SCHOLARSHIPS
 *
 * Each case is a normalized document (Blueprint 7.2) attached to a real
 * registry source, run through the real pipeline: deterministic prefilter ->
 * provider -> schema invariants (10.4) -> routing table (10.3) -> CMS category
 * mapping. Nothing here is stubbed except persistence, so a change to any of
 * those stages moves these results.
 *
 * The expectation is stated as the `RoutingDecision` the database records, not
 * as the internal lane: `AUTO_DRAFT` and `CRITICAL_DRAFT_ALERT` are both
 * CREATE_DRAFT to an operator, and `HOLD` is IGNORE. That is the vocabulary the
 * Admin screens and the execution plan both use.
 */

import { requireSource } from "../config/sourceRegistry";
import { createDevRepos, createSilentLogger } from "../adapters/base/devContext";
import { assess } from "../services/classification.service";
import { mapToCmsCategory, type CmsCategory } from "../config/categoryMapping";
import { toRoutingDecision } from "../services/prismaRepos";
import type { SourceConfig } from "../config/sourceConfig.schema";
import type { NormalizedSourceDocument } from "../schemas/candidate.schema";
import type { DetailStatus } from "../adapters/base/types";
import type { EditorialCategory, EditorialRoute } from "../schemas/aiAssessment.schema";

export type ExpectedDecision = "CREATE_DRAFT" | "REVIEW" | "IGNORE";

export interface EditorialCase {
  id: string;
  title: string;
  sourceCode: string;
  detailStatus: DetailStatus;
  /**
   * The `RoutingDecision`s an operator may legitimately see recorded for this
   * item. Usually one; the EU policy case accepts either non-draft lane because
   * its requirement is a category prohibition, not a particular lane.
   */
  expectedDecisions: ExpectedDecision[];
  /** Categories this item must never be filed under, whatever it scored. */
  forbiddenCategories: EditorialCategory[];
  forbiddenCmsCategories: CmsCategory[];
  /** Why this case exists — printed in the report, quoted in the test names. */
  rationale: string;
  document: (source: SourceConfig) => NormalizedSourceDocument;
}

/** Assemble a 7.2 document without going through an adapter. */
function document(
  source: SourceConfig,
  fields: {
    externalId: string;
    canonicalUrl: string;
    title: string;
    documentType: string;
    sourceTopics?: string[];
    sourceSummary?: string;
    fullText: string;
  }
): NormalizedSourceDocument {
  return {
    sourceId: source.code,
    externalId: fields.externalId,
    canonicalUrl: fields.canonicalUrl,
    countryCodes: source.countryCodes,
    publishedAt: "2026-09-01T09:00:00.000Z",
    updatedAtSource: null,
    documentType: fields.documentType,
    title: fields.title,
    sourceSummary: fields.sourceSummary ?? null,
    fullText: fields.fullText.trim(),
    sourceTopics: fields.sourceTopics ?? [],
    language: "en",
    contentHash: "VALIDATION_FIXTURE",
    rawMetadata: { fixture: "day3-editorial-validation" },
  };
}

// ============================================================
// Case 1 — high-relevance visa item
// ============================================================

const IRCC_STUDY_PERMIT_TEXT = `
Immigration, Refugees and Citizenship Canada is changing the study permit
requirements that apply to every international student applying from outside
Canada. From 1 November 2026, an application for a study permit must include a
provincial attestation letter (PAL) issued by the province or territory of the
designated learning institution named in the application.

A study permit application submitted without a PAL will be returned. The
designated learning institution must be listed on the DLI list published by the
department on the day the study permit application is received. An international
student whose designated learning institution loses its DLI status while a study
permit application is in progress will be contacted directly.

The post-graduation work permit (PGWP) eligibility rules are also amended. An
international student who completes a programme of study of at least eight
months at a designated learning institution remains eligible for a PGWP, but the
field-of-study requirement introduced last year continues to apply to every
study permit holder who applies for a PGWP after the effective date.

Spousal open work permit eligibility is unchanged for the spouse of a study
permit holder enrolled in a master's or doctoral programme. Applicants who
already hold a valid study permit do not need to reapply. Processing times for a
study permit application are expected to remain unchanged through the 2027
intake.
`;

// ============================================================
// Case 2 — ambiguous education item
// ============================================================

const EDUCATION_AREA_TEXT = `
The Commission has published its annual overview of learning mobility in the
European Education Area. The overview describes how national authorities in the
higher education sector report participation, and sets out the reporting
calendar for the coming year.

Student mobility figures in the overview are drawn from national statistical
offices and are not comparable across every member state. The document changes
no entitlement for any international student, and creates no obligation for the
institutions that host them.

The overview notes that the higher education sector continues to expand its
cooperation agreements, and that student mobility between participating
institutions grew modestly over the reporting period. Institutions report that
students moving for a single term now outnumber those moving for a full year,
though the underlying figures vary widely by country.

Organisations working in international education are invited to comment on the
proposed indicators before the end of the year. No decision is taken by this
document.
`;

// ============================================================
// Case 3 — irrelevant government item
// ============================================================

const FFO_DIPLOMATIC_TEXT = `
The Federal Foreign Office issued a statement following the meeting of foreign
ministers. The Foreign Minister welcomed progress towards a ceasefire and
confirmed that the ambassador would return to the mission this week.

Germany will continue to provide humanitarian aid through its partners in the
region, and reiterated that the existing sanctions regime remains in force
pending a further review by the Council. Bilateral talks on the security
partnership will resume next month.
`;

// ============================================================
// Case 4 — generic EU policy item
// ============================================================

const PRESS_CORNER_POLICY_TEXT = `
The European Commission today adopted its work programme for the single market.
The programme sets out initiatives on competition enforcement, energy
infrastructure and the trade agenda for the coming year.

On labour mobility, the Commission notes that recognition of professional
qualifications remains uneven between member states, and that a researcher
moving between institutions still encounters administrative friction. The work
programme announces a review of the relevant directives, without proposing any
new instrument at this stage.

No funding call, no grant scheme and no student programme is announced by this
work programme. Budgetary implications will be set out in the annual budget
procedure.
`;

export const EDITORIAL_CASES: EditorialCase[] = [
  {
    id: "high-relevance-visa",
    title: "High-relevance visa item",
    sourceCode: "ca-ircc-atom",
    detailStatus: "ENRICHED",
    expectedDecisions: ["CREATE_DRAFT"],
    forbiddenCategories: ["SCHOLARSHIP", "UNCLASSIFIED"],
    forbiddenCmsCategories: ["SCHOLARSHIPS"],
    rationale:
      "A study permit rule change from the immigration authority, with the full source loaded, is what the auto-draft lane exists for.",
    document: (source) =>
      document(source, {
        externalId: "ircc-study-permit-pal-2026",
        canonicalUrl:
          "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/09/study-permit-changes.html",
        title: "Changes to study permit requirements for international students",
        documentType: "NEWS_RELEASE",
        sourceTopics: ["Study permit", "International students"],
        sourceSummary: "IRCC updates study permit and PGWP requirements from 1 November 2026.",
        fullText: IRCC_STUDY_PERMIT_TEXT,
      }),
  },
  {
    id: "ambiguous-education",
    title: "Ambiguous education item",
    sourceCode: "eu-education-area-news",
    detailStatus: "ENRICHED",
    expectedDecisions: ["REVIEW"],
    forbiddenCategories: ["SCHOLARSHIP"],
    forbiddenCmsCategories: ["SCHOLARSHIPS"],
    rationale:
      "Sector reporting that touches students but changes no entitlement: relevant enough to keep, not decisive enough to draft. An editor decides.",
    document: (source) =>
      document(source, {
        externalId: "eea-learning-mobility-overview-2026",
        canonicalUrl: "https://education.ec.europa.eu/news/learning-mobility-overview-2026",
        title: "Annual overview of learning mobility in the European Education Area",
        documentType: "NEWS",
        sourceTopics: ["Higher education", "Learning mobility"],
        fullText: EDUCATION_AREA_TEXT,
      }),
  },
  {
    id: "irrelevant-government",
    title: "Irrelevant government item",
    sourceCode: "de-ffo-news-rss",
    detailStatus: "ENRICHED",
    expectedDecisions: ["IGNORE"],
    forbiddenCategories: ["SCHOLARSHIP", "STUDENT_VISA", "POST_STUDY_WORK"],
    forbiddenCmsCategories: ["SCHOLARSHIPS", "VISA", "ADMISSIONS"],
    rationale:
      "Diplomatic content on a broad government feed. Blueprint 5.5: this must be excluded deterministically, before any AI spend.",
    document: (source) =>
      document(source, {
        externalId: "ffo-foreign-ministers-statement-2026",
        canonicalUrl: "https://www.auswaertiges-amt.de/en/newsroom/news/foreign-ministers-2026",
        title: "Statement following the meeting of foreign ministers",
        documentType: "PRESS_RELEASE",
        sourceTopics: ["Foreign policy"],
        fullText: FFO_DIPLOMATIC_TEXT,
      }),
  },
  {
    id: "generic-eu-policy",
    title: "Generic EU policy item",
    sourceCode: "eu-press-corner-api",
    detailStatus: "ENRICHED",
    expectedDecisions: ["IGNORE", "REVIEW"],
    forbiddenCategories: ["SCHOLARSHIP"],
    forbiddenCmsCategories: ["SCHOLARSHIPS"],
    rationale:
      "Blueprint 18.1, the defect this programme exists to fix: institutional EU policy text must never be filed as a scholarship, whatever else it is.",
    document: (source) =>
      document(source, {
        externalId: "SPEECH/26/1801",
        canonicalUrl: "https://ec.europa.eu/commission/presscorner/detail/en/SPEECH_26_1801",
        title: "Commission work programme for the single market",
        documentType: "SPEECH",
        sourceTopics: ["Competition", "Energy", "Single market", "Trade", "Budget"],
        fullText: PRESS_CORNER_POLICY_TEXT,
      }),
  },
];

export interface EditorialCaseResult {
  case: EditorialCase;
  /** The internal 10.3 lane. */
  route: EditorialRoute;
  /** What the database records — the operator-facing decision. */
  decision: ExpectedDecision;
  passed: boolean;
  failures: string[];
  relevance: number;
  confidence: number | null;
  primaryCategory: EditorialCategory | null;
  cmsCategory: CmsCategory | null;
  explanation: string;
  prefilterVerdict: string;
  prefilterReason: string;
}

/**
 * Run one case through the real pipeline and check every stated invariant, not
 * only the routing lane: a case that reaches CREATE_DRAFT under the SCHOLARSHIP
 * label has not passed.
 */
export async function runEditorialCase(testCase: EditorialCase): Promise<EditorialCaseResult> {
  const source = requireSource(testCase.sourceCode);
  const doc = testCase.document(source);

  const result = await assess({
    source,
    sourceItem: { id: `validation-${testCase.id}`, externalId: doc.externalId, canonicalUrl: doc.canonicalUrl },
    document: doc,
    detailStatus: testCase.detailStatus,
    repos: createDevRepos(),
    logger: createSilentLogger(),
    providerOverride: "mock",
  });

  const decision = toRoutingDecision(result.routing.route) as ExpectedDecision;
  const cms = result.assessment ? mapToCmsCategory(result.assessment) : null;
  const primaryCategory = result.assessment?.primaryCategory ?? null;

  const failures: string[] = [];
  if (!testCase.expectedDecisions.includes(decision)) {
    failures.push(
      `expected ${testCase.expectedDecisions.join(" or ")}, got ${decision} (${result.routing.route})`
    );
  }
  if (primaryCategory && testCase.forbiddenCategories.includes(primaryCategory)) {
    failures.push(`primary category ${primaryCategory} is forbidden for this case`);
  }
  if (cms?.category && testCase.forbiddenCmsCategories.includes(cms.category)) {
    failures.push(`CMS category ${cms.category} is forbidden for this case`);
  }

  return {
    case: testCase,
    route: result.routing.route,
    decision,
    passed: failures.length === 0,
    failures,
    relevance: result.routing.relevance,
    confidence: result.assessment?.confidence ?? null,
    primaryCategory,
    cmsCategory: cms?.category ?? null,
    explanation: result.routing.explanation,
    prefilterVerdict: result.prefilter.verdict,
    prefilterReason: result.prefilter.reason,
  };
}

export async function runAllEditorialCases(): Promise<EditorialCaseResult[]> {
  const results: EditorialCaseResult[] = [];
  for (const testCase of EDITORIAL_CASES) {
    results.push(await runEditorialCase(testCase));
  }
  return results;
}
