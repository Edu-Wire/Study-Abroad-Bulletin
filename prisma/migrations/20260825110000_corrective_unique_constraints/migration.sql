-- Phase 1: Corrective unique constraints
--
-- `Article.sourceUrl @unique` and `UniversityIntake @@unique([universityId, term])`
-- were declared in schema.prisma but were never emitted into a migration, so the
-- deployed database has drifted from the schema. This migration closes that drift.
--
-- SAFETY: this migration NEVER deletes rows. If duplicates exist it aborts with a
-- descriptive error so the duplicates can be resolved deliberately. Run
-- `npm run db:preflight:duplicates` first to see exactly what is affected.

-- Guard: abort if duplicate Article.sourceUrl values exist.
DO $$
DECLARE
    dupe_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dupe_count FROM (
        SELECT "sourceUrl"
        FROM "Article"
        WHERE "sourceUrl" IS NOT NULL
        GROUP BY "sourceUrl"
        HAVING COUNT(*) > 1
    ) AS d;

    IF dupe_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add Article_sourceUrl_key: % duplicated sourceUrl value(s) present. Resolve them deliberately (see npm run db:preflight:duplicates) before applying this migration.', dupe_count;
    END IF;
END $$;

-- Guard: abort if duplicate (universityId, term) pairs exist.
DO $$
DECLARE
    dupe_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dupe_count FROM (
        SELECT "universityId", "term"
        FROM "UniversityIntake"
        GROUP BY "universityId", "term"
        HAVING COUNT(*) > 1
    ) AS d;

    IF dupe_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add UniversityIntake_universityId_term_key: % duplicated (universityId, term) pair(s) present. Resolve them deliberately (see npm run db:preflight:duplicates) before applying this migration.', dupe_count;
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Article_sourceUrl_key" ON "Article"("sourceUrl");
CREATE UNIQUE INDEX IF NOT EXISTS "UniversityIntake_universityId_term_key" ON "UniversityIntake"("universityId", "term");
