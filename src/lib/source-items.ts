/**
 * Source Items - the candidate/evidence stream (Blueprint 11, GET /source-items).
 *
 * Unlike the sources catalog, there is no static fallback here: an item only
 * exists once the worker has discovered it, so without a live API there is
 * nothing honest to show but an empty list with a notice.
 */

import { fetchWithFallback, postAction, type ApiResult } from "@/lib/ingestion-api";

export interface AiAssessmentSummary {
  id: string;
  relevanceScore: number;
  confidenceScore: number;
  urgency: string | null;
  internalCategory: string;
  suggestedCategory: string | null;
  routingDecision: "IGNORE" | "REVIEW" | "CREATE_DRAFT" | "PUBLISH" | string;
  suggestedHeadline: string | null;
  suggestedSummary: string | null;
  keyTakeaways: string[];
  model: string;
  createdAt: string;
}

export interface ArticleCandidateSummary {
  id: string;
  headline: string;
  summary: string;
  category: string;
  confidence: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "AUTO_DRAFTED" | "DRAFT_CREATED" | "IGNORED" | string;
  articleId: string | null;
  rejectionReason: string | null;
}

export interface SourceItemSummary {
  id: string;
  externalId: string | null;
  canonicalUrl: string;
  title: string;
  summary: string | null;
  publishedAt: string | null;
  discoveredAt: string;
  processingStatus: string;
  countryId: string | null;
  nativeTopics: string[];
  contentSource: { id: string; name: string; code: string; sourceType: string };
  candidate: ArticleCandidateSummary | null;
  assessments: AiAssessmentSummary[];
}

export interface SourceDocumentVersionSummary {
  id: string;
  versionNumber: number;
  title: string | null;
  cleanText: string | null;
  cleanHtml: string | null;
  authors: string[];
  httpStatus: number | null;
  capturedAt: string;
  diffsFromPrior: SourceDiffSummary[];
}

export interface SourceDiffSummary {
  id: string;
  isMaterial: boolean;
  changeSummary: string | null;
  addedTokens: number;
  removedTokens: number;
  detectedAt: string;
}

export interface ArticleLinkSummary {
  id: string;
  linkType: string;
  article: { id: string; slug: string; headline: string; status: string };
}

export interface SourceItemDetail extends SourceItemSummary {
  versions: SourceDocumentVersionSummary[];
  articleLinks: ArticleLinkSummary[];
}

/**
 * List source items, optionally filtered by content source or processing
 * status. Backend paginates; the admin list shows one page at a time (default
 * 50) rather than building full page-through controls Phase 1 doesn't need.
 */
export async function getSourceItems(params: {
  sourceId?: string;
  status?: string;
  limit?: number;
}): Promise<ApiResult<SourceItemSummary[]>> {
  const query = new URLSearchParams();
  if (params.sourceId) query.set("sourceId", params.sourceId);
  if (params.status) query.set("status", params.status);
  query.set("limit", String(params.limit ?? 50));

  return fetchWithFallback<SourceItemSummary[]>(`/admin/source-items?${query.toString()}`, () => []);
}

/** Full detail for one source item: versions, diffs, AI assessments, candidate, article link. */
export async function getSourceItemDetail(id: string): Promise<ApiResult<SourceItemDetail | null>> {
  return fetchWithFallback<SourceItemDetail | null>(
    `/admin/source-items/${encodeURIComponent(id)}`,
    () => null
  );
}

export async function reclassifySourceItem(id: string, versionId?: string) {
  return postAction(`/admin/source-items/${encodeURIComponent(id)}/reclassify`, versionId ? { versionId } : undefined);
}

export async function createDraftFromSourceItem(id: string) {
  return postAction(`/admin/source-items/${encodeURIComponent(id)}/create-draft`);
}

export async function ignoreSourceItem(id: string, reason?: string) {
  return postAction(`/admin/source-items/${encodeURIComponent(id)}/ignore`, reason ? { reason } : undefined);
}

export const ROUTING_LABELS: Record<string, string> = {
  IGNORE: "Ignore",
  REVIEW: "Needs Review",
  CREATE_DRAFT: "Create Draft",
  PUBLISH: "Publish",
};

export const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  AUTO_DRAFTED: "Auto-Drafted",
  DRAFT_CREATED: "Draft Created",
  IGNORED: "Ignored",
};
