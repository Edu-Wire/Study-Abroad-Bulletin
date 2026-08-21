const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const shouldProxyThroughNext =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  configuredApiUrl.startsWith("http:");

const rawApiUrl = shouldProxyThroughNext ? "/api/backend" : configuredApiUrl;
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");

export const API_BASE_URL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;
