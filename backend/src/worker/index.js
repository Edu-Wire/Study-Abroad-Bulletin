import "dotenv/config";
import { connectDB } from "../config/db.js";
import { getBoss, startBoss, stopBoss } from "./boss.js";
import { JobNames } from "../modules/ingestion/types.js";
import { handleDiscoverJob } from "./jobs/discover.job.js";
import { handleDetailJob } from "./jobs/detail.job.js";
import { handleClassifyJob } from "./jobs/classify.job.js";
import { handleDraftJob } from "./jobs/draft.job.js";
import { handleBackfillJob } from "./jobs/backfill.job.js";
import { handleReconcileJob } from "./jobs/reconcile.job.js";

/**
 * Main worker process entry point for AbroadBulletin Ingestion Engine.
 */
export async function startWorker() {
  console.log("⚙️  [Worker] Initializing AbroadBulletin Ingestion Worker Process...");

  // Verify PostgreSQL database connectivity first
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error("❌ [Worker] Database connection failed. Aborting worker startup.");
    process.exit(1);
  }

  const boss = await startBoss();

  // Subscribe job handlers
  await boss.work(JobNames.SOURCE_DISCOVER, { batchSize: 5 }, async (jobs) => {
    for (const job of jobs) {
      await handleDiscoverJob(job);
    }
  });

  await boss.work(JobNames.SOURCE_DETAIL, { batchSize: 10 }, async (jobs) => {
    for (const job of jobs) {
      await handleDetailJob(job);
    }
  });

  await boss.work(JobNames.SOURCE_CLASSIFY, { batchSize: 5 }, async (jobs) => {
    for (const job of jobs) {
      await handleClassifyJob(job);
    }
  });

  await boss.work(JobNames.CANDIDATE_DRAFT, { batchSize: 5 }, async (jobs) => {
    for (const job of jobs) {
      await handleDraftJob(job);
    }
  });

  await boss.work(JobNames.BACKFILL_WINDOW, { batchSize: 2 }, async (jobs) => {
    for (const job of jobs) {
      await handleBackfillJob(job);
    }
  });

  await boss.work(JobNames.SOURCE_RECONCILE, { batchSize: 2 }, async (jobs) => {
    for (const job of jobs) {
      await handleReconcileJob(job);
    }
  });

  console.log("🚀 [Worker] Ingestion worker successfully subscribed to all 6 job queues:");
  console.log(`   - ${JobNames.SOURCE_DISCOVER}`);
  console.log(`   - ${JobNames.SOURCE_DETAIL}`);
  console.log(`   - ${JobNames.SOURCE_CLASSIFY}`);
  console.log(`   - ${JobNames.CANDIDATE_DRAFT}`);
  console.log(`   - ${JobNames.BACKFILL_WINDOW}`);
  console.log(`   - ${JobNames.SOURCE_RECONCILE}`);

  const shutdown = async (signal) => {
    console.log(`\n🛑 [Worker] Received ${signal}. Shutting down worker gracefully...`);
    await stopBoss();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// Auto-run if executed directly as entrypoint
if (process.argv[1] && (process.argv[1].endsWith("worker/index.js") || process.argv[1].endsWith("worker\\index.js"))) {
  startWorker().catch((err) => {
    console.error("❌ [Worker] Fatal startup error:", err);
    process.exit(1);
  });
}
