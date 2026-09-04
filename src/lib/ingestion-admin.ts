/**
 * Shapes and fetchers for the ingestion Admin screens.
 *
 * These mirror what Express actually returns (Prisma rows with their relations
 * included), rather than an idealised view model. Where the API and the
 * editorial vocabulary differ — `RoutingDecision` has no HOLD lane, the
 * candidate's category column has a non-null default — the exact lane and the
 * category decision are read back out of `AiAssessment.rawOutput`, which the
 * classification service writes in full for precisely this reason.
 */

import { fetchWithFallback, type ApiResult } from "@/lib/ingestion-api";
import type {
  CandidateStatus,
  ProcessingStatus,
  RoutingDecision,
  SourceHealthStatus,
  SourceRunStatus,
  SourceRunType,
} from "@/types/ingestion";

// The vocabulary itself lives in the shared contract file; re-exported here so
// a screen imports its rows and its enums from one place.
export type {
  CandidateStatus,
  ProcessingStatus,
  RoutingDecision,
  SourceHealthStatus,
  SourceRunStatus,
  SourceRunType,
};

/**
 * Filter options for the processing-status dropdown, in pipeline order.
 *
 * A runtime array, which the type alone cannot give: this is the order an item
 * actually moves through, and sorting it alphabetically would put ROUTED before
 * SCORED and make the filter read as nonsense.
 */
export const PROCESSING_STATUSES: readonly ProcessingStatus[] = [
  "DISCOVERED",
  "DETAIL_PENDING",
  "ENRICHED",
  "NORMALIZED",
  "VERSIONED",
  "SCORED",
  "CLASSIFIED",
  "ROUTED",
  "IMPORTED",
  "PUBLISHED",
];

// ============================================================
// Rows
// ============================================================

export interface SourceRef {
  id: string;
  code: string;
  name: string;
  sourceType?: string;
}

/**
 * The full model output, as `classification.service` stored it. Everything the
 * candidate card shows beyond the four `AiAssessment` columns comes from here.
 */
export interface AssessmentRawOutput {
  studyAbroadRelevance?: number;
  visaRelevance?: number;
  internationalStudentRelevance?: number;
  scholarshipRelevance?: number;
  postStudyWorkRelevance?: number;
  policyImpact?: number;
  urgency?: number;
  confidence?: number;
  primaryCategory?: string;
  secondaryCategories?: string[];
  affectedDestinations?: string[];
  affectedNationalities?: string[];
  effectiveDates?: Array<{ raw: string; date?: string; kind?: string; description?: string }>;
  reasonCodes?: string[];
  reasoningSummary?: string;
  shortSummary?: string;
  /** The internal 10.3 lane, including HOLD and CRITICAL_DRAFT_ALERT. */
  route?: string;
  routeExplanation?: string;
  cmsCategory?: string | null;
  cmsCategoryReason?: string;
  autoDraftable?: boolean;
  prefilterScore?: number;
  prefilterMatchedBoost?: string[];
  prefilterMatchedNegative?: string[];
  providerKey?: string;
}

export interface AiAssessmentRow {
  id: string;
  versionId: string | null;
  /** 0-1 in the database; the UI renders it as a percentage. */
  relevanceScore: number;
  confidenceScore: number;
  urgency: string | null;
  internalCategory: string;
  suggestedCategory: string | null;
  routingDecision: RoutingDecision;
  suggestedHeadline: string | null;
  suggestedSummary: string | null;
  keyTakeaways: string[];
  targetAudience: string[];
  model: string;
  promptVersion: string;
  rawOutput: AssessmentRawOutput | null;
  createdAt: string;
}

export interface CandidateRow {
  id: string;
  headline: string;
  summary: string;
  category: string;
  confidence: number;
  status: CandidateStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  articleId: string | null;
}

export interface SourceDiffRow {
  id: string;
  sourceItemId: string;
  isMaterial: boolean;
  changeSummary: string | null;
  addedTokens: number;
  removedTokens: number;
  detectedAt: string;
  priorVersion?: { id: string; versionNumber: number; capturedAt: string };
  nextVersion?: { id: string; versionNumber: number; capturedAt: string };
  sourceItem?: {
    id: string;
    title: string;
    canonicalUrl: string;
    processingStatus: ProcessingStatus;
    contentSource: SourceRef;
  } | null;
}

export interface SourceVersionRow {
  id: string;
  contentHash: string;
  versionNumber: number;
  title: string | null;
  authors: string[];
  cleanText: string | null;
  cleanHtml: string | null;
  httpStatus: number | null;
  capturedAt: string;
  diffsFromPrior?: SourceDiffRow[];
}

export interface SourceItemRow {
  id: string;
  externalId: string | null;
  canonicalUrl: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  discoveredAt: string;
  processingStatus: ProcessingStatus;
  language: string | null;
  nativeTopics: string[];
  rawMetadata: Record<string, unknown> | null;
  contentSource: SourceRef;
  candidate: CandidateRow | null;
  assessments: AiAssessmentRow[];
}

export interface SourceItemDetail extends Omit<SourceItemRow, "contentSource"> {
  contentSource: SourceRef & { baseUrl?: string; schedule?: string | null; enabled?: boolean };
  versions: SourceVersionRow[];
  articleLinks: Array<{
    id: string;
    article: { id: string; slug: string; headline: string; status: string };
  }>;
}

export interface SourceRunRow {
  id: string;
  runType: SourceRunType;
  status: SourceRunStatus;
  startedAt: string;
  finishedAt: string | null;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  errorMessage: string | null;
  contentSource?: SourceRef;
}

export interface SyncStateRow {
  id: string;
  contentSourceId: string;
  cursor: string | null;
  watermark: string | null;
  etag: string | null;
  lastModified: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastErrorMessage: string | null;
  consecutiveFailures: number;
  healthStatus: SourceHealthStatus;
  contentSource?: SourceRef & { enabled?: boolean };
}

export interface SourceDetailRow {
  id: string;
  code: string;
  name: string;
  sourceType: string;
  baseUrl: string;
  feedUrl: string | null;
  enabled: boolean;
  schedule: string | null;
  disabledReason: string | null;
  health: SourceHealthStatus;
  lastSyncedAt: string | null;
  freshnessLagMinutes: number | null;
  itemsLast24h: number;
  candidatesLast24h: number;
  errorsLast24h: number;
  syncState: SyncStateRow | null;
  runs: SourceRunRow[];
  country: { id: string; name: string; flag: string; code: string } | null;
}

export interface HealthSummary {
  totalSources: number;
  healthy: number;
  degraded: number;
  stale: number;
  broken: number;
  rateLimited: number;
}

// ============================================================
// Fetchers
// ============================================================

export interface SourceItemQuery {
  sourceId?: string;
  status?: ProcessingStatus | "";
  page?: number;
  limit?: number;
}

export function getSourceItems(query: SourceItemQuery = {}): Promise<ApiResult<SourceItemRow[]>> {
  const params = new URLSearchParams();
  if (query.sourceId) params.set("sourceId", query.sourceId);
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 25));

  return fetchWithFallback<SourceItemRow[]>(`/source-items?${params}`, () => []);
}

export function getSourceItem(id: string): Promise<ApiResult<SourceItemDetail | null>> {
  return fetchWithFallback<SourceItemDetail | null>(
    `/source-items/${encodeURIComponent(id)}`,
    () => null
  );
}

export function getSourceRuns(sourceId?: string, limit = 50): Promise<ApiResult<SourceRunRow[]>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (sourceId) params.set("sourceId", sourceId);
  return fetchWithFallback<SourceRunRow[]>(`/source-runs?${params}`, () => []);
}

export function getSourceHealth(): Promise<ApiResult<SyncStateRow[]>> {
  return fetchWithFallback<SyncStateRow[]>(`/source-health`, () => []);
}

export function getSourceChanges(options: {
  sourceId?: string;
  materialOnly?: boolean;
  limit?: number;
} = {}): Promise<ApiResult<SourceDiffRow[]>> {
  const params = new URLSearchParams({ limit: String(options.limit ?? 50) });
  if (options.sourceId) params.set("sourceId", options.sourceId);
  if (options.materialOnly) params.set("materialOnly", "1");
  return fetchWithFallback<SourceDiffRow[]>(`/source-changes?${params}`, () => []);
}

export function getSourceDetail(codeOrId: string): Promise<ApiResult<SourceDetailRow | null>> {
  return fetchWithFallback<SourceDetailRow | null>(
    `/content-sources/${encodeURIComponent(codeOrId)}`,
    () => null
  );
}

// ============================================================
// Presentation helpers
// ============================================================

/** Database ratio (0-1) to the 0-100 scale the Blueprint and the model use. */
export function toScore(ratio: number | null | undefined): number {
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) return 0;
  return Math.round(ratio * 100);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1_440)} d ago`;
}

export function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "running";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

/**
 * The internal editorial lane, preferred over the coarser `routingDecision`.
 *
 * `HOLD` and `IGNORE` both persist as IGNORE, and `AUTO_DRAFT` and
 * `CRITICAL_DRAFT_ALERT` both persist as CREATE_DRAFT. An editor looking at a
 * queue benefits from the distinction, so the exact lane is read back from the
 * stored model output when it is there.
 */
export function editorialLane(assessment: AiAssessmentRow | undefined): string {
  return assessment?.rawOutput?.route ?? assessment?.routingDecision ?? "—";
}

/** Why this item landed where it did, in one line. */
export function laneExplanation(assessment: AiAssessmentRow | undefined): string | null {
  return assessment?.rawOutput?.routeExplanation ?? null;
}

/**
 * Whether a draft may be created without an editor choosing a category first.
 * Mirrors the server-side guard so the button explains itself before the click.
 */
export function canAutoDraft(assessment: AiAssessmentRow | undefined): boolean {
  if (!assessment) return false;
  return Boolean(assessment.suggestedCategory);
}
