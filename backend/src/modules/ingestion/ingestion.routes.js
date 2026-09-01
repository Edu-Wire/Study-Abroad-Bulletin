import express from "express";
import { prisma } from "../../config/prisma.js";
import { enqueueJob, JobNames } from "../../worker/boss.js";
import { requireAuth, requireEditor, requireAdmin } from "../../middleware/auth.js";

const router = express.Router();

// Apply editor auth to all ingestion management routes
router.use(requireAuth);
router.use(requireEditor);

/**
 * @route   GET /api/admin/content-sources
 * @desc    List all content sources with sync state and summary health
 */
router.get("/content-sources", async (req, res) => {
  try {
    const sources = await prisma.contentSource.findMany({
      include: {
        country: { select: { id: true, name: true, flag: true, code: true } },
        syncState: true,
        _count: { select: { items: true, runs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: sources });
  } catch (error) {
    console.error("Failed to fetch content sources:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch content sources." });
  }
});

/**
 * @route   GET /api/admin/content-sources/:id
 * @desc    Get content source details with sync state and recent runs
 */
router.get("/content-sources/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const source = await prisma.contentSource.findUnique({
      where: { id },
      include: {
        country: true,
        syncState: true,
        runs: { take: 10, orderBy: { startedAt: "desc" } },
      },
    });

    if (!source) {
      return res.status(404).json({ success: false, message: "Content source not found." });
    }

    return res.json({ success: true, data: source });
  } catch (error) {
    console.error("Failed to fetch content source detail:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch content source." });
  }
});

/**
 * @route   POST /api/admin/content-sources/:id/sync
 * @desc    Enqueue manual live sync (NEVER executes inline slow network calls)
 */
router.post("/content-sources/:id/sync", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const source = await prisma.contentSource.findUnique({ where: { id } });

    if (!source) {
      return res.status(404).json({ success: false, message: "Content source not found." });
    }

    // Create operational run record
    const run = await prisma.sourceRun.create({
      data: {
        contentSourceId: source.id,
        runType: "MANUAL",
        status: "RUNNING",
      },
    });

    // Enqueue background discovery job via pg-boss
    const jobId = await enqueueJob(JobNames.SOURCE_DISCOVER, {
      contentSourceId: source.id,
      runId: run.id,
      mode: "MANUAL",
      triggeredBy: req.user?.id || "admin",
    });

    return res.status(202).json({
      success: true,
      message: `Manual sync enqueued for source "${source.name}".`,
      jobId,
      runId: run.id,
    });
  } catch (error) {
    console.error("Failed to enqueue source sync:", error);
    return res.status(500).json({ success: false, message: "Failed to enqueue source sync." });
  }
});

/**
 * @route   POST /api/admin/content-sources/:id/reconcile
 * @desc    Enqueue source reconciliation job
 */
router.post("/content-sources/:id/reconcile", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { periodStart, periodEnd } = req.body || {};

    const source = await prisma.contentSource.findUnique({ where: { id } });
    if (!source) {
      return res.status(404).json({ success: false, message: "Content source not found." });
    }

    const jobId = await enqueueJob(JobNames.SOURCE_RECONCILE, {
      contentSourceId: source.id,
      periodStart: periodStart || new Date(Date.now() - 7 * 86400000).toISOString(),
      periodEnd: periodEnd || new Date().toISOString(),
    });

    return res.status(202).json({
      success: true,
      message: `Reconciliation job enqueued for source "${source.name}".`,
      jobId,
    });
  } catch (error) {
    console.error("Failed to enqueue reconciliation:", error);
    return res.status(500).json({ success: false, message: "Failed to enqueue reconciliation." });
  }
});

/**
 * @route   GET /api/admin/source-items
 * @desc    List ingested source items with pagination and status filters
 */
router.get("/source-items", async (req, res) => {
  try {
    const { sourceId, status, page = "1", limit = "20" } = req.query;
    const take = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {};
    if (sourceId) where.contentSourceId = String(sourceId);
    if (status) where.processingStatus = String(status);

    const [items, total] = await Promise.all([
      prisma.sourceItem.findMany({
        where,
        include: {
          contentSource: { select: { id: true, name: true, code: true, sourceType: true } },
          candidate: true,
          assessments: { take: 1, orderBy: { createdAt: "desc" } },
        },
        orderBy: { publishedAt: "desc" },
        take,
        skip,
      }),
      prisma.sourceItem.count({ where }),
    ]);

    return res.json({
      success: true,
      data: items,
      meta: {
        total,
        page: Number(page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Failed to fetch source items:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch source items." });
  }
});

/**
 * @route   GET /api/admin/source-items/:id
 * @desc    Get detailed source item with version history, diffs, and AI assessments
 */
router.get("/source-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.sourceItem.findUnique({
      where: { id },
      include: {
        contentSource: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          include: { diffsFromPrior: true },
        },
        assessments: { orderBy: { createdAt: "desc" } },
        candidate: true,
        articleLinks: { include: { article: { select: { id: true, slug: true, headline: true, status: true } } } },
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Source item not found." });
    }

    return res.json({ success: true, data: item });
  } catch (error) {
    console.error("Failed to fetch source item detail:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch source item detail." });
  }
});

/**
 * @route   POST /api/admin/source-items/:id/reclassify
 * @desc    Enqueue AI reclassification for a source item version
 */
router.post("/source-items/:id/reclassify", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body || {};

    const item = await prisma.sourceItem.findUnique({ where: { id } });
    if (!item) {
      return res.status(404).json({ success: false, message: "Source item not found." });
    }

    const jobId = await enqueueJob(JobNames.SOURCE_CLASSIFY, {
      sourceItemId: item.id,
      versionId: versionId || null,
      triggeredBy: req.user?.id,
    });

    return res.status(202).json({
      success: true,
      message: "Reclassification job enqueued.",
      jobId,
    });
  } catch (error) {
    console.error("Failed to enqueue reclassification:", error);
    return res.status(500).json({ success: false, message: "Failed to enqueue reclassification." });
  }
});

/**
 * @route   POST /api/admin/source-items/:id/create-draft
 * @desc    Enqueue draft creation in the existing Article CMS from candidate
 */
router.post("/source-items/:id/create-draft", async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await prisma.articleCandidate.findUnique({
      where: { sourceItemId: id },
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: "No candidate found for this source item." });
    }

    const jobId = await enqueueJob(JobNames.CANDIDATE_DRAFT, {
      candidateId: candidate.id,
      sourceItemId: id,
      requestedBy: req.user?.id,
    });

    return res.status(202).json({
      success: true,
      message: "Article draft creation enqueued.",
      jobId,
    });
  } catch (error) {
    console.error("Failed to enqueue draft creation:", error);
    return res.status(500).json({ success: false, message: "Failed to enqueue draft creation." });
  }
});

/**
 * @route   GET /api/admin/source-runs
 * @desc    Operational history of ingestion runs
 */
router.get("/source-runs", async (req, res) => {
  try {
    const { sourceId, limit = "30" } = req.query;
    const where = sourceId ? { contentSourceId: String(sourceId) } : {};

    const runs = await prisma.sourceRun.findMany({
      where,
      include: {
        contentSource: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startedAt: "desc" },
      take: Math.min(Number(limit) || 30, 100),
    });

    return res.json({ success: true, data: runs });
  } catch (error) {
    console.error("Failed to fetch source runs:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch source runs." });
  }
});

/**
 * @route   GET /api/admin/source-health
 * @desc    Aggregated operational health metrics across all sources
 */
router.get("/source-health", async (req, res) => {
  try {
    const syncStates = await prisma.sourceSyncState.findMany({
      include: {
        contentSource: { select: { id: true, name: true, code: true, sourceType: true, enabled: true } },
      },
    });

    const summary = {
      totalSources: syncStates.length,
      healthy: syncStates.filter((s) => s.healthStatus === "HEALTHY").length,
      degraded: syncStates.filter((s) => s.healthStatus === "DEGRADED").length,
      stale: syncStates.filter((s) => s.healthStatus === "STALE").length,
      broken: syncStates.filter((s) => s.healthStatus === "BROKEN").length,
      rateLimited: syncStates.filter((s) => s.healthStatus === "RATE_LIMITED").length,
    };

    return res.json({ success: true, summary, data: syncStates });
  } catch (error) {
    console.error("Failed to fetch source health:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch source health." });
  }
});

export default router;
