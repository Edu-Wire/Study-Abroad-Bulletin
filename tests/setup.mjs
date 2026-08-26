/**
 * Test bootstrap.
 *
 * `node --test` does not read .env, so the DB-gated suites would skip even when
 * a database is configured. Loading it here lets them run locally against a
 * real database while CI supplies the same variables through its environment.
 *
 * Wired in via the `test` script's --import flag.
 */
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    console.warn(`[tests] could not load .env: ${error.message}`);
  }
}

// Session config fails fast on weak secrets; supply test values only if the
// environment has not already provided real ones.
process.env.SESSION_HASH_SECRET ||= "test-session-hash-secret-".padEnd(48, "x");
process.env.BFF_SHARED_SECRET ||= "test-bff-shared-secret-".padEnd(48, "y");
