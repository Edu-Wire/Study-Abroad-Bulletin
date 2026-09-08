/**
 * Pipeline tests: prefilter -> assessment -> invariants -> routing -> candidate.
 *
 * Run: `npx tsx --test backend/src/modules/ingestion/__tests__/*.test.ts`
 *
 * The first test is the Blueprint 18.1 scenario and the reason this programme
 * exists: an EU Press Corner speech about competition and energy must not be
 * published as a scholarship.
 */

process.env.INGESTION_DEV_CONTEXT = "1";
process.env.AI_PROVIDER = "mock";

import assert from "node:assert/strict";
import { test } from "node:test";

import { createAdapter } from "../adapters/index";
import { createDevContext, createDevRepos, createSilentLogger } from "../adapters/base/devContext";
import { requireSource } from "../config/sourceRegistry";
import { assess } from "../services/classification.service";
import { createOrUpdateCandidate, promoteToArticleDraft } from "../services/candidate.service";
import { mapToCmsCategory } from "../config/categoryMapping";
import { decideRoute } from "../ai/routing.policy";
import { enforceCategoryInvariants, type AiAssessmentOutput } from "../schemas/aiAssessment.schema";
import { runPrefilter } from "../ai/prefilter.rules";
import { PRESS_CORNER_DOCUMENT, PRESS_CORNER_SEARCH } from "./fixtures";
import type { NormalizedSourceDocument } from "../schemas/candidate.schema";

const PRESS_CORNER_FIXTURES = {
  "https://ec.europa.eu/commission/presscorner/api/search": PRESS_CORNER_SEARCH,
  "https://ec.europa.eu/commission/presscorner/api/documents": PRESS_CORNER_DOCUMENT,
};

async function pressCornerDocument(): Promise<NormalizedSourceDocument> {
  const source = requireSource("eu-press-corner-api");
  const adapter = createAdapter(source);
  const ctx = createDevContext({ source, fixtures: PRESS_CORNER_FIXTURES });

  const page = await adapter.discover(ctx);
  const item = page.items[0];
  const detail = await adapter.fetchDetail(item, ctx);
  return adapter.normalize(detail, item, ctx);
}

test("18.1: a von der Leyen speech routes to EU_POLICY, never SCHOLARSHIPS", async () => {
  const source = requireSource("eu-press-corner-api");
  const document = await pressCornerDocument();
  const repos = createDevRepos();

  const result = await assess({
    source,
    sourceItem: {
      id: "item-speech-26-1765",
      externalId: document.externalId,
      canonicalUrl: document.canonicalUrl,
    },
    document,
    detailStatus: "ENRICHED",
    repos,
    logger: createSilentLogger(),
  });

  assert.ok(result.assessment, "the item must reach assessment, not be filtered away");
  assert.notEqual(result.assessment.primaryCategory, "SCHOLARSHIP");
  assert.ok(
    ["EU_POLICY", "OTHER", "UNCLASSIFIED"].includes(result.assessment.primaryCategory),
    `institutional speech should not claim a student category (got ${result.assessment.primaryCategory})`
  );
  assert.ok(
    ["IGNORE", "HOLD", "REVIEW"].includes(result.routing.route),
    `low student relevance must not auto-draft (got ${result.routing.route})`
  );

  // Native policy areas stay source metadata and never become our category.
  assert.deepEqual(document.sourceTopics, [
    "Competition",
    "Energy",
    "Budget",
    "Single market",
    "Trade",
  ]);
  const decision = mapToCmsCategory(result.assessment);
  assert.equal(decision.category, null, "an EU policy speech has no automatic CMS category");
  assert.equal(decision.autoDraftable, false);
});

test("a low-confidence SCHOLARSHIP claim is rewritten to UNCLASSIFIED, not accepted", () => {
  const proposed: AiAssessmentOutput = {
    studyAbroadRelevance: 24,
    visaRelevance: 10,
    internationalStudentRelevance: 12,
    scholarshipRelevance: 8,
    postStudyWorkRelevance: 5,
    policyImpact: 72,
    urgency: 30,
    primaryCategory: "SCHOLARSHIP",
    secondaryCategories: [],
    affectedDestinations: ["EU"],
    affectedNationalities: [],
    effectiveDates: [],
    shortSummary: "Speech on competition policy.",
    recommendedAction: "CREATE_DRAFT",
    confidence: 41,
    reasonCodes: [],
  };

  const guarded = enforceCategoryInvariants(proposed);

  assert.equal(guarded.primaryCategory, "UNCLASSIFIED");
  assert.equal(guarded.recommendedAction, "REVIEW");
  assert.ok(guarded.reasonCodes.includes("LOW_CONFIDENCE"));
  assert.equal(mapToCmsCategory(guarded).category, null);
});

test("a high-relevance, high-confidence scholarship item keeps its label", () => {
  const proposed: AiAssessmentOutput = {
    studyAbroadRelevance: 88,
    visaRelevance: 20,
    internationalStudentRelevance: 85,
    scholarshipRelevance: 91,
    postStudyWorkRelevance: 10,
    policyImpact: 40,
    urgency: 60,
    primaryCategory: "SCHOLARSHIP",
    secondaryCategories: [],
    affectedDestinations: ["DE"],
    affectedNationalities: [],
    effectiveDates: [],
    shortSummary: "DAAD opens applications for 2027 masters scholarships.",
    recommendedAction: "CREATE_DRAFT",
    confidence: 92,
    reasonCodes: ["SCHOLARSHIP_OPPORTUNITY"],
  };

  const guarded = enforceCategoryInvariants(proposed);

  assert.equal(guarded.primaryCategory, "SCHOLARSHIP");
  assert.equal(mapToCmsCategory(guarded).category, "SCHOLARSHIPS");
});

test("routing refuses to auto-draft when the full source was not loaded (10.4)", () => {
  const assessment: AiAssessmentOutput = {
    studyAbroadRelevance: 92,
    visaRelevance: 88,
    internationalStudentRelevance: 90,
    scholarshipRelevance: 5,
    postStudyWorkRelevance: 40,
    policyImpact: 80,
    urgency: 70,
    primaryCategory: "STUDENT_VISA",
    secondaryCategories: [],
    affectedDestinations: ["CA"],
    affectedNationalities: [],
    effectiveDates: [],
    shortSummary: "Study permit financial requirement rises in 2027.",
    recommendedAction: "CREATE_DRAFT",
    confidence: 93,
    reasonCodes: [],
  };

  assert.equal(decideRoute({ assessment, detailStatus: "ENRICHED" }).route, "CRITICAL_DRAFT_ALERT");
  assert.equal(decideRoute({ assessment, detailStatus: "FAILED" }).route, "REVIEW");
  assert.equal(decideRoute({ assessment, detailStatus: "PARTIAL" }).route, "REVIEW");
});

test("the deterministic prefilter spends no AI budget on FFO diplomatic content", () => {
  const source = requireSource("de-ffo-news-rss");
  const document: NormalizedSourceDocument = {
    sourceId: source.code,
    externalId: "ffo-1",
    canonicalUrl: "https://www.auswaertiges-amt.de/en/newsroom/news/ffo-1",
    countryCodes: ["DE"],
    publishedAt: "2026-08-20T10:00:00.000Z",
    updatedAtSource: null,
    documentType: "Press release",
    title: "Foreign Minister meets counterparts on peace talks",
    sourceSummary: null,
    fullText:
      "The Foreign Minister today met counterparts to discuss the peace process and the humanitarian aid corridor. Sanctions policy was also on the agenda, alongside the deployment of peacekeeping personnel.",
    sourceTopics: [],
    language: "en",
    contentHash: "PENDING_PIPELINE_HASH",
    rawMetadata: {},
  };

  const verdict = runPrefilter(source, document);

  assert.equal(verdict.verdict, "HARD_EXCLUDE");
  assert.ok(verdict.reasonCodes.includes("NO_STUDENT_IMPACT"));
});

test("candidate creation is idempotent by source item", async () => {
  const source = requireSource("eu-press-corner-api");
  const document = await pressCornerDocument();
  const repos = createDevRepos();
  const logger = createSilentLogger();
  const sourceItem = {
    id: "item-speech-26-1765",
    externalId: document.externalId,
    canonicalUrl: document.canonicalUrl,
  };

  const assessment = enforceCategoryInvariants({
    studyAbroadRelevance: 60,
    visaRelevance: 30,
    internationalStudentRelevance: 55,
    scholarshipRelevance: 5,
    postStudyWorkRelevance: 10,
    policyImpact: 70,
    urgency: 40,
    primaryCategory: "EU_POLICY",
    secondaryCategories: [],
    affectedDestinations: ["EU"],
    affectedNationalities: [],
    effectiveDates: [],
    shortSummary: "Speech on competitiveness and mobility.",
    recommendedAction: "REVIEW",
    confidence: 80,
    reasonCodes: [],
  });

  const first = await createOrUpdateCandidate({
    source,
    sourceItem,
    document,
    assessment,
    route: "REVIEW",
    repos,
    logger,
  });
  const second = await createOrUpdateCandidate({
    source,
    sourceItem,
    document,
    assessment,
    route: "REVIEW",
    repos,
    logger,
  });

  assert.equal(first.candidateId, second.candidateId, "a re-run must update, not duplicate");
  assert.equal(second.status, "AWAITING_REVIEW");
});

test("a source change after a candidate exists marks it SOURCE_UPDATED (11.2)", async () => {
  const source = requireSource("eu-press-corner-api");
  const document = await pressCornerDocument();
  const repos = createDevRepos();
  const logger = createSilentLogger();
  const sourceItem = {
    id: "item-changed",
    externalId: document.externalId,
    canonicalUrl: document.canonicalUrl,
  };
  const assessment = enforceCategoryInvariants({
    studyAbroadRelevance: 70,
    visaRelevance: 65,
    internationalStudentRelevance: 70,
    scholarshipRelevance: 0,
    postStudyWorkRelevance: 20,
    policyImpact: 60,
    urgency: 50,
    primaryCategory: "IMMIGRATION_POLICY",
    secondaryCategories: [],
    affectedDestinations: ["EU"],
    affectedNationalities: [],
    effectiveDates: [],
    shortSummary: "Legal migration package update.",
    recommendedAction: "REVIEW",
    confidence: 85,
    reasonCodes: [],
  });

  await createOrUpdateCandidate({ source, sourceItem, document, assessment, route: "REVIEW", repos, logger });
  const updated = await createOrUpdateCandidate({
    source,
    sourceItem,
    document,
    assessment,
    route: "REVIEW",
    repos,
    logger,
    sourceChanged: true,
    version: { id: "v2", hash: "sha256:newer" },
  });

  assert.equal(updated.status, "SOURCE_UPDATED");
});

test("promotion always writes status DRAFT and links the source (10.3)", async () => {
  const source = requireSource("ca-ircc-atom");
  const repos = createDevRepos();
  const logger = createSilentLogger();

  const document: NormalizedSourceDocument = {
    sourceId: source.code,
    externalId: "ircc-1",
    canonicalUrl: "https://www.canada.ca/en/news/study-permit-update.html",
    countryCodes: ["CA"],
    publishedAt: "2026-08-28T13:00:00.000Z",
    updatedAtSource: null,
    documentType: "NEWS_RELEASE",
    title: "Canada updates study permit financial requirement for 2027",
    sourceSummary: "IRCC announced changes.",
    fullText:
      "IRCC is updating the cost-of-living requirement for study permit applicants. Effective 1 January 2027, a single applicant must show CAD 22,895 in available funds.",
    sourceTopics: ["Immigration"],
    language: "en",
    contentHash: "PENDING_PIPELINE_HASH",
    rawMetadata: {},
  };

  const assessment = enforceCategoryInvariants({
    studyAbroadRelevance: 95,
    visaRelevance: 92,
    internationalStudentRelevance: 96,
    scholarshipRelevance: 4,
    postStudyWorkRelevance: 30,
    policyImpact: 85,
    urgency: 80,
    primaryCategory: "STUDENT_VISA",
    secondaryCategories: [],
    affectedDestinations: ["CA"],
    affectedNationalities: [],
    effectiveDates: [{ raw: "1 January 2027", date: "2027-01-01", kind: "EFFECTIVE_FROM" }],
    shortSummary: "Study permit funds requirement rises to CAD 22,895.",
    recommendedAction: "CREATE_DRAFT",
    confidence: 94,
    reasonCodes: ["FEE_CHANGE"],
  });

  const candidate = await createOrUpdateCandidate({
    source,
    sourceItem: { id: "item-ircc-1", externalId: "ircc-1", canonicalUrl: document.canonicalUrl },
    document,
    assessment,
    route: "CRITICAL_DRAFT_ALERT",
    repos,
    logger,
  });

  assert.equal(candidate.draftPayload.category, "VISA");
  assert.equal(candidate.draftPayload.primaryCountryId, "country-CA");
  assert.match(candidate.draftPayload.slug, /^ca-ircc-atom-canada-updates-study-permit/);
  assert.ok(candidate.draftPayload.readingTime >= 1);

  const article = await promoteToArticleDraft(candidate.candidateId, {
    candidate,
    sourceItemId: "item-ircc-1",
    sourceVersionId: "v1",
    repos,
    logger,
    actor: { id: "editor-1", kind: "USER" },
  });

  assert.ok(article.id);
  const written = repos.writes.articles[0] as Record<string, unknown>;
  assert.equal(written.status, "DRAFT");
  assert.equal(repos.writes.links.length, 1);
  assert.equal(
    (repos.writes.links[0] as Record<string, unknown>).relationType,
    "ORIGIN"
  );
});

test("no code path in the candidate service can write PUBLISHED", async () => {
  // A structural assertion, not a behavioural one: the string must not appear
  // as a writable status anywhere in the service.
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");

  const here = dirname(fileURLToPath(import.meta.url));
  const service = readFileSync(resolve(here, "../services/candidate.service.ts"), "utf8");

  const assignments = service.match(/status:\s*["'`]([A-Z_]+)["'`]/g) ?? [];
  assert.ok(assignments.length > 0, "expected at least one status assignment");
  for (const assignment of assignments) {
    assert.doesNotMatch(assignment, /PUBLISHED/, `found a PUBLISHED write: ${assignment}`);
  }
  assert.ok(assignments.some((a) => a.includes("DRAFT")));
});
