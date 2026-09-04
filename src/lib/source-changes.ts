/**
 * Source Changes - material diffs from watched/versioned sources (GET /source-changes).
 */

import { fetchWithFallback, type ApiResult } from "@/lib/ingestion-api";

export interface SourceChangeSummary {
  id: string;
  isMaterial: boolean;
  changeSummary: string | null;
  addedTokens: number;
  removedTokens: number;
  detectedAt: string;
  sourceItem: {
    id: string;
    title: string;
    canonicalUrl: string;
    contentSource: { id: string; name: string; code: string; sourceType: string };
  };
  priorVersion: { id: string; versionNumber: number; capturedAt: string };
  nextVersion: { id: string; versionNumber: number; capturedAt: string };
}

export async function getSourceChanges(params: {
  sourceId?: string;
  limit?: number;
}): Promise<ApiResult<SourceChangeSummary[]>> {
  const query = new URLSearchParams();
  if (params.sourceId) query.set("sourceId", params.sourceId);
  query.set("limit", String(params.limit ?? 30));

  return fetchWithFallback<SourceChangeSummary[]>(`/admin/source-changes?${query.toString()}`, () => []);
}
