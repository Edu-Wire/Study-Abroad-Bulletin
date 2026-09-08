/**
 * Day-3 B1 — the editorial Admin API, exercised over HTTP against the database.
 *
 * These are the endpoints the Admin screens call for the actions the execution
 * plan lists: ignore, inspect changes, inspect source health. They are mounted
 * on a bare app here rather than importing `server.js`, which starts listening
 * on import; the routers carry their own auth middleware, so the authorization
 * behaviour under test is the real one.
 *
 * Skips cleanly when no DATABASE_URL is configured.
 */

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

import prisma from "../../backend/src/config/prisma.js";
import { createSession } from "../../backend/src/services/session.service.js";
import { SESSION_COOKIE_NAME } from "../../backend/src/config/session.js";
import editorialRoutes from "../../backend/src/modules/ingestion/editorial.routes.js";
import ingestionRoutes from "../../backend/src/modules/ingestion/ingestion.routes.js";

const DB_CONFIGURED = Boolean(process.env.DATABASE_URL);

let server;
let baseUrl;
let adminCookie;
let adminUserId;
/** Ids created by this file, torn down in `after`. */
const created = { items: [], sources: [] };

test.before(async () => {
  if (!DB_CONFIGURED) return;

  const app = express();
  app.use(express.json());
  // Same order as `server.js`: editorial first, so its create-draft guard runs
  // before the operational handler enqueues anything.
  app.use("/api/admin", editorialRoutes);
  app.use("/api/admin", ingestionRoutes);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const admin = await prisma.user.upsert({
    where: { email: "editorial-routes-test@abroadbulletin.test" },
    update: { role: "ADMIN", status: "ACTIVE", mustChangePassword: false },
    create: {
      email: "editorial-routes-test@abroadbulletin.test",
      password: "not-a-login-path",
      firstName: "Editorial",
      lastName: "Test",
      role: "ADMIN",
      status: "ACTIVE",
      mustChangePassword: false,
    },
  });
  adminUserId = admin.id;

  const session = await createSession(admin.id);
  adminCookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(session.rawToken)}`;
});

test.after(async () => {
  if (!DB_CONFIGURED) return;

  for (const id of created.items) {
    await prisma.articleCandidate.deleteMany({ where: { sourceItemId: id } });
    await prisma.aiAssessment.deleteMany({ where: { sourceItemId: id } });
    await prisma.sourceItem.deleteMany({ where: { id } });
  }
  if (adminUserId) {
    await prisma.userSession.deleteMany({ where: { userId: adminUserId } });
    await prisma.user.deleteMany({ where: { id: adminUserId } });
  }
  await new Promise((resolve) => server?.close(resolve) ?? resolve());
});

function request(path, options = {}) {
  return fetch(`${baseUrl}/api/admin${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.auth === false ? {} : { cookie: adminCookie }),
      ...options.headers,
    },
  });
}

/** A source item with a candidate, ready to be ignored or drafted. */
async function seedItemWithCandidate({ suggestedCategory }) {
  const source = await prisma.contentSource.findFirst({ where: { code: "ca-ircc-atom" } });
  assert.ok(source, "seed the Phase 1 registry before running this suite");

  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  const item = await prisma.sourceItem.create({
    data: {
      contentSourceId: source.id,
      externalId: `editorial-routes-${stamp}`,
      canonicalUrl: `https://example.test/editorial-routes/${stamp}`,
      canonicalUrlHash: `editorial-routes-hash-${stamp}`,
      title: "Editorial routes fixture",
      processingStatus: "ROUTED",
    },
  });
  created.items.push(item.id);

  const assessment = await prisma.aiAssessment.create({
    data: {
      sourceItemId: item.id,
      relevanceScore: 0.8,
      confidenceScore: 0.9,
      internalCategory: suggestedCategory ? "STUDENT_VISA" : "EU_POLICY",
      suggestedCategory,
      routingDecision: "REVIEW",
      model: "fixture",
      promptVersion: "fixture",
      rawOutput: { cmsCategoryReason: "EU_POLICY has no automatic CMS category" },
    },
  });

  await prisma.articleCandidate.create({
    data: {
      sourceItemId: item.id,
      aiAssessmentId: assessment.id,
      headline: "Editorial routes fixture",
      summary: "Fixture candidate.",
      confidence: 0.9,
      status: "PENDING",
    },
  });

  return item;
}

test("editorial API: rejects an unauthenticated request", { skip: !DB_CONFIGURED }, async () => {
  const response = await request("/source-changes", { auth: false });
  assert.equal(response.status, 401);
});

test("editorial API: source-changes returns diffs with their source item", { skip: !DB_CONFIGURED }, async () => {
  const response = await request("/source-changes?limit=10");
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.ok(Array.isArray(payload.data));
  assert.equal(typeof payload.meta.materialCount, "number");

  // Material changes lead, so an editor sees fee and eligibility moves first.
  const materialFlags = payload.data.map((diff) => Boolean(diff.isMaterial));
  assert.deepEqual(
    materialFlags,
    [...materialFlags].sort((a, b) => Number(b) - Number(a)),
    "material diffs must sort ahead of minor ones"
  );
});

test("editorial API: ignore dismisses the candidate and keeps the evidence", { skip: !DB_CONFIGURED }, async () => {
  const item = await seedItemWithCandidate({ suggestedCategory: "VISA" });

  const response = await request(`/source-items/${item.id}/ignore`, {
    method: "POST",
    body: JSON.stringify({ reason: "Domestic policy, no student impact" }),
  });
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.data.status, "IGNORED");

  const candidate = await prisma.articleCandidate.findUnique({ where: { sourceItemId: item.id } });
  assert.equal(candidate.status, "IGNORED");
  assert.equal(candidate.rejectionReason, "Domestic policy, no student impact");
  assert.equal(candidate.reviewedByUserId, adminUserId);

  // The whole point of "ignore" rather than "delete": the source record and its
  // assessment survive, so the decision stays auditable.
  assert.ok(await prisma.sourceItem.findUnique({ where: { id: item.id } }));
  assert.ok(await prisma.aiAssessment.count({ where: { sourceItemId: item.id } }));
});

test("editorial API: ignoring an item with no candidate is a conflict, not a 404", { skip: !DB_CONFIGURED }, async () => {
  const source = await prisma.contentSource.findFirst({ where: { code: "ca-ircc-atom" } });
  const stamp = Date.now();
  const item = await prisma.sourceItem.create({
    data: {
      contentSourceId: source.id,
      externalId: `editorial-routes-nocand-${stamp}`,
      canonicalUrl: `https://example.test/editorial-routes/nocand-${stamp}`,
      canonicalUrlHash: `editorial-routes-nocand-hash-${stamp}`,
      title: "No candidate fixture",
      processingStatus: "ROUTED",
    },
  });
  created.items.push(item.id);

  const response = await request(`/source-items/${item.id}/ignore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 409);
});

test("editorial API: create-draft refuses a candidate with no resolved CMS category", { skip: !DB_CONFIGURED }, async () => {
  const item = await seedItemWithCandidate({ suggestedCategory: null });

  const response = await request(`/source-items/${item.id}/create-draft`, { method: "POST" });

  // 422, not 500: the request is well formed, the editorial precondition is not
  // met, and the operator is told which one.
  assert.equal(response.status, 422);
  const payload = await response.json();
  assert.equal(payload.data.requiresCategory, true);
  assert.match(payload.message, /category/i);

  assert.equal(
    await prisma.article.count({ where: { sourceUrl: item.canonicalUrl } }),
    0,
    "a blocked draft must not reach the CMS"
  );
});

test("editorial API: the source filter accepts a registry code", { skip: !DB_CONFIGURED }, async () => {
  const response = await request("/source-items?sourceId=ca-ircc-atom&limit=5");
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(payload.success, true);
  for (const item of payload.data) {
    assert.equal(item.contentSource.code, "ca-ircc-atom");
  }
});

test("editorial API: an unknown source code filters to nothing, not to everything", { skip: !DB_CONFIGURED }, async () => {
  const response = await request("/source-items?sourceId=not-a-real-source");
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.deepEqual(payload.data, []);
});
