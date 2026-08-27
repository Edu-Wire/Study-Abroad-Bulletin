import rateLimit from "express-rate-limit";
import { clientKeyGenerator } from "./bff.js";

const keyGenerator = clientKeyGenerator;

const SERVICE_READ_PREFIXES = [
  "/api/countries",
  "/api/articles/public",
  "/api/universities",
  "/api/scholarships",
  "/api/immigration-deadlines",
  "/api/consultants",
];

function requestPath(req) {
  return String(req.originalUrl ?? "").split("?", 1)[0];
}

export function isTrustedServiceRead(req) {
  if (req.method !== "GET" || req.isTrustedServiceReader !== true) return false;
  const path = requestPath(req);
  return SERVICE_READ_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );
}

export function createServiceQuotaLimiter(options = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    keyGenerator: () => "service-reader",
    skip: (req) => !isTrustedServiceRead(req),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    statusCode: 429,
    message: {
      success: false,
      message: "The internal content service quota has been exceeded.",
    },
    ...options,
  });
}

export const serviceQuotaLimiter = createServiceQuotaLimiter();

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    message: "Too many login/signup attempts from this IP. Please try again after 15 minutes.",
  },
});

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

export function createGeneralApiLimiter(options = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator,
    skip: isTrustedServiceRead,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    statusCode: 429,
    message: {
      success: false,
      message: "Too many requests from this IP. Please try again later.",
    },
    ...options,
  });
}

export const generalApiLimiter = createGeneralApiLimiter();
