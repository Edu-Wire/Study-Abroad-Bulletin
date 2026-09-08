-- Add sourceId to University for scraped data deduplication
ALTER TABLE "University" ADD COLUMN "sourceId" INTEGER;
CREATE UNIQUE INDEX "University_sourceId_key" ON "University"("sourceId");
