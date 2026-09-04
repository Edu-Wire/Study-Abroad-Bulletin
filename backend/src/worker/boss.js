import "dotenv/config";
import { PgBoss } from "pg-boss";
import { JobNames } from "../modules/ingestion/types.js";

let bossInstance = null;

/**
 * Get or create the singleton PgBoss instance.
 *
 * @returns {PgBoss}
 */
export function getBoss() {
  if (!bossInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required to initialize pg-boss.");
    }

    // ponytail: pg-boss opens its own pool, separate from config/prisma.js's.
    // Both draw from the same DATABASE_POOL_MAX budget so one process (API or
    // worker) can't alone exhaust a pooled provider's session cap — see
    // config/prisma.js for why this matters against Supabase/Neon session mode.
    const max = Number(process.env.DATABASE_POOL_MAX) || 3;

    bossInstance = new PgBoss({
      connectionString,
      schema: "pgboss",
      max,
      retentionMinutes: 60 * 24 * 7, // 7 days retention
      archiveCompletedAfterSeconds: 60 * 60, // 1 hour
      deleteAfterDays: 14,
    });

    bossInstance.on("error", (error) => {
      console.error("[pg-boss] Error:", error);
    });
  }

  return bossInstance;
}

let isBossStarted = false;

/**
 * Starts the pg-boss background worker instance and ensures queues are created.
 */
export async function startBoss() {
  const boss = getBoss();
  if (!isBossStarted) {
    await boss.start();
    isBossStarted = true;
  }

  // In pg-boss v12+, create queues explicitly so workers can poll without error
  const allQueues = Object.values(JobNames);
  for (const queueName of allQueues) {
    try {
      await boss.createQueue(queueName);
    } catch (err) {
      // Ignore if queue already exists
      if (!err.message?.includes("already exists")) {
        console.warn(`[pg-boss] Notice creating queue ${queueName}:`, err.message);
      }
    }
  }

  console.log("✅ [pg-boss] Background queue service started successfully.");
  return boss;
}

/**
 * Gracefully stops the pg-boss background worker instance.
 */
export async function stopBoss() {
  if (bossInstance) {
    console.log("⏳ [pg-boss] Stopping background queue service...");
    await bossInstance.stop({ graceful: true, timeout: 5000 });
    bossInstance = null;
    isBossStarted = false;
    console.log("🛑 [pg-boss] Background queue service stopped.");
  }
}

/**
 * Helper to enqueue a background job.
 *
 * @param {string} queueName
 * @param {object} data
 * @param {object} [options={}]
 * @returns {Promise<string|null>} Job ID
 */
export async function enqueueJob(queueName, data = {}, options = {}) {
  const boss = getBoss();
  if (!isBossStarted) {
    try {
      await boss.start();
      isBossStarted = true;
    } catch (err) {
      isBossStarted = true;
    }
  }
  return await boss.send(queueName, data, options);
}

export { JobNames };
export default getBoss;

