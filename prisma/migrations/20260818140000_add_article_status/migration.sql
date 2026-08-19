-- Phase 2: ArticleStatus editorial workflow support
-- Safe incremental migration — no table drops, no data deletion

-- CreateEnum: Editorial workflow status states
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED', 'REJECTED');

-- AlterTable Article:
--   1. Add status column with DRAFT as safe default for any existing rows
--   2. Make image nullable so drafts can be saved without an image
ALTER TABLE "Article" ADD COLUMN "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Article" ALTER COLUMN "image" DROP NOT NULL;
