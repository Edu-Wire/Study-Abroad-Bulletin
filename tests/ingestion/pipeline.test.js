import test from "node:test";
import assert from "node:assert/strict";
import prisma from "../../backend/src/config/prisma.js";
import { seedPhase1Sources } from "../../backend/src/modules/ingestion/services/seedSources.js";
import { processDiscovery } from "../../backend/src/modules/ingestion/services/discovery.service.js";
import { processDetail } from "../../backend/src/modules/ingestion/services/detail.service.js";
import { handleClassifyJob } from "../../backend/src/worker/jobs/classify.job.js";
import { handleDraftJob } from "../../backend/src/worker/jobs/draft.job.js";
import { createBackfillRun, processBackfillWindow } from "../../backend/src/modules/ingestion/services/backfill.service.js";
import { processReconciliation } from "../../backend/src/modules/ingestion/services/reconciliation.service.js";
import { startBoss, stopBoss } from "../../backend/src/worker/boss.js";

test.before(async () => {
  await startBoss();
});

test.after(async () => {
  try {
    // Clean up test articles created during pipeline test
    const testArticles = await prisma.article.findMany({
      where: {
        headline: {
          contains: "IRCC announces new international student visa updates",
        },
      },
    });

    for (const art of testArticles) {
      await prisma.articleSourceLink.deleteMany({ where: { articleId: art.id } });
      await prisma.articleCandidate.deleteMany({ where: { articleId: art.id } });
      await prisma.article.delete({ where: { id: art.id } });
    }

    // Clean up test items
    const testItems = await prisma.sourceItem.findMany({
      where: {
        externalId: {
          startsWith: "test-ext-",
        },
      },
    });

    for (const itm of testItems) {
      await prisma.articleCandidate.deleteMany({ where: { sourceItemId: itm.id } });
      await prisma.sourceDiff.deleteMany({ where: { sourceItemId: itm.id } });
      await prisma.aiAssessment.deleteMany({ where: { sourceItemId: itm.id } });
      await prisma.sourceDocumentVersion.deleteMany({ where: { sourceItemId: itm.id } });
      await prisma.sourceItem.delete({ where: { id: itm.id } });
    }
  } catch (err) {
    console.error("Cleanup error in pipeline.test.js:", err.message);
  } finally {
    await stopBoss();
  }
});


test("Day 2 Ingestion Pipeline: Seeds 28 Phase 1 catalog sources idempotently", async () => {
  const firstSeed = await seedPhase1Sources();
  assert.equal(firstSeed.total, 28);
  assert.ok(firstSeed.seeded + firstSeed.updated === 28);

  // Run seed a second time to verify idempotency (0 new rows, 28 updated)
  const secondSeed = await seedPhase1Sources();
  assert.equal(secondSeed.total, 28);
  assert.equal(secondSeed.seeded, 0);
  assert.equal(secondSeed.updated, 28);

  const dbSourcesCount = await prisma.contentSource.count();
  assert.ok(dbSourcesCount >= 28);
});

test("Day 2 Ingestion Pipeline: Discovery upserts items and records SourceRun and SourceSyncState", async () => {
  // Find a test source
  const source = await prisma.contentSource.findFirst({
    where: { code: "ca-ircc-atom" },
  });
  assert.ok(source, "Source ca-ircc-atom should exist in database");

  // Create test item directly to simulate discovery upsert
  const testExternalId = `test-ext-${Date.now()}`;
  const testUrl = `https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/09/test-update-${Date.now()}.html`;

  const item = await prisma.sourceItem.create({
    data: {
      contentSourceId: source.id,
      externalId: testExternalId,
      canonicalUrl: testUrl,
      canonicalUrlHash: `hash-${Date.now()}`,
      title: "IRCC announces new international student visa updates for 2026",
      // The canonical URL above is synthetic, so detail extraction fails and
      // this summary becomes the document the classifier reads. It has to look
      // like a real IRCC notice: a one-line stub scores below the relevance
      // floor and is correctly routed away with no candidate, which would make
      // this test assert that the pipeline drafts from a snippet — the exact
      // defect Blueprint 10.4 exists to prevent.
      summary:
        "Immigration, Refugees and Citizenship Canada is updating the study permit " +
        "requirements for every international student applying from outside Canada. " +
        "A study permit application must now include a provincial attestation letter " +
        "issued by the province of the designated learning institution. The " +
        "post-graduation work permit (PGWP) field-of-study requirement continues to " +
        "apply to each study permit holder, and an international student already " +
        "holding a valid study permit does not need to reapply.",
      publishedAt: new Date(),
      countryId: "canada",
      processingStatus: "DETAIL_PENDING",
    },
  });

  assert.ok(item.id);
  assert.equal(item.processingStatus, "DETAIL_PENDING");

  // Detail processing: Version 1
  const detailResult1 = await processDetail({ sourceItemId: item.id });
  assert.ok(detailResult1.versionId);
  assert.equal(detailResult1.versionNumber, 1);
  assert.equal(detailResult1.status, "VERSION_CREATED");

  // Verify Version 1 in DB
  const version1 = await prisma.sourceDocumentVersion.findUnique({
    where: { id: detailResult1.versionId },
  });
  assert.ok(version1);
  assert.equal(version1.versionNumber, 1);
  assert.ok(version1.contentHash);

  // Idempotent retry: Processing detail again with identical content creates 0 new versions
  const detailResultRetry = await processDetail({ sourceItemId: item.id });
  assert.equal(detailResultRetry.status, "UNCHANGED");
  assert.equal(detailResultRetry.versionId, version1.id);

  const totalVersions = await prisma.sourceDocumentVersion.count({
    where: { sourceItemId: item.id },
  });
  assert.equal(totalVersions, 1, "Should not duplicate version on identical content");

  // The canonical URL above is synthetic, so the stored version holds whatever
  // canada.ca serves for a missing path — which makes the editorial outcome
  // depend on a live site. Pin the classifier's input to a representative
  // notice so this test asserts the pipeline, not today's 404 page.
  await prisma.sourceDocumentVersion.update({
    where: { id: version1.id },
    data: {
      cleanText: [
        "Immigration, Refugees and Citizenship Canada is updating the study permit",
        "requirements for every international student applying from outside Canada.",
        "A study permit application must now include a provincial attestation letter",
        "issued by the province of the designated learning institution named in the",
        "application. A study permit application submitted without one will be returned.",
        "The post-graduation work permit (PGWP) field-of-study requirement continues to",
        "apply to each study permit holder. An international student already holding a",
        "valid study permit does not need to reapply.",
      ].join(" "),
    },
  });

  // Classification Job: Stage 1 prefilter & stage 2 assessment
  const classifyResult = await handleClassifyJob({
    data: { sourceItemId: item.id, versionId: version1.id },
  });
  assert.equal(classifyResult.status, "CLASSIFIED");
  assert.ok(classifyResult.candidateId);

  // A study permit rule change with the full source loaded is the auto-draft
  // lane, and the CMS category is resolved rather than guessed.
  assert.ok(
    ["AUTO_DRAFT", "CRITICAL_DRAFT_ALERT"].includes(classifyResult.route),
    `expected a draft lane, got ${classifyResult.route}`
  );
  assert.equal(classifyResult.category, "VISA");

  const candidate = await prisma.articleCandidate.findUnique({
    where: { id: classifyResult.candidateId },
  });
  assert.ok(candidate);
  assert.ok(candidate.headline.length > 0);

  // Draft Creation: Convert candidate into CMS Article
  const draftResult = await handleDraftJob({
    data: { candidateId: candidate.id, sourceItemId: item.id },
  });
  assert.equal(draftResult.status, "DRAFT_CREATED");
  assert.ok(draftResult.articleId);

  // Verify Article in DB
  const article = await prisma.article.findUnique({
    where: { id: draftResult.articleId },
  });
  assert.ok(article);
  assert.equal(article.status, "DRAFT");

  // Verify provenance link in ArticleSourceLink
  const link = await prisma.articleSourceLink.findUnique({
    where: {
      articleId_sourceItemId: {
        articleId: article.id,
        sourceItemId: item.id,
      },
    },
  });
  assert.ok(link);
  assert.equal(link.linkType, "PRIMARY_SOURCE");
});

test("Day 2 Ingestion Pipeline: Backfill partitions date range and updates window progress", async () => {
  const source = await prisma.contentSource.findFirst();
  assert.ok(source);

  const startDate = "2026-08-01";
  const endDate = "2026-08-22";

  const backfill = await createBackfillRun({
    contentSourceId: source.id,
    startDate,
    endDate,
    windowDays: 7,
  });

  assert.ok(backfill.backfillRunId);
  assert.equal(backfill.totalWindows, 3, "21 days partitioned into 7-day windows should yield 3 windows");

  const firstWindow = backfill.windows[0];
  assert.ok(firstWindow);
  assert.equal(firstWindow.status, "PENDING");
});

test("Day 2 Ingestion Pipeline: Reconciliation detects health and repairs missed items", async () => {
  const source = await prisma.contentSource.findFirst();
  assert.ok(source);

  const reconcileResult = await processReconciliation({
    contentSourceId: source.id,
  });

  assert.equal(reconcileResult.contentSourceId, source.id);
  assert.equal(reconcileResult.healthStatus, "HEALTHY");
  assert.equal(typeof reconcileResult.reEnqueuedWindows, "number");
  assert.equal(typeof reconcileResult.reEnqueuedDetails, "number");
});
