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

    const formatted = sources.map((source) => {
      const lastSyncedAt = source.syncState?.lastSuccessAt
        ? source.syncState.lastSuccessAt.toISOString()
        : null;

      let freshnessLagMinutes = null;
      if (lastSyncedAt) {
        freshnessLagMinutes = Math.max(
          0,
          Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 60000)
        );
      }

      return {
        ...source,
        health: source.syncState?.healthStatus || "HEALTHY",
        lastSyncedAt,
        freshnessLagMinutes,
        itemsLast24h: source._count?.items || 0,
        candidatesLast24h: 0,
        errorsLast24h: source.syncState?.consecutiveFailures || 0,
      };
    });

    return res.json({ success: true, data: formatted });
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
    // Support lookup by UUID (id) or by code (e.g. "ca-ircc-atom") — frontend sends code
    const source = await prisma.contentSource.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        country: true,
        syncState: true,
        runs: { take: 10, orderBy: { startedAt: "desc" } },
        _count: { select: { items: true, runs: true } },
      },
    });

    if (!source) {
      return res.status(404).json({ success: false, message: "Content source not found." });
    }

    const lastSyncedAt = source.syncState?.lastSuccessAt
      ? source.syncState.lastSuccessAt.toISOString()
      : null;

    let freshnessLagMinutes = null;
    if (lastSyncedAt) {
      freshnessLagMinutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 60000)
      );
    }

    const formatted = {
      ...source,
      health: source.syncState?.healthStatus || "HEALTHY",
      lastSyncedAt,
      freshnessLagMinutes,
      itemsLast24h: source._count?.items || 0,
      candidatesLast24h: 0,
      errorsLast24h: source.syncState?.consecutiveFailures || 0,
    };

    return res.json({ success: true, data: formatted });
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
    // Support lookup by UUID (id) or by code (e.g. "ca-ircc-atom") — frontend sends code
    const source = await prisma.contentSource.findFirst({ where: { OR: [{ id }, { code: id }] } });

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

    // Enqueue background discovery job via pg-boss. If this throws, the run
    // row above already exists — without marking it FAILED here it would sit
    // at RUNNING forever with no job ever behind it (indistinguishable from a
    // slow-but-healthy sync in the Source Runs UI).
    let jobId;
    try {
      jobId = await enqueueJob(JobNames.SOURCE_DISCOVER, {
        contentSourceId: source.id,
        runId: run.id,
        mode: "MANUAL",
        triggeredBy: req.user?.id || "admin",
      });
    } catch (enqueueError) {
      await prisma.sourceRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: enqueueError.message || "Failed to enqueue discovery job.",
        },
      });
      throw enqueueError;
    }

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

    // Support lookup by UUID (id) or by code — frontend sends code
    const source = await prisma.contentSource.findFirst({ where: { OR: [{ id }, { code: id }] } });
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
 * @route   POST /api/admin/content-sources/:id/backfill
 * @desc    Partition historical date range and enqueue backfill window jobs
 */
router.post("/content-sources/:id/backfill", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, windowDays } = req.body || {};

    // Resolve code → actual DB id for backfill service
    const resolvedSource = await prisma.contentSource.findFirst({ where: { OR: [{ id }, { code: id }] } });
    if (!resolvedSource) {
      return res.status(404).json({ success: false, message: "Content source not found." });
    }
    const resolvedId = resolvedSource.id;

    const { createBackfillRun } = await import("./services/backfill.service.js");

    const result = await createBackfillRun({
      contentSourceId: resolvedId,
      startDate: startDate || new Date(Date.now() - 90 * 86400000),
      endDate: endDate || new Date(),
      windowDays: Number(windowDays) || 7,
    });

    return res.status(202).json({
      success: true,
      message: `Backfill run initiated with ${result.totalWindows} windows.`,
      data: result,
    });
  } catch (error) {
    console.error("Failed to create backfill run:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to initiate backfill." });
  }
});

/**
 * @route   POST /api/admin/content-sources/seed
 * @desc    Seed/sync all 28 Phase 1 catalog sources into the database
 */
router.post("/content-sources/seed", requireAdmin, async (req, res) => {
  try {
    const { seedPhase1Sources } = await import("./services/seedSources.js");
    const result = await seedPhase1Sources();

    return res.json({
      success: true,
      message: `Successfully synchronized ${result.total} Phase 1 sources (${result.seeded} created, ${result.updated} updated).`,
      data: result,
    });
  } catch (error) {
    console.error("Failed to seed sources:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to seed sources." });
  }
});

/**
 * @route   POST /api/admin/content-sources/migrate-legacy
 * @desc    One-time/idempotent migration of legacy RSSSource rows into ContentSource (Plan §5)
 */
router.post("/content-sources/migrate-legacy", requireAdmin, async (req, res) => {
  try {
    const { migrateLegacyRssSources } = await import("./services/seedSources.js");
    const result = await migrateLegacyRssSources();

    return res.json({
      success: true,
      message: `Migrated ${result.total} legacy RSS sources (${result.migrated} created, ${result.updated} updated).`,
      data: result,
    });
  } catch (error) {
    console.error("Failed to migrate legacy RSS sources:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to migrate legacy RSS sources." });
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
 * @route   POST /api/admin/source-items/:id/ignore
 * @desc    Dismiss a candidate with an audited reason; source evidence is retained
 */
router.post("/source-items/:id/ignore", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const candidate = await prisma.articleCandidate.findUnique({
      where: { sourceItemId: id },
    });

    if (!candidate) {
      return res.status(404).json({ success: false, message: "No candidate found for this source item." });
    }

    await prisma.articleCandidate.update({
      where: { id: candidate.id },
      data: {
        status: "IGNORED",
        rejectionReason: reason || null,
        reviewedByUserId: req.user?.id || null,
        reviewedAt: new Date(),
      },
    });

    return res.json({ success: true, message: "Candidate ignored." });
  } catch (error) {
    console.error("Failed to ignore candidate:", error);
    return res.status(500).json({ success: false, message: "Failed to ignore candidate." });
  }
});

/**
 * @route   GET /api/admin/source-changes
 * @desc    Material diffs from watched/versioned sources (newest first)
 */
router.get("/source-changes", async (req, res) => {
  try {
    const { sourceId, limit = "30" } = req.query;
    const take = Math.min(Number(limit) || 30, 100);

    // SourceDiff has no direct sourceItem relation — only priorVersion/nextVersion,
    // each of which belongs to a SourceItem. Reach the item through nextVersion.
    const diffs = await prisma.sourceDiff.findMany({
      where: {
        isMaterial: true,
        ...(sourceId
          ? { nextVersion: { sourceItem: { contentSourceId: String(sourceId) } } }
          : {}),
      },
      include: {
        priorVersion: { select: { id: true, versionNumber: true, capturedAt: true } },
        nextVersion: {
          select: {
            id: true,
            versionNumber: true,
            capturedAt: true,
            sourceItem: {
              select: {
                id: true,
                title: true,
                canonicalUrl: true,
                contentSource: { select: { id: true, name: true, code: true, sourceType: true } },
              },
            },
          },
        },
      },
      orderBy: { detectedAt: "desc" },
      take,
    });

    // Reshape so the response keeps a top-level sourceItem, matching the shape
    // the source-items list/detail routes already return.
    const formatted = diffs.map((diff) => {
      const { sourceItem, ...nextVersion } = diff.nextVersion;
      return { ...diff, sourceItem, nextVersion };
    });

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Failed to fetch source changes:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch source changes." });
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
