const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");

export const API_BASE_URL = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;