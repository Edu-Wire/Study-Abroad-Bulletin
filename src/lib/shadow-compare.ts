/**
 * Shadow-mode comparison (Plan §5, steps 3-4): diffs what the legacy RSS
 * feeds find live right now against what the new ingestion engine has
 * already discovered and stored, for one pilot country at a time.
 */

import { fetchWithFallback, type ApiResult } from "@/lib/ingestion-api";

export type ShadowCompareGeo = "CA" | "UK";

export interface ShadowCompareEntry {
  url: string;
  title: string;
  publishedAt: string | null;
  source?: string;
}

export interface ShadowCompareResult {
  geo: ShadowCompareGeo;
  legacyCount: number;
  newCount: number;
  matched: ShadowCompareEntry[];
  oldOnly: ShadowCompareEntry[];
  newOnly: ShadowCompareEntry[];
}

export async function getShadowCompare(
  geo: ShadowCompareGeo
): Promise<ApiResult<ShadowCompareResult | null>> {
  return fetchWithFallback<ShadowCompareResult | null>(
    `/admin/shadow-compare?geo=${geo}`,
    () => null
  );
}
