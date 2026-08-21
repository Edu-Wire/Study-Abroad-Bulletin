import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, ArticleCategory, ScholarshipType, ImmigrationDeadlineType, DeadlineStatus, DeadlineImportance, UserRole, UserStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { countries, news, universities, scholarships } from "../src/data/mock";
import { immigrationDeadlines } from "../src/data/immigrationDeadlines";
import { consultants } from "../src/data/consultants";
import { rssSources } from "../src/data/rssSources";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const countryCodeMap: Record<string, string> = {
  canada: "CA",
  uk: "GB",
  usa: "US",
  australia: "AU",
  germany: "DE",
  ireland: "IE",
  netherlands: "NL",
  france: "FR",
  "new-zealand": "NZ",
  eu: "EU",
};

const categoryMap: Record<string, ArticleCategory> = {
  Visa: ArticleCategory.VISA,
  Universities: ArticleCategory.UNIVERSITIES,
  Admissions: ArticleCategory.ADMISSIONS,
  Scholarships: ArticleCategory.SCHOLARSHIPS,
  "Student Life": ArticleCategory.STUDENT_LIFE,
  Career: ArticleCategory.CAREER,
};

const scholarshipTypeMap: Record<string, ScholarshipType> = {
  "Fully Funded": ScholarshipType.FULLY_FUNDED,
  Partial: ScholarshipType.PARTIAL,
  "Tuition Waiver": ScholarshipType.TUITION_WAIVER,
};

const deadlineTypeMap: Record<string, ImmigrationDeadlineType> = {
  Visa: ImmigrationDeadlineType.VISA,
  Immigration: ImmigrationDeadlineType.IMMIGRATION,
  Application: ImmigrationDeadlineType.APPLICATION,
  Registration: ImmigrationDeadlineType.REGISTRATION,
  Policy: ImmigrationDeadlineType.POLICY,
  Scholarship: ImmigrationDeadlineType.SCHOLARSHIP,
};

const statusMap: Record<string, DeadlineStatus> = {
  Upcoming: DeadlineStatus.UPCOMING,
  "Closing Soon": DeadlineStatus.CLOSING_SOON,
  Passed: DeadlineStatus.PASSED,
  Updated: DeadlineStatus.UPDATED,
};

const importanceMap: Record<string, DeadlineImportance> = {
  Critical: DeadlineImportance.CRITICAL,
  High: DeadlineImportance.HIGH,
  Medium: DeadlineImportance.MEDIUM,
};

async function main() {
  console.log("🌱 Starting PostgreSQL database seed for abroad_bulletin...");

  // 1. Seed Countries
  console.log("📍 Seeding Countries...");
  for (const c of countries) {
    const code = countryCodeMap[c.id.toLowerCase()] || "UN";
    await prisma.country.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        code,
        flag: c.flag,
        universitiesCount: c.universities,
        averageTuition: c.averageTuition,
        popularIntake: c.popularIntake,
        updatesCount: c.updates,
      },
      create: {
        id: c.id,
        name: c.name,
        code,
        flag: c.flag,
        universitiesCount: c.universities,
        averageTuition: c.averageTuition,
        popularIntake: c.popularIntake,
        updatesCount: c.updates,
      },
    });
  }

  // 2. Seed RSS Sources
  console.log("📡 Seeding RSS Sources...");
  for (const s of rssSources) {
    const country = countries.find((c) => c.name.toLowerCase() === s.country.toLowerCase());
    await prisma.rSSSource.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        countryId: country ? country.id : null,
        category: categoryMap[s.category] || ArticleCategory.VISA,
        sourceType: s.sourceType,
        feedUrl: s.feedUrl,
        enabled: s.enabled,
        disabledReason: s.disabledReason,
        slugPrefix: s.slugPrefix,
        fallbackImage: s.fallbackImage,
      },
      create: {
        id: s.id,
        name: s.name,
        countryId: country ? country.id : null,
        category: categoryMap[s.category] || ArticleCategory.VISA,
        sourceType: s.sourceType,
        feedUrl: s.feedUrl,
        enabled: s.enabled,
        disabledReason: s.disabledReason,
        slugPrefix: s.slugPrefix,
        fallbackImage: s.fallbackImage,
      },
    });
  }

  // 3. Seed Articles
  console.log("📰 Seeding News Articles...");
  for (const a of news) {
    const country = countries.find((c) => c.name.toLowerCase() === a.country.toLowerCase());
    const article = await prisma.article.upsert({
      where: { slug: a.slug },
      update: {
        headline: a.headline,
        summary: a.summary,
        category: categoryMap[a.category] || ArticleCategory.UNIVERSITIES,
        readingTime: a.readingTime,
        image: a.image,
        breaking: a.breaking ?? false,
        primaryCountryId: country ? country.id : null,
      },
      create: {
        slug: a.slug,
        headline: a.headline,
        summary: a.summary,
        category: categoryMap[a.category] || ArticleCategory.UNIVERSITIES,
        readingTime: a.readingTime,
        image: a.image,
        breaking: a.breaking ?? false,
        primaryCountryId: country ? country.id : null,
      },
    });

    if (country) {
      await prisma.articleCountry.upsert({
        where: {
          articleId_countryId: {
            articleId: article.id,
            countryId: country.id,
          },
        },
        update: {},
        create: {
          articleId: article.id,
          countryId: country.id,
        },
      });
    }
  }

  // 4. Seed Universities & Intakes
  console.log("🎓 Seeding Universities & Academic Intakes...");
  for (const u of universities) {
    const country = countries.find((c) => c.name.toLowerCase() === u.country.toLowerCase());
    if (!country) continue;

    const university = await prisma.university.upsert({
      where: { slug: u.id },
      update: {
        name: u.name,
        initials: u.initials,
        countryId: country.id,
        city: u.city,
        ranking: u.ranking,
        tuition: u.tuition,
        tuitionValue: u.tuitionValue,
        courses: u.courses,
        scholarships: u.scholarships,
        intake: u.intake,
        degree: u.degree,
        ielts: u.ielts,
      },
      create: {
        slug: u.id,
        name: u.name,
        initials: u.initials,
        countryId: country.id,
        city: u.city,
        ranking: u.ranking,
        tuition: u.tuition,
        tuitionValue: u.tuitionValue,
        courses: u.courses,
        scholarships: u.scholarships,
        intake: u.intake,
        degree: u.degree,
        ielts: u.ielts,
      },
    });

    // Create default intake for university
    await prisma.universityIntake.create({
      data: {
        universityId: university.id,
        term: u.intake,
        status: "Open",
      },
    });
  }

  // 5. Seed Scholarships
  console.log("🏆 Seeding Scholarships...");
  for (const s of scholarships) {
    const country = countries.find((c) => c.name.toLowerCase() === s.country.toLowerCase());
    const scholarship = await prisma.scholarship.upsert({
      where: { slug: s.id },
      update: {
        name: s.name,
        organization: s.organization,
        funding: s.funding,
        degree: s.degree,
        deadlineString: s.deadline,
        eligibility: s.eligibility,
        type: scholarshipTypeMap[s.type] || ScholarshipType.FULLY_FUNDED,
      },
      create: {
        slug: s.id,
        name: s.name,
        organization: s.organization,
        funding: s.funding,
        degree: s.degree,
        deadlineString: s.deadline,
        eligibility: s.eligibility,
        type: scholarshipTypeMap[s.type] || ScholarshipType.FULLY_FUNDED,
      },
    });

    if (country) {
      await prisma.scholarshipHostCountry.upsert({
        where: {
          scholarshipId_countryId: {
            scholarshipId: scholarship.id,
            countryId: country.id,
          },
        },
        update: {},
        create: {
          scholarshipId: scholarship.id,
          countryId: country.id,
        },
      });
    }
  }

  // 6. Seed Immigration Deadlines
  console.log("⏳ Seeding Immigration & Policy Deadlines...");
  for (const d of immigrationDeadlines) {
    const country = countries.find(
      (c) => c.name.toLowerCase() === d.country.toLowerCase() || c.id.toLowerCase() === d.countryCode.toLowerCase()
    );
    if (!country) continue;

    await prisma.immigrationDeadline.upsert({
      where: { slug: d.slug },
      update: {
        title: d.title,
        countryId: country.id,
        deadlineDate: new Date(d.deadline),
        deadlineType: deadlineTypeMap[d.deadlineType] || ImmigrationDeadlineType.VISA,
        status: statusMap[d.status] || DeadlineStatus.UPCOMING,
        importance: importanceMap[d.importance] || DeadlineImportance.HIGH,
        description: d.description,
        source: d.source,
        lastUpdated: d.lastUpdated,
        relatedArticleTitle: d.relatedArticle?.title,
        relatedArticleHref: d.relatedArticle?.href,
        applicationUrl: d.applicationUrl,
        tags: d.tags,
        content: d.content,
      },
      create: {
        id: d.id,
        slug: d.slug,
        title: d.title,
        countryId: country.id,
        deadlineDate: new Date(d.deadline),
        deadlineType: deadlineTypeMap[d.deadlineType] || ImmigrationDeadlineType.VISA,
        status: statusMap[d.status] || DeadlineStatus.UPCOMING,
        importance: importanceMap[d.importance] || DeadlineImportance.HIGH,
        description: d.description,
        source: d.source,
        lastUpdated: d.lastUpdated,
        relatedArticleTitle: d.relatedArticle?.title,
        relatedArticleHref: d.relatedArticle?.href,
        applicationUrl: d.applicationUrl,
        tags: d.tags,
        content: d.content,
      },
    });
  }

  // 7. Seed Consultants / Partners
  console.log("🏢 Seeding Consultants & Partners Directory...");
  for (const c of consultants) {
    const hqCountry = countries.find(
      (cnt) => cnt.name.toLowerCase() === c.country.toLowerCase() || cnt.id.toLowerCase() === c.countryCode.toLowerCase()
    );
    if (!hqCountry) continue;

    const consultant = await prisma.consultant.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        logo: c.logo,
        description: c.description,
        countryId: hqCountry.id,
        cities: c.cities,
        services: c.services,
        website: c.website,
        email: c.email,
        phone: c.phone,
        verified: c.verified,
        featured: c.featured,
        rating: c.rating,
        reviewCount: c.reviewCount,
        established: c.established,
        address: c.address,
        categories: c.categories,
        sponsored: c.sponsored,
        lastUpdated: c.lastUpdated,
        aboutHtml: c.aboutHtml,
      },
      create: {
        id: c.id,
        slug: c.slug,
        name: c.name,
        logo: c.logo,
        description: c.description,
        countryId: hqCountry.id,
        cities: c.cities,
        services: c.services,
        website: c.website,
        email: c.email,
        phone: c.phone,
        verified: c.verified,
        featured: c.featured,
        rating: c.rating,
        reviewCount: c.reviewCount,
        established: c.established,
        address: c.address,
        categories: c.categories,
        sponsored: c.sponsored,
        lastUpdated: c.lastUpdated,
        aboutHtml: c.aboutHtml,
      },
    });

    // Destination countries
    for (const destName of c.destinations) {
      const destCountry = countries.find((cnt) => cnt.name.toLowerCase() === destName.toLowerCase());
      if (destCountry) {
        await prisma.consultantDestination.upsert({
          where: {
            consultantId_countryId: {
              consultantId: consultant.id,
              countryId: destCountry.id,
            },
          },
          update: {},
          create: {
            consultantId: consultant.id,
            countryId: destCountry.id,
          },
        });
      }
    }
  }

  // 8. Seed Default Staff & User Accounts
  console.log("👤 Ensuring UserRole schema and seeding Staff accounts...");
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
          CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
        END IF;
      END$$;
    `);
    await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "UserStatus" DEFAULT 'ACTIVE';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" timestamp(3);`);
  } catch (e) {
    console.log("Schema columns verified.");
  }

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash("Admin@123456", salt);
  const editorPassword = await bcrypt.hash("Editor@123456", salt);
  const studentPassword = await bcrypt.hash("Student@123456", salt);

  // Super Admin
  await prisma.user.upsert({
    where: { email: "admin@abroadbulletin.com" },
    update: {
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      firstName: "Admin",
      lastName: "Super",
    },
    create: {
      email: "admin@abroadbulletin.com",
      password: adminPassword,
      firstName: "Admin",
      lastName: "Super",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Editor
  await prisma.user.upsert({
    where: { email: "editor@abroadbulletin.com" },
    update: {
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
      firstName: "Senior",
      lastName: "Editor",
    },
    create: {
      email: "editor@abroadbulletin.com",
      password: editorPassword,
      firstName: "Senior",
      lastName: "Editor",
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
    },
  });

  // Student
  await prisma.user.upsert({
    where: { email: "student@abroadbulletin.com" },
    update: {
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      firstName: "Alex",
      lastName: "Student",
    },
    create: {
      email: "student@abroadbulletin.com",
      password: studentPassword,
      firstName: "Alex",
      lastName: "Student",
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
  });

  console.log("✅ PostgreSQL Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
