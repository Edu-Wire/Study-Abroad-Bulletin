import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Attempt to load .env from project root if not already in process.env
if (!process.env.JWT_SECRET) {
  try {
    if (typeof process.loadEnvFile === "function") {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      // Look for .env in current working dir or project root
      const envPath = path.resolve(__dirname, "../../../.env");
      if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
      } else {
        process.loadEnvFile();
      }
    }
  } catch (e) {
    // Ignore if already loaded or not found; validation below will catch missing vars
  }
}

const rawSecret = process.env.JWT_SECRET;

// Fail-Fast Security Validation
if (!rawSecret || typeof rawSecret !== "string" || rawSecret.trim().length < 32) {
  console.error("\n❌ [FATAL SECURITY ERROR] JWT_SECRET must be configured in environment variables and be at least 32 characters long.");
  console.error("   Current status: " + (!rawSecret ? "MISSING" : `TOO SHORT (${rawSecret.trim().length} chars, required >= 32)`));
  console.error("   The server will not start in an insecure state.\n");
  process.exit(1);
}

if (rawSecret.trim() === "studyabroadnews_secret_key_2026") {
  console.error("\n❌ [FATAL SECURITY ERROR] JWT_SECRET is using the deprecated public fallback key!");
  console.error("   Please generate a new strong secret in your .env file before starting the server.\n");
  process.exit(1);
}

export const JWT_SECRET = rawSecret.trim();
