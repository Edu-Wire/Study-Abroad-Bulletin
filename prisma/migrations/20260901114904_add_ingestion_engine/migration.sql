/*
  Warnings:

  - Made the column `status` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('API', 'ATOM', 'RSS', 'WEB', 'WATCH', 'DATA');

-- CreateEnum
CREATE TYPE "SourceHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'STALE', 'BROKEN', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "SourceRunType" AS ENUM ('LIVE', 'BACKFILL', 'RECONCILE', 'MANUAL');

-- CreateEnum
CREATE TYPE "SourceRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('DISCOVERED', 'DETAIL_PENDING', 'ENRICHED', 'NORMALIZED', 'VERSIONED', 'SCORED', 'CLASSIFIED', 'ROUTED', 'IMPORTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "RoutingDecision" AS ENUM ('IGNORE', 'REVIEW', 'CREATE_DRAFT', 'PUBLISH');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_DRAFTED', 'DRAFT_CREATED', 'IGNORED');

-- CreateEnum
CREATE TYPE "SourceLinkType" AS ENUM ('PRIMARY_SOURCE', 'REFERENCE', 'CORROBORATING');

-- CreateEnum
CREATE TYPE "BackfillStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "WindowStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "status" SET NOT NULL;

-- CreateTable
CREATE TABLE "ContentSource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'RSS',
    "baseUrl" TEXT NOT NULL,
    "feedUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledReason" TEXT,
    "config" JSONB,
    "schedule" TEXT,
    "categoryHint" "ArticleCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSyncState" (
    "id" TEXT NOT NULL,
    "contentSourceId" TEXT NOT NULL,
    "cursor" TEXT,
    "watermark" TIMESTAMP(3),
    "etag" TEXT,
    "lastModified" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "healthStatus" "SourceHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRun" (
    "id" TEXT NOT NULL,
    "contentSourceId" TEXT NOT NULL,
    "runType" "SourceRunType" NOT NULL DEFAULT 'LIVE',
    "status" "SourceRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "itemsCreated" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceItem" (
    "id" TEXT NOT NULL,
    "contentSourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "canonicalUrlHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'DISCOVERED',
    "countryId" TEXT,
    "language" TEXT DEFAULT 'en',
    "nativeTopics" TEXT[],
    "rawMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDocumentVersion" (
    "id" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "rawBody" TEXT,
    "cleanHtml" TEXT,
    "cleanText" TEXT,
    "title" TEXT,
    "authors" TEXT[],
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "httpStatus" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDiff" (
    "id" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "priorVersionId" TEXT NOT NULL,
    "nextVersionId" TEXT NOT NULL,
    "isMaterial" BOOLEAN NOT NULL DEFAULT false,
    "changeSummary" TEXT,
    "addedTokens" INTEGER NOT NULL DEFAULT 0,
    "removedTokens" INTEGER NOT NULL DEFAULT 0,
    "patch" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceDiff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAssessment" (
    "id" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "versionId" TEXT,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "urgency" TEXT,
    "internalCategory" TEXT NOT NULL,
    "suggestedCategory" "ArticleCategory",
    "routingDecision" "RoutingDecision" NOT NULL DEFAULT 'REVIEW',
    "suggestedHeadline" TEXT,
    "suggestedSummary" TEXT,
    "suggestedContent" TEXT,
    "keyTakeaways" TEXT[],
    "targetAudience" TEXT[],
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "rawOutput" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCandidate" (
    "id" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "aiAssessmentId" TEXT,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "category" "ArticleCategory" NOT NULL DEFAULT 'VISA',
    "primaryCountryId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "articleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleSourceLink" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "versionId" TEXT,
    "linkType" "SourceLinkType" NOT NULL DEFAULT 'PRIMARY_SOURCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleSourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackfillRun" (
    "id" TEXT NOT NULL,
    "contentSourceId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "BackfillStatus" NOT NULL DEFAULT 'PENDING',
    "totalWindows" INTEGER NOT NULL DEFAULT 0,
    "completedWindows" INTEGER NOT NULL DEFAULT 0,
    "failedWindows" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackfillRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackfillWindow" (
    "id" TEXT NOT NULL,
    "backfillRunId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "cursor" TEXT,
    "pageNumber" INTEGER,
    "status" "WindowStatus" NOT NULL DEFAULT 'PENDING',
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackfillWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentSource_code_key" ON "ContentSource"("code");

-- CreateIndex
CREATE INDEX "ContentSource_countryId_idx" ON "ContentSource"("countryId");

-- CreateIndex
CREATE INDEX "ContentSource_sourceType_enabled_idx" ON "ContentSource"("sourceType", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SourceSyncState_contentSourceId_key" ON "SourceSyncState"("contentSourceId");

-- CreateIndex
CREATE INDEX "SourceRun_contentSourceId_startedAt_status_idx" ON "SourceRun"("contentSourceId", "startedAt", "status");

-- CreateIndex
CREATE INDEX "SourceItem_publishedAt_idx" ON "SourceItem"("publishedAt");

-- CreateIndex
CREATE INDEX "SourceItem_countryId_contentSourceId_idx" ON "SourceItem"("countryId", "contentSourceId");

-- CreateIndex
CREATE INDEX "SourceItem_processingStatus_idx" ON "SourceItem"("processingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SourceItem_contentSourceId_externalId_key" ON "SourceItem"("contentSourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceItem_contentSourceId_canonicalUrlHash_key" ON "SourceItem"("contentSourceId", "canonicalUrlHash");

-- CreateIndex
CREATE INDEX "SourceDocumentVersion_sourceItemId_capturedAt_idx" ON "SourceDocumentVersion"("sourceItemId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceDocumentVersion_sourceItemId_contentHash_key" ON "SourceDocumentVersion"("sourceItemId", "contentHash");

-- CreateIndex
CREATE INDEX "SourceDiff_sourceItemId_detectedAt_idx" ON "SourceDiff"("sourceItemId", "detectedAt");

-- CreateIndex
CREATE INDEX "AiAssessment_sourceItemId_createdAt_idx" ON "AiAssessment"("sourceItemId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAssessment_routingDecision_idx" ON "AiAssessment"("routingDecision");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCandidate_sourceItemId_key" ON "ArticleCandidate"("sourceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCandidate_aiAssessmentId_key" ON "ArticleCandidate"("aiAssessmentId");

-- CreateIndex
CREATE INDEX "ArticleCandidate_status_createdAt_idx" ON "ArticleCandidate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleCandidate_primaryCountryId_idx" ON "ArticleCandidate"("primaryCountryId");

-- CreateIndex
CREATE INDEX "ArticleSourceLink_sourceItemId_idx" ON "ArticleSourceLink"("sourceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleSourceLink_articleId_sourceItemId_key" ON "ArticleSourceLink"("articleId", "sourceItemId");

-- CreateIndex
CREATE INDEX "BackfillRun_contentSourceId_status_idx" ON "BackfillRun"("contentSourceId", "status");

-- CreateIndex
CREATE INDEX "BackfillWindow_backfillRunId_status_idx" ON "BackfillWindow"("backfillRunId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BackfillWindow_backfillRunId_windowStart_windowEnd_key" ON "BackfillWindow"("backfillRunId", "windowStart", "windowEnd");

-- AddForeignKey
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSyncState" ADD CONSTRAINT "SourceSyncState_contentSourceId_fkey" FOREIGN KEY ("contentSourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceRun" ADD CONSTRAINT "SourceRun_contentSourceId_fkey" FOREIGN KEY ("contentSourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceItem" ADD CONSTRAINT "SourceItem_contentSourceId_fkey" FOREIGN KEY ("contentSourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDocumentVersion" ADD CONSTRAINT "SourceDocumentVersion_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDiff" ADD CONSTRAINT "SourceDiff_priorVersionId_fkey" FOREIGN KEY ("priorVersionId") REFERENCES "SourceDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceDiff" ADD CONSTRAINT "SourceDiff_nextVersionId_fkey" FOREIGN KEY ("nextVersionId") REFERENCES "SourceDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SourceDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCandidate" ADD CONSTRAINT "ArticleCandidate_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCandidate" ADD CONSTRAINT "ArticleCandidate_aiAssessmentId_fkey" FOREIGN KEY ("aiAssessmentId") REFERENCES "AiAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCandidate" ADD CONSTRAINT "ArticleCandidate_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleSourceLink" ADD CONSTRAINT "ArticleSourceLink_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleSourceLink" ADD CONSTRAINT "ArticleSourceLink_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "SourceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleSourceLink" ADD CONSTRAINT "ArticleSourceLink_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SourceDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackfillRun" ADD CONSTRAINT "BackfillRun_contentSourceId_fkey" FOREIGN KEY ("contentSourceId") REFERENCES "ContentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackfillWindow" ADD CONSTRAINT "BackfillWindow_backfillRunId_fkey" FOREIGN KEY ("backfillRunId") REFERENCES "BackfillRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
