-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "previewToken" TEXT,
ADD COLUMN     "previewExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Article_previewToken_key" ON "Article"("previewToken");
