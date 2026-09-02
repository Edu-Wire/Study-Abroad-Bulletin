/**
 * Adapter contract tests (Blueprint 16.1) - recorded fixtures, no live network.
 *
 * Run: `npx tsx --test backend/src/modules/ingestion/__tests__/*.test.ts`
 *
 * One test per family, asserting the things the pipeline downstream depends on:
 * external id, title, publishedAt, canonical URL, full-text completeness, native
 * topics, and - the one that matters most - that a feed summary never becomes
 * the article body.
 */

process.env.INGESTION_DEV_CONTEXT = "1";

import assert from "node:assert/strict";
import { test } from "node:test";

import { createAdapter } from "../adapters/index";
import { createDevContext } from "../adapters/base/devContext";
import { requireSource } from "../config/sourceRegistry";
import {
  GOVUK_CONTENT,
  GOVUK_SEARCH,
  INZ_DETAIL_HTML,
  INZ_LISTING_HTML,
  IRCC_ATOM,
  IRCC_DETAIL_HTML,
  PRESS_CORNER_DOCUMENT,
  PRESS_CORNER_SEARCH,
  SUBCLASS_500_HTML,
} from "./fixtures";

test("RSS_ATOM: IRCC Atom discovery maps entry id, link and dates", async () => {
  const source = requireSource("ca-ircc-atom");
  const adapter = createAdapter(source);
  const ctx = createDevContext({
    source,
    fixtures: {
      "https://api.io.canada.ca/io-server/gc/news/en/v2": IRCC_ATOM,
      "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/08/study-permit-update.html":
        IRCC_DETAIL_HTML,
    },
  });

  const page = await adapter.discover(ctx);

  assert.equal(page.items.length, 2);
  const [first] = page.items;
  assert.equal(first.externalId, "https://api.io.canada.ca/io-server/gc/news/en/v2?id=1a2b3c");
  assert.equal(first.title, "Canada updates study permit financial requirement for 2027");
  assert.equal(first.publishedAt, "2026-08-28T13:00:00.000Z");
  assert.equal(
    first.canonicalUrl,
    "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/08/study-permit-update.html"
  );
  assert.deepEqual(first.sourceTopics, ["Immigration"]);
  assert.equal(page.sourceWatermark, "2026-08-28T13:00:00.000Z");
});

test("RSS_ATOM: the feed summary never becomes the article body (7.1)", async () => {
  const source = requireSource("ca-ircc-atom");
  const adapter = createAdapter(source);
  const ctx = createDevContext({
    source,
    fixtures: {
      "https://api.io.canada.ca/io-server/gc/news/en/v2": IRCC_ATOM,
      "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/08/study-permit-update.html":
        IRCC_DETAIL_HTML,
    },
  });

  const page = await adapter.discover(ctx);
  const item = page.items[0];
  const detail = await adapter.fetchDetail(item, ctx);
  const document = await adapter.normalize(detail, item, ctx);

  assert.equal(detail.detailStatus, "ENRICHED");
  // The summary is preserved separately and is NOT the body.
  assert.match(document.sourceSummary ?? "", /cost-of-living requirement/);
  assert.notEqual(document.fullText, document.sourceSummary);
  assert.ok(document.fullText.length > (document.sourceSummary ?? "").length * 3);
  // Content only the detail page carries.
  assert.match(document.fullText, /CAD 22,895/);
  assert.match(document.fullText, /provincial attestation letter/);
  // Chrome is stripped.
  assert.doesNotMatch(document.fullText, /Skip to main content/);
});

test("RSS_ATOM: a 304 is 'nothing new', not zero items", async () => {
  const source = requireSource("ca-ircc-atom");
  const adapter = createAdapter(source);
  const ctx = createDevContext({
    source,
    fixtures: { "https://api.io.canada.ca": IRCC_ATOM },
    syncState: { etag: 'W/"abc123"', watermarkAt: "2026-08-28T13:00:00.000Z" },
    notModified: true,
  });

  const page = await adapter.discover(ctx);

  assert.equal(page.notModified, true);
  assert.equal(page.items.length, 0);
  assert.equal(page.sourceWatermark, "2026-08-28T13:00:00.000Z");
});

test("JSON_API: GOV.UK search discovers by content_id and detail concatenates parts", async () => {
  const source = requireSource("uk-govuk-search-api");
  const adapter = createAdapter(source);
  const ctx = createDevContext({
    source,
    fixtures: {
      "https://www.gov.uk/api/search.json": GOVUK_SEARCH,
      "https://www.gov.uk/api/content/student-visa": GOVUK_CONTENT,
    },
  });

  const page = await adapter.discover(ctx);
  assert.equal(page.items.length, 2);

  const [first] = page.items;
  assert.equal(first.externalId, "b7d4c2a1-0000-4f11-9c33-aaaabbbbcccc");
  assert.equal(first.canonicalUrl, "https://www.gov.uk/student-visa");
  assert.equal(first.discoveryRaw?.basePath, "/student-visa");

  const detail = await adapter.fetchDetail(first, ctx);
  const document = await adapter.normalize(detail, first, ctx);

  // Both parts must be present: a guide's landing section alone is not the body.
  assert.match(document.fullText, /16 or over/);
  assert.match(document.fullText, /£1,483 per month/);
  assert.deepEqual(document.sourceTopics, ["Student visas", "Visas and immigration"]);
  // 5.2: the PDF URL is retained as evidence, not parsed.
  assert.ok(Array.isArray(document.rawMetadata.attachments));
});

test("JSON_API: EU Press Corner uses refCode identity and htmlContent as the body", async () => {
  const source = requireSource("eu-press-corner-api");
  const adapter = createAdapter(source);
  const ctx = createDevContext({
    source,
    fixtures: {
      "https://ec.europa.eu/commission/presscorner/api/search": PRESS_CORNER_SEARCH,
      "https://ec.europa.eu/commission/presscorner/api/documents": PRESS_CORNER_DOCUMENT,
    },
  });

  const page = await adapter.discover(ctx);
  const [item] = page.items;

  assert.equal(item.externalId, "SPEECH/26/1765");
  assert.equal(item.documentType, "Speech");

  const detail = await adapter.fetchDetail(item, ctx);
  const document = await adapter.normalize(detail, item, ctx);

  assert.equal(detail.detailStatus, "ENRICHED");
  // The full speech, not the one-line search summary.
  assert.match(document.fullText, /recognition of professional qualifications/);
  assert.ok(document.fullText.length > 500);
  // Native policy areas are preserved as source metadata (10.4).
  assert.deepEqual(document.sourceTopics, [
    "Competition",
    "Energy",
    "Budget",
    "Single market",
    "Trade",
  ]);
  assert.equal(document.rawMetadata.refCode, "SPEECH/26/1765");
});

test("WEB_LISTING: INZ listing extracts article links, dates and native topics", async () => {
  const source = requireSource("nz-immigration-news");
  const adapter = createAdapter(source);
  const ctx = createDevContext({
    source,
    fixtures: {
      "https://www.immigration.govt.nz/about-us/news-centre": INZ_LISTING_HTML,
      "https://www.immigration.govt.nz/about-us/news-centre/improvements-to-the-pathway-student-visa/":
        INZ_DETAIL_HTML,
    },
  });

  const page = await adapter.discover(ctx);

  // "Contact us" is not a news item: the URL pattern excludes it.
  assert.equal(page.items.length, 2);
  const [first] = page.items;
  assert.equal(first.title, "Improvements to the Pathway Student Visa");
  assert.equal(first.publishedAt, "2026-08-26T00:00:00.000Z");
  assert.ok(first.sourceTopics?.includes("Study"));

  const detail = await adapter.fetchDetail(first, ctx);
  const document = await adapter.normalize(detail, first, ctx);
  assert.match(document.fullText, /three approved education providers/);
  assert.match(document.fullText, /NZD 20,000/);
});

test("CHANGE_WATCH: snapshot extracts the content region and material facts (11.3)", async () => {
  const source = requireSource("au-homeaffairs-subclass500-watch");
  const adapter = createAdapter(source);
  const ctx = createDevContext({
    source,
    fixtures: {
      "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500":
        SUBCLASS_500_HTML,
    },
  });

  assert.ok(adapter.snapshot, "change-watch adapters must implement snapshot()");
  const [snapshot] = await adapter.snapshot!(ctx);

  assert.equal(snapshot.targetKey, "subclass-500");
  assert.equal(snapshot.notModified, false);
  // The cookie banner must not be part of the hashed region, or every visit
  // would look like a change.
  assert.doesNotMatch(snapshot.contentRegionText, /We use cookies/);

  const facts = snapshot.extractedFacts;
  assert.ok(facts.money.some((f) => /AUD 2,000/.test(f)), "fee change must be a money fact");
  assert.ok(facts.time.some((f) => /29 days/.test(f)), "processing time must be a time fact");
  assert.ok(
    facts.workRights.some((f) => /48 hours per fortnight/.test(f)),
    "work hours must be a work-rights fact"
  );
  assert.ok(facts.documents.some((f) => /CoE/.test(f)), "CoE must be a documents fact");
  assert.ok(
    facts.eligibility.some((f) => /IELTS/.test(f)),
    "English requirement must be an eligibility fact"
  );

  // B extracts; A hashes and diffs. The adapter must not do it itself.
  assert.ok(!("contentHash" in snapshot));
});

test("DATA_FILE: dataset discovery keys by release period, not by file URL", async () => {
  const source = requireSource("au-education-monthly-data");
  const adapter = createAdapter(source);
  const releasePage = `<html><body><main>
    <a href="/download/2026-07-international-student-data.xlsx">International student data July 2026</a>
    <a href="/download/2026-06-international-student-data-revised.xlsx">International student data June 2026</a>
    <a href="/about">About this dataset</a>
  </main></body></html>`;

  const ctx = createDevContext({
    source,
    fixtures: {
      "https://www.education.gov.au/international-education-data-and-research/international-student-monthly-summary-and-data-tables":
        releasePage,
    },
  });

  const page = await adapter.discover(ctx);

  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].externalId, "au-education-monthly-data:2026-07");
  assert.equal(page.items[0].documentType, "DATASET_RELEASE");
  // The HTML page is not a dataset file, so it is not discovered.
  assert.ok(page.items.every((item) => String(item.discoveryRaw?.fileUrl).endsWith(".xlsx")));
});

test("every enabled source instantiates an adapter of the configured family", () => {
  for (const code of [
    "ca-ircc-atom",
    "uk-govuk-search-api",
    "nz-immigration-news",
    "ca-study-permit-watch",
    "au-education-monthly-data",
    "eu-press-corner-api",
  ]) {
    const source = requireSource(code);
    const adapter = createAdapter(source);
    assert.equal(adapter.family, source.adapter, `${code} family mismatch`);
    assert.ok(adapter.appendixRef.length > 0 || source.provenance.appendixExempt);
  }
});
