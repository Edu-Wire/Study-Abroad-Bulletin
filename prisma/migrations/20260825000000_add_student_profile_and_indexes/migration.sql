-- Phase 3: StudentProfile model & performance composite indexes
-- Safe incremental migration — additive only, zero table drops, zero data deletion

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCountries" TEXT[],
    "studyLevel" TEXT,
    "degree" TEXT,
    "branch" TEXT,
    "preferredIntake" TEXT,
    "budgetRange" TEXT,
    "interests" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StudentProfile_userId_fkey'
    ) THEN
        ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex on Article
CREATE INDEX IF NOT EXISTS "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "Article_primaryCountryId_publishedAt_idx" ON "Article"("primaryCountryId", "publishedAt");
CREATE INDEX IF NOT EXISTS "Article_rssSourceId_idx" ON "Article"("rssSourceId");

-- CreateIndex on University
CREATE INDEX IF NOT EXISTS "University_countryId_idx" ON "University"("countryId");

-- CreateIndex on ImmigrationDeadline
CREATE INDEX IF NOT EXISTS "ImmigrationDeadline_countryId_deadlineDate_idx" ON "ImmigrationDeadline"("countryId", "deadlineDate");
