-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN', 'CONSULTANT', 'EDITOR');

-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('UNIVERSITIES', 'ADMISSIONS', 'SCHOLARSHIPS', 'VISA', 'STUDENT_LIFE', 'CAREER');

-- CreateEnum
CREATE TYPE "ScholarshipType" AS ENUM ('FULLY_FUNDED', 'PARTIAL', 'TUITION_WAIVER');

-- CreateEnum
CREATE TYPE "ImmigrationDeadlineType" AS ENUM ('VISA', 'IMMIGRATION', 'APPLICATION', 'REGISTRATION', 'POLICY', 'SCHOLARSHIP');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('UPCOMING', 'CLOSING_SOON', 'PASSED', 'UPDATED');

-- CreateEnum
CREATE TYPE "DeadlineImportance" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "universitiesCount" INTEGER NOT NULL DEFAULT 0,
    "averageTuition" TEXT NOT NULL,
    "popularIntake" TEXT NOT NULL,
    "updatesCount" INTEGER NOT NULL DEFAULT 0,
    "heroImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "category" "ArticleCategory" NOT NULL,
    "readingTime" TEXT NOT NULL DEFAULT '4 min read',
    "image" TEXT NOT NULL,
    "breaking" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isRss" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "primaryCountryId" TEXT,
    "rssSourceId" TEXT,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCountry" (
    "articleId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "ArticleCountry_pkey" PRIMARY KEY ("articleId","countryId")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "ranking" INTEGER NOT NULL,
    "tuition" TEXT NOT NULL,
    "tuitionValue" DOUBLE PRECISION NOT NULL,
    "courses" TEXT[],
    "scholarships" BOOLEAN NOT NULL DEFAULT true,
    "intake" TEXT NOT NULL DEFAULT 'September 2027',
    "degree" TEXT NOT NULL DEFAULT 'Both',
    "ielts" TEXT NOT NULL DEFAULT '6.5',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityIntake" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "applicationDeadline" TIMESTAMP(3),
    "documentDeadline" TIMESTAMP(3),
    "depositDeadline" TIMESTAMP(3),
    "isRolling" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniversityIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "funding" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "deadlineString" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "type" "ScholarshipType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "universityId" TEXT,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipHostCountry" (
    "scholarshipId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "ScholarshipHostCountry_pkey" PRIMARY KEY ("scholarshipId","countryId")
);

-- CreateTable
CREATE TABLE "ImmigrationDeadline" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "deadlineType" "ImmigrationDeadlineType" NOT NULL,
    "status" "DeadlineStatus" NOT NULL,
    "importance" "DeadlineImportance" NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "relatedArticleTitle" TEXT,
    "relatedArticleHref" TEXT,
    "applicationUrl" TEXT,
    "tags" TEXT[],
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImmigrationDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RSSSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT,
    "category" "ArticleCategory" NOT NULL DEFAULT 'VISA',
    "sourceType" TEXT NOT NULL DEFAULT 'government',
    "feedUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabledReason" TEXT,
    "slugPrefix" TEXT NOT NULL,
    "fallbackImage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RSSSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "cities" TEXT[],
    "services" TEXT[],
    "website" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "established" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "categories" TEXT[],
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TEXT NOT NULL,
    "aboutHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantDestination" (
    "consultantId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "ConsultantDestination_pkey" PRIMARY KEY ("consultantId","countryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "University_slug_key" ON "University"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_slug_key" ON "Scholarship"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ImmigrationDeadline_slug_key" ON "ImmigrationDeadline"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_slug_key" ON "Consultant"("slug");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_primaryCountryId_fkey" FOREIGN KEY ("primaryCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_rssSourceId_fkey" FOREIGN KEY ("rssSourceId") REFERENCES "RSSSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCountry" ADD CONSTRAINT "ArticleCountry_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCountry" ADD CONSTRAINT "ArticleCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityIntake" ADD CONSTRAINT "UniversityIntake_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipHostCountry" ADD CONSTRAINT "ScholarshipHostCountry_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipHostCountry" ADD CONSTRAINT "ScholarshipHostCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImmigrationDeadline" ADD CONSTRAINT "ImmigrationDeadline_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RSSSource" ADD CONSTRAINT "RSSSource_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantDestination" ADD CONSTRAINT "ConsultantDestination_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantDestination" ADD CONSTRAINT "ConsultantDestination_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
