import rateLimit from "express-rate-limit";
import { clientKeyGenerator } from "./bff.js";

/**
 * All limiters key on the address the trusted BFF reported, falling back to the
 * socket address. Without this every request would arrive from the Next.js
 * server and share one bucket, letting a single caller exhaust the limit for
 * everyone — a denial of service rather than a protection.
 *
 * `trust proxy` is intentionally left off; see clientKeyGenerator.
 */
const keyGenerator = clientKeyGenerator;

/**
 * Strict Rate Limiter for Authentication endpoints (/api/login, /api/signup)
 * Limits each IP to 10 requests per 15 minutes to prevent brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  keyGenerator,
  standardHeaders: "draft-7", // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  statusCode: 429,
  message: {
    success: false,
    message: "Too many login/signup attempts from this IP. Please try again after 15 minutes.",
  },
});

/**
 * Rate Limiter for administrative mutations (user invites, status changes)
 * Limits each IP to 30 requests per 15 minutes.
 */
export const adminMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "Too many administrative modification requests from this IP. Please slow down.",
  },
});

/**
 * General API Rate Limiter
 * Limits each IP to 100 requests per 15 minutes.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again later.",
  },
});
