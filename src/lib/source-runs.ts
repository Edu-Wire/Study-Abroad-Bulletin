/**
 * Source Runs - operational history of ingestion jobs (Blueprint 11, GET /source-runs).
 */

import { fetchWithFallback, type ApiResult } from "@/lib/ingestion-api";

export interface SourceRunSummary {
  id: string;
  runType: "LIVE" | "MANUAL" | "BACKFILL" | "RECONCILE" | string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL" | string;
  startedAt: string;
  finishedAt: string | null;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  errorMessage: string | null;
  contentSource: { id: string; name: string; code: string };
}

export async function getSourceRuns(params: {
  sourceId?: string;
  limit?: number;
}): Promise<ApiResult<SourceRunSummary[]>> {
  const query = new URLSearchParams();
  if (params.sourceId) query.set("sourceId", params.sourceId);
  query.set("limit", String(params.limit ?? 30));

  return fetchWithFallback<SourceRunSummary[]>(`/admin/source-runs?${query.toString()}`, () => []);
}

export const RUN_STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  RUNNING: { badge: "bg-blue-500/10 text-[#1769E0] border-blue-500/20", dot: "bg-[#1769E0]" },
  SUCCESS: { badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" },
  FAILED: { badge: "bg-rose-500/10 text-rose-700 border-rose-500/20", dot: "bg-rose-500" },
  PARTIAL: { badge: "bg-amber-500/10 text-amber-700 border-amber-500/20", dot: "bg-amber-500" },
};

export function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "In progress";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return "<1s";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}
