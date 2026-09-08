/**
 * Prisma-backed `IngestionRepos` — the one place Developer B's editorial
 * vocabulary meets Developer A's database enums.
 *
 * `classification.service` and `candidate.service` are deliberately
 * Prisma-free: they speak in editorial routes (`AUTO_DRAFT`, `HOLD`,
 * `CRITICAL_DRAFT_ALERT`) and candidate states (`AWAITING_REVIEW`,
 * `DRAFT_PENDING`, `DISMISSED_BY_EDITOR`) taken from Blueprint 10.3. The schema
 * enums are coarser. Rather than weaken either side, this adapter translates,
 * and every translation that loses information writes the original value into
 * `AiAssessment.rawOutput` so an audit can still reconstruct the exact lane.
 *
 * Score convention: the assessment schema is 0-100; the `Float` columns store
 * 0-1, which is what the ingestion tables already hold. The 0-100 breakdown
 * survives verbatim in `rawOutput`.
 */

import type { ArticleCategory, CandidateStatus, Prisma, RoutingDecision } from "@prisma/client";

import { prisma } from "../../../config/prisma.js";
import type { IngestionRepos } from "../adapters/base/types";
import type { EditorialRoute } from "../schemas/aiAssessment.schema";

/** `RoutingDecision` has no HOLD lane; both non-candidate routes land on IGNORE. */
const ROUTE_TO_DECISION: Record<EditorialRoute, RoutingDecision> = {
  IGNORE: "IGNORE",
  HOLD: "IGNORE",
  REVIEW: "REVIEW",
  AUTO_DRAFT: "CREATE_DRAFT",
  CRITICAL_DRAFT_ALERT: "CREATE_DRAFT",
};

/**
 * Candidate states from `candidate.service#resolveStatus` mapped onto
 * `CandidateStatus`. `SOURCE_UPDATED` deliberately becomes PENDING: an item
 * whose source moved goes back in front of an editor (11.2), it is not silently
 * re-drafted.
 */
const STATUS_TO_CANDIDATE_STATUS: Record<string, CandidateStatus> = {
  AWAITING_REVIEW: "PENDING",
  HELD: "PENDING",
  IGNORED: "IGNORED",
  DRAFT_PENDING: "AUTO_DRAFTED",
  DRAFT_CREATED: "DRAFT_CREATED",
  SOURCE_UPDATED: "PENDING",
  DISMISSED_BY_EDITOR: "IGNORED",
};

/** PUBLISH exists in the enum; nothing in Phase 1 may produce it (10.3). */
export function toRoutingDecision(route: string): RoutingDecision {
  return ROUTE_TO_DECISION[route as EditorialRoute] ?? "REVIEW";
}

export function toCandidateStatus(status: string): CandidateStatus {
  return STATUS_TO_CANDIDATE_STATUS[status] ?? "PENDING";
}

/** 0-100 -> 0-1, clamped. The columns are ratios; the schema is percentages. */
function ratio(score: unknown): number {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value / 100));
}

/** The 0-100 urgency score as the band the operations screen displays. */
export function urgencyBand(urgency: unknown): string {
  const value = Number(urgency);
  if (!Number.isFinite(value)) return "LOW";
  if (value >= 80) return "CRITICAL";
  if (value >= 60) return "HIGH";
  if (value >= 35) return "MEDIUM";
  return "LOW";
}

/** `readingTime` is a display string in the CMS, a number in the draft payload. */
function readingTimeLabel(minutes: unknown): string {
  const value = Number(minutes);
  const safe = Number.isFinite(value) && value > 0 ? Math.ceil(value) : 1;
  return `${safe} min read`;
}

export interface PrismaReposOptions {
  /** Version the assessment was made against; stored for reproducibility. */
  versionId?: string | null;
  /** Who triggered this run — a user id, or a `system:` identifier. */
  actorId?: string;
}

/**
 * Build the repository set for one classification/candidate run.
 *
 * Scoped per run rather than module-level because the version under assessment
 * is part of the write, and threading it through every payload would mean
 * changing service signatures both developers already froze.
 */
export function createPrismaRepos(options: PrismaReposOptions = {}): IngestionRepos {
  const versionId = options.versionId ?? null;

  return {
    aiAssessment: {
      async create(payload) {
        return prisma.aiAssessment.create({
          data: {
            sourceItemId: String(payload.sourceItemId),
            versionId,
            relevanceScore: ratio(payload.studyAbroadRelevance),
            confidenceScore: ratio(payload.confidence),
            urgency: urgencyBand(payload.urgency),
            internalCategory: String(payload.primaryCategory ?? "UNCLASSIFIED"),
            // Null is a real answer: "no honest CMS category, an editor picks".
            suggestedCategory: (payload.cmsCategory as ArticleCategory | null) ?? null,
            routingDecision: toRoutingDecision(String(payload.route)),
            suggestedHeadline: (payload.suggestedHeadline as string) ?? null,
            suggestedSummary: (payload.shortSummary as string) ?? null,
            suggestedContent: (payload.suggestedContent as string) ?? null,
            // Reason codes are the machine-readable takeaways audits group by.
            keyTakeaways: (payload.reasonCodes as string[]) ?? [],
            targetAudience: (payload.affectedNationalities as string[]) ?? [],
            model: String(payload.modelKey ?? "unknown"),
            promptVersion: String(payload.promptVersion ?? "unknown"),
            // Full fidelity, including the lane the enum could not express.
            rawOutput: payload as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
      },
    },

    articleCandidate: {
      /**
       * Upsert by source item — the idempotency key that makes the 72-hour
       * discovery overlap safe.
       *
       * Partial payloads are expected: `ignoreCandidate` sends a status and a
       * reason only. An update merges them; a create needs the draft payload,
       * and says so rather than inventing a headline.
       */
      async upsertBySourceItem(payload) {
        const sourceItemId = String(payload.sourceItemId);
        const draft = (payload.draftPayload ?? {}) as Record<string, unknown>;
        const status = toCandidateStatus(String(payload.status ?? "AWAITING_REVIEW"));

        const update: Record<string, unknown> = { status };
        if (payload.assessmentId) update.aiAssessmentId = payload.assessmentId;
        if (draft.title) update.headline = draft.title;
        if (payload.shortSummary) update.summary = payload.shortSummary;
        if (draft.body !== undefined) update.content = draft.body ?? null;
        if (draft.category) update.category = draft.category as ArticleCategory;
        if (draft.primaryCountryId !== undefined) update.primaryCountryId = draft.primaryCountryId;
        if (payload.confidence !== undefined) update.confidence = ratio(payload.confidence);
        if (payload.dismissedReason) update.rejectionReason = payload.dismissedReason;
        if (payload.dismissedBy) {
          update.reviewedByUserId = String(payload.dismissedBy);
          update.reviewedAt = new Date();
        }

        const existing = await prisma.articleCandidate.findUnique({
          where: { sourceItemId },
          select: { id: true },
        });

        if (existing) {
          const candidate = await prisma.articleCandidate.update({
            where: { sourceItemId },
            data: update,
            select: { id: true, status: true },
          });
          return { id: candidate.id, status: candidate.status };
        }

        if (!draft.title) {
          throw new Error(
            `Cannot create a candidate for source item ${sourceItemId} without a draft payload`
          );
        }

        const candidate = await prisma.articleCandidate.create({
          data: {
            sourceItemId,
            aiAssessmentId: (payload.assessmentId as string) ?? null,
            headline: String(draft.title),
            summary: String(payload.shortSummary ?? draft.summary ?? draft.title),
            content: (draft.body as string) ?? null,
            // The column is non-null with a VISA default. When the mapping
            // refused a category the assessment's `suggestedCategory` is null,
            // and `create-draft` refuses until an editor chooses one.
            ...(draft.category ? { category: draft.category as ArticleCategory } : {}),
            primaryCountryId: (draft.primaryCountryId as string) ?? null,
            confidence: ratio(payload.confidence),
            status,
          },
          select: { id: true, status: true },
        });
        return { id: candidate.id, status: candidate.status };
      },

      async findBySourceItem(sourceItemId) {
        return prisma.articleCandidate.findUnique({ where: { sourceItemId } });
      },
    },

    article: {
      /**
       * Always a DRAFT. `sourceUrl` is unique in the CMS, so an article already
       * written from this source is reused rather than colliding — the
       * "run sync again, no duplicate" guarantee reaching the CMS layer.
       */
      async createDraftFromCandidate(payload) {
        const sourceUrl = String(payload.sourceUrl);
        const candidateId = String(payload.candidateId);

        let article = await prisma.article.findFirst({
          where: { sourceUrl },
          select: { id: true, slug: true },
        });

        if (!article) {
          article = await prisma.article.create({
            data: {
              slug: String(payload.slug),
              headline: String(payload.title),
              summary: String(payload.summary),
              content: (payload.body as string) ?? null,
              category: payload.category as ArticleCategory,
              readingTime: readingTimeLabel(payload.readingTime),
              // Hardcoded, never derived. Phase 1 has no auto-publish path.
              status: "DRAFT",
              primaryCountryId: (payload.primaryCountryId as string) ?? null,
              sourceUrl,
              sourceName: String(payload.sourceAttribution ?? "Official source"),
              isRss: false,
            },
            select: { id: true, slug: true },
          });
        }

        await prisma.articleCandidate.update({
          where: { id: candidateId },
          data: { articleId: article.id, status: "DRAFT_CREATED" },
        });

        return article;
      },
    },

    articleSourceLink: {
      async link(payload) {
        await prisma.articleSourceLink.upsert({
          where: {
            articleId_sourceItemId: {
              articleId: String(payload.articleId),
              sourceItemId: String(payload.sourceItemId),
            },
          },
          create: {
            articleId: String(payload.articleId),
            sourceItemId: String(payload.sourceItemId),
            versionId: (payload.sourceVersionId as string) ?? versionId,
            linkType: "PRIMARY_SOURCE",
          },
          update: { versionId: (payload.sourceVersionId as string) ?? versionId },
        });
      },
    },

    country: {
      /**
       * Registry codes are ISO-3166 alpha-2 plus the `EU` region code; the
       * Country table keys on its own slug id and stores `GB` for the UK. An
       * absent code is simply left out — a draft with no primary country is the
       * correct outcome for an EU-wide policy item.
       */
      async findIdsByCodes(codes) {
        if (codes.length === 0) return {};
        const toIso = (code: string) => (code === "UK" ? "GB" : code);
        const rows = await prisma.country.findMany({
          where: { code: { in: codes.map(toIso) } },
          select: { id: true, code: true },
        });
        const byCode = new Map(rows.map((row) => [row.code, row.id]));
        return Object.fromEntries(
          codes
            .map((code) => [code, byCode.get(toIso(code))] as const)
            .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
        );
      },
    },
  };
}
