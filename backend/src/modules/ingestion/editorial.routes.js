/**
 * Editorial + source-health routes (Developer B).
 *
 * Mounted at `/api/admin` immediately BEFORE `ingestion.routes.js`, which owns
 * the operational read endpoints and the job-enqueue mutations. The split
 * follows the ownership model: Developer A owns the pipeline and its
 * operational API, Developer B owns the editorial decision surface — ignore,
 * source changes, source health, and the preconditions a draft must satisfy.
 *
 * `POST /source-items/:id/create-draft` appears in both routers on purpose.
 * This one runs first and only validates: it refuses a draft whose category the
 * classifier declined to resolve, then calls `next()` so Developer A's handler
 * performs the actual enqueue. One code path creates drafts; the editorial
 * precondition lives with the editorial rules.
 */

import express from "express";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireEditor, requireAdmin } from "../../middleware/auth.js";
import { createAdapter } from "./adapters/index.ts";
import { getSource } from "./config/sourceRegistry.ts";
import { createHttpFetcher } from "./utils/httpClient.js";
import { parseSafeXml } from "./utils/safeXmlParser.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireEditor);

/** Registry health states that have no `SourceHealthStatus` member. */
const HEALTH_STATE_TO_DB = {
  HEALTHY: "HEALTHY",
  DEGRADED: "DEGRADED",
  STALE: "STALE",
  BROKEN: "BROKEN",
  RATE_LIMITED: "RATE_LIMITED",
  // The schema has no BACKFILLING status; a backfilling source is not unwell.
  BACKFILLING: "HEALTHY",
};

/** Resolve a source by database id or by registry code — the UI sends codes. */
async function findSource(id) {
  return prisma.contentSource.findFirst({
    where: { OR: [{ id }, { code: id }] },
    include: { syncState: true },
  });
}

function createRouteLogger(sourceCode) {
  const emit = (method) => (message, meta) =>
    console[method](`[${sourceCode}:admin] ${message}`, meta || "");
  return { debug: emit("debug"), info: emit("info"), warn: emit("warn"), error: emit("error") };
}

/**
 * Rewrite a `sourceId` query parameter from a registry code to the database id.
 *
 * Every Admin screen navigates by registry code — that is the stable, readable
 * key an operator sees, and the only one the catalog snapshot knows. The list
 * endpoints filter on `contentSourceId`. Resolving here keeps one translation
 * point instead of teaching each screen to look up ids first.
 */
router.get(["/source-items", "/source-runs"], async (req, res, next) => {
  const sourceId = req.query.sourceId;
  if (!sourceId || typeof sourceId !== "string") return next();

  try {
    const source = await prisma.contentSource.findFirst({
      where: { OR: [{ id: sourceId }, { code: sourceId }] },
      select: { id: true },
    });

    if (!source) {
      // A code with no database row means the registry has not been seeded.
      // An empty list is the honest answer; filtering on a missing id would
      // silently return every item instead.
      return res.json({ success: true, data: [], meta: { total: 0, page: 1, totalPages: 0 } });
    }

    // Express 5 re-parses `req.query` on every access, so assigning to it here
    // would be discarded before the next handler reads it. Rewriting the URL is
    // what actually survives the hop.
    const rewritten = new URL(req.url, "http://internal");
    rewritten.searchParams.set("sourceId", source.id);
    req.url = `${rewritten.pathname}${rewritten.search}`;
    return next();
  } catch (error) {
    console.error("Failed to resolve source filter:", error);
    return res.status(500).json({ success: false, message: "Failed to resolve source filter." });
  }
});

/**
 * @route   POST /api/admin/source-items/:id/ignore
 * @desc    Dismiss a candidate. The source item, its versions and its
 *          assessments are all retained — "ignore" is an editorial decision,
 *          not a delete (10.3: keep source item for audit).
 */
router.post("/source-items/:id/ignore", async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body?.reason || "").trim() || "Dismissed by editor";

    const sourceItem = await prisma.sourceItem.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!sourceItem) {
      return res.status(404).json({ success: false, message: "Source item not found." });
    }

    if (!sourceItem.candidate) {
      // Nothing to dismiss: the routing policy already kept it out of the queue.
      return res.status(409).json({
        success: false,
        message: "This item has no candidate to ignore; the pipeline already routed it away.",
      });
    }

    if (sourceItem.candidate.articleId) {
      // A draft already exists in the CMS. Ignoring here would leave the article
      // orphaned from its candidate; an editor deletes the draft instead.
      return res.status(409).json({
        success: false,
        message: "A draft was already created from this item. Remove the draft in the CMS first.",
      });
    }

    const candidate = await prisma.articleCandidate.update({
      where: { id: sourceItem.candidate.id },
      data: {
        status: "IGNORED",
        rejectionReason: reason,
        reviewedByUserId: req.user?.id || null,
        reviewedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Candidate dismissed. Source evidence retained.",
      data: { candidateId: candidate.id, status: candidate.status, reason },
    });
  } catch (error) {
    console.error("Failed to ignore candidate:", error);
    return res.status(500).json({ success: false, message: "Failed to ignore candidate." });
  }
});

/**
 * @route   POST /api/admin/source-items/:id/create-draft
 * @desc    Editorial precondition check only; the enqueue is Developer A's.
 *          Refuses when the classifier resolved no CMS category, so a draft is
 *          never filed under a guessed one (10.4).
 */
router.post("/source-items/:id/create-draft", async (req, res, next) => {
  try {
    const candidate = await prisma.articleCandidate.findUnique({
      where: { sourceItemId: req.params.id },
      include: { aiAssessment: { select: { suggestedCategory: true, rawOutput: true } } },
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "No candidate for this source item. Reclassify it first.",
      });
    }

    if (candidate.status === "IGNORED") {
      return res.status(409).json({
        success: false,
        message: "This candidate was dismissed. Reclassify it before drafting.",
      });
    }

    // The assessment's `suggestedCategory` is null when `mapToCmsCategory`
    // refused — an unclassified item, an EU policy item, or a scholarship claim
    // that failed the relevance gate. The candidate row still carries the
    // column's VISA default, so the assessment is the honest signal here.
    const assessment = candidate.aiAssessment;
    if (assessment && !assessment.suggestedCategory) {
      const reason = assessment.rawOutput?.cmsCategoryReason || "no automatic CMS category";
      return res.status(422).json({
        success: false,
        message: `Cannot auto-draft: ${reason}. Choose a category for this candidate first.`,
        data: { requiresCategory: true },
      });
    }

    return next();
  } catch (error) {
    console.error("Failed to validate draft creation:", error);
    return res.status(500).json({ success: false, message: "Failed to validate draft creation." });
  }
});

/**
 * @route   GET /api/admin/source-changes
 * @desc    Versioned diffs from watched rule pages and re-fetched documents
 *          (11.2). Material changes first — a fee or eligibility change is what
 *          an editor is here for; a whitespace edit is not.
 */
router.get("/source-changes", async (req, res) => {
  try {
    const { sourceId, materialOnly, limit = "50" } = req.query;
    const take = Math.min(Number(limit) || 50, 200);

    const where = {};
    if (materialOnly === "1" || materialOnly === "true") where.isMaterial = true;
    if (sourceId) {
      where.sourceItem = { contentSource: { OR: [{ id: String(sourceId) }, { code: String(sourceId) }] } };
    }

    const diffs = await prisma.sourceDiff.findMany({
      where,
      include: {
        priorVersion: { select: { id: true, versionNumber: true, capturedAt: true } },
        nextVersion: { select: { id: true, versionNumber: true, capturedAt: true } },
      },
      orderBy: { detectedAt: "desc" },
      take,
    });

    // `SourceDiff` carries `sourceItemId` but no relation to it, so the items
    // are fetched in one batch rather than one query per diff.
    const itemIds = [...new Set(diffs.map((diff) => diff.sourceItemId))];
    const items = await prisma.sourceItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        title: true,
        canonicalUrl: true,
        processingStatus: true,
        contentSource: { select: { id: true, code: true, name: true, sourceType: true } },
      },
    });
    const itemById = new Map(items.map((item) => [item.id, item]));

    const data = diffs
      .map((diff) => ({ ...diff, sourceItem: itemById.get(diff.sourceItemId) ?? null }))
      .sort((a, b) => Number(b.isMaterial) - Number(a.isMaterial));

    return res.json({
      success: true,
      data,
      meta: { total: data.length, materialCount: data.filter((diff) => diff.isMaterial).length },
    });
  } catch (error) {
    console.error("Failed to fetch source changes:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch source changes." });
  }
});

/**
 * @route   POST /api/admin/content-sources/:id/healthcheck
 * @desc    Run the adapter's own healthcheck against the live endpoint and
 *          persist the result.
 *
 *          This is the one deliberate exception to "Express never makes slow
 *          government network calls": a healthcheck is a single bounded request
 *          whose whole purpose is to tell the operator, now, whether the source
 *          answers. A queued job would report into a table nobody is watching.
 */
router.post("/content-sources/:id/healthcheck", requireAdmin, async (req, res) => {
  try {
    const source = await findSource(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, message: "Content source not found." });
    }

    const sourceConfig = getSource(source.code) || source.config;
    if (!sourceConfig) {
      return res.status(422).json({
        success: false,
        message: `No registry configuration for "${source.code}".`,
      });
    }

    const adapter = createAdapter(sourceConfig);
    if (typeof adapter.healthcheck !== "function") {
      return res.status(501).json({
        success: false,
        message: `The ${sourceConfig.adapter} adapter does not implement healthcheck().`,
      });
    }

    const ctx = {
      source: sourceConfig,
      http: createHttpFetcher(),
      xml: { parse: (xml) => parseSafeXml(xml) },
      logger: createRouteLogger(source.code),
      now: () => new Date(),
      syncState: {
        watermarkAt: source.syncState?.watermark?.toISOString(),
        cursor: source.syncState?.cursor || undefined,
        etag: source.syncState?.etag || undefined,
        lastModified: source.syncState?.lastModified || undefined,
      },
    };

    let health;
    try {
      health = await adapter.healthcheck(ctx);
    } catch (adapterError) {
      // An adapter that throws is itself the health signal, not a 500.
      health = {
        state: "BROKEN",
        checkedAt: new Date().toISOString(),
        message: String(adapterError?.message || adapterError),
      };
    }

    const healthStatus = HEALTH_STATE_TO_DB[health.state] || "DEGRADED";
    const failed = healthStatus !== "HEALTHY";

    await prisma.sourceSyncState.upsert({
      where: { contentSourceId: source.id },
      create: {
        contentSourceId: source.id,
        healthStatus,
        lastFailureAt: failed ? new Date() : null,
        lastErrorMessage: failed ? health.message || null : null,
      },
      update: {
        healthStatus,
        ...(failed
          ? { lastFailureAt: new Date(), lastErrorMessage: health.message || null }
          : { consecutiveFailures: 0, lastErrorMessage: null }),
      },
    });

    return res.json({
      success: true,
      message: `Healthcheck complete: ${health.state}.`,
      data: {
        code: source.code,
        adapter: sourceConfig.adapter,
        officialUrl: sourceConfig.discovery.url,
        ...health,
        healthStatus,
      },
    });
  } catch (error) {
    console.error("Failed to run healthcheck:", error);
    return res.status(500).json({ success: false, message: "Failed to run healthcheck." });
  }
});

export default router;
