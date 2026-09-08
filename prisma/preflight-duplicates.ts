/**
 * Read-only production preflight for the corrective unique constraints added in
 * migration `20260825110000_corrective_unique_constraints`.
 *
 * This script NEVER writes, updates, or deletes anything. It reports the exact
 * rows that would violate the new constraints so they can be resolved
 * deliberately by a human before the migration is applied.
 *
 * Usage: npm run db:preflight:duplicates
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface ArticleDuplicate {
  sourceUrl: string;
  count: bigint;
  ids: string[];
  headlines: string[];
}

interface IntakeDuplicate {
  universityId: string;
  term: string;
  count: bigint;
  ids: string[];
}

async function main() {
  console.log("Preflight: duplicate inspection for corrective unique constraints");
  console.log("This script is strictly read-only.\n");

  const articleDuplicates = await prisma.$queryRaw<ArticleDuplicate[]>`
    SELECT "sourceUrl",
           COUNT(*)                        AS count,
           ARRAY_AGG("id" ORDER BY "createdAt")       AS ids,
           ARRAY_AGG("headline" ORDER BY "createdAt") AS headlines
    FROM "Article"
    WHERE "sourceUrl" IS NOT NULL
    GROUP BY "sourceUrl"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `;

  console.log(`Article.sourceUrl duplicates: ${articleDuplicates.length}`);
  for (const dupe of articleDuplicates) {
    console.log(`  sourceUrl: ${dupe.sourceUrl}`);
    console.log(`    ${dupe.count} rows -> ${dupe.ids.join(", ")}`);
    dupe.headlines.forEach((headline, index) => {
      console.log(`      [${index}] ${headline}`);
    });
  }

  const intakeDuplicates = await prisma.$queryRaw<IntakeDuplicate[]>`
    SELECT "universityId",
           "term",
           COUNT(*)                              AS count,
           ARRAY_AGG("id" ORDER BY "createdAt")   AS ids
    FROM "UniversityIntake"
    GROUP BY "universityId", "term"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `;

  console.log(`\nUniversityIntake (universityId, term) duplicates: ${intakeDuplicates.length}`);
  for (const dupe of intakeDuplicates) {
    console.log(`  university=${dupe.universityId} term=${dupe.term}`);
    console.log(`    ${dupe.count} rows -> ${dupe.ids.join(", ")}`);
  }

  const total = articleDuplicates.length + intakeDuplicates.length;
  if (total === 0) {
    console.log("\nNo duplicates found. The corrective migration can be applied safely.");
  } else {
    console.log(
      `\n${total} duplicate group(s) found. Resolve these deliberately before applying` +
        " migration 20260825110000_corrective_unique_constraints — it will abort rather" +
        " than delete data."
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Preflight failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
