/**
 * prisma/import-programs.ts
 *
 * Reads all country JSON files from Data/ and upserts University + Program rows
 * into the database. Safe to re-run — all operations use upsert keyed on
 * sourceId so duplicates are never created.
 *
 * Usage:  npm run db:import
 */

import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

const DATA_DIR = join(process.cwd(), "Data");

const FILES: { file: string; countrySlug: string }[] = [
  { file: "Australia.json",     countrySlug: "australia" },
  { file: "Canada.json",        countrySlug: "canada" },
  { file: "France.json",        countrySlug: "france" },
  { file: "Georgia.json",       countrySlug: "georgia" },
  { file: "Italy.json",         countrySlug: "italy" },
  { file: "Kazakhstan.json",    countrySlug: "kazakhstan" },
  { file: "Poland.json",        countrySlug: "poland" },
  { file: "UnitedKingdom.json", countrySlug: "uk" },
];

// Maps the JSON "universityCountry" string to a Country.id slug
const COUNTRY_NAME_TO_SLUG: Record<string, string> = {
  "Australia":      "australia",
  "Canada":         "canada",
  "France":         "france",
  "Georgia":        "georgia",
  "Italy":          "italy",
  "Kazakhstan":     "kazakhstan",
  "Poland":         "poland",
  "United Kingdom": "uk",
};

// Stub data for countries — used when the Country row doesn't yet exist in the DB.
// This lets the import run on a fresh DB without requiring db:seed first.
const COUNTRY_STUBS: Record<string, {
  name: string; code: string; flag: string;
  averageTuition: string; popularIntake: string;
}> = {
  australia:  { name: "Australia",     code: "AU", flag: "🇦🇺", averageTuition: "AUD 35,000 / yr", popularIntake: "February" },
  canada:     { name: "Canada",        code: "CA", flag: "🇨🇦", averageTuition: "CAD 32,000 / yr", popularIntake: "September" },
  france:     { name: "France",        code: "FR", flag: "🇫🇷", averageTuition: "EUR 15,000 / yr", popularIntake: "September" },
  uk:         { name: "United Kingdom",code: "GB", flag: "🇬🇧", averageTuition: "GBP 22,000 / yr", popularIntake: "September" },
  italy:      { name: "Italy",         code: "IT", flag: "🇮🇹", averageTuition: "EUR 10,000 / yr", popularIntake: "September" },
  poland:     { name: "Poland",        code: "PL", flag: "🇵🇱", averageTuition: "PLN 30,000 / yr", popularIntake: "October"   },
  georgia:    { name: "Georgia",       code: "GE", flag: "🇬🇪", averageTuition: "USD 5,000 / yr",  popularIntake: "September" },
  kazakhstan: { name: "Kazakhstan",    code: "KZ", flag: "🇰🇿", averageTuition: "USD 4,000 / yr",  popularIntake: "September" },
};

const BATCH_SIZE = 25;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function toDecimal(val: unknown): string | null {
  if (val === null || val === undefined || val === "" || val === "0") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).trim());
  return isNaN(n) || n === 0 ? null : String(n);
}

function toInt(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? Math.round(val) : parseInt(String(val).trim(), 10);
  return isNaN(n) ? null : n;
}

function toFloat(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val).trim());
  return isNaN(n) ? null : n;
}

function parseCsv(str: unknown): string[] {
  if (!str || typeof str !== "string") return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function safeStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

function safeIntArray(arr: unknown): number[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => toInt(s)).filter((n): n is number => n !== null);
}

function makeSlug(universityId: number): string {
  return `uni-${universityId}`;
}

function makeInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "U";
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 3);
}

function formatTuition(amount: unknown, currencyCode: unknown): string {
  const n = toFloat(amount);
  if (!n) return "Varies by program";
  const code = typeof currencyCode === "string" ? currencyCode.trim() : "";
  return `${code} ${Math.round(n).toLocaleString()} / yr`.trim();
}

// ─────────────────────────────────────────────────────────────
// COUNTRY UPSERT
// ─────────────────────────────────────────────────────────────

const ensuredCountries = new Set<string>();

async function ensureCountry(slug: string): Promise<void> {
  if (ensuredCountries.has(slug)) return;

  const existing = await prisma.country.findUnique({ where: { id: slug } });
  if (existing) {
    ensuredCountries.add(slug);
    return;
  }

  const stub = COUNTRY_STUBS[slug];
  if (!stub) {
    console.warn(`  Warning: Country "${slug}" not found in DB and no stub defined — universities for this country will be skipped`);
    ensuredCountries.add(slug);
    return;
  }

  await prisma.country.create({
    data: {
      id:                slug,
      name:              stub.name,
      code:              stub.code,
      flag:              stub.flag,
      averageTuition:    stub.averageTuition,
      popularIntake:     stub.popularIntake,
      universitiesCount: 0,
      updatesCount:      0,
    },
  });
  ensuredCountries.add(slug);
  console.log(`  + Created country: ${stub.name}`);
}

// ─────────────────────────────────────────────────────────────
// UNIVERSITY UPSERT
// ─────────────────────────────────────────────────────────────

interface UniAggregates {
  record: Record<string, unknown>;
  courses: Set<string>;
  levels: Set<string>;
  sampleAmount?: string;
  sampleCurrency?: string;
}

async function upsertUniversity(
  sourceId: number,
  agg: UniAggregates,
  countrySlug: string
): Promise<string> {
  if (!sourceId || typeof sourceId !== "number") {
    throw new Error(`upsertUniversity called with invalid sourceId: ${sourceId}`);
  }

  const record = agg.record;

  const uniAvgScholarship = record.universityAverageScholarship != null
    ? toDecimal(String(record.universityAverageScholarship))
    : null;

  const qs = toInt(record.QSRanking);
  const ranking = qs && qs > 0 ? qs : 9999;

  const rankingFields = {
    qsRanking:                           qs,
    usNewsRanking:                       toInt(record.USNewsRanking),
    webomatricsNationalRanking:          toInt(record.WebomatricsNationalRanking),
    webomatricsWorldRanking:             toInt(record.WebomatricsWorldRanking),
    universityLogoExtension:             (record.universityLogoExtension as string) ?? null,
    universityAverageScholarship:        uniAvgScholarship,
    universityAverageScholarshipRemarks: (record.universityAverageScholarshipRemarks as string) ?? null,
  };

  const amountToUse = agg.sampleAmount ?? record.Amount;
  const currToUse = agg.sampleCurrency ?? record.CurrencyCode;
  const tuitionValue = toFloat(amountToUse) ?? 0;
  const tuition = formatTuition(amountToUse, currToUse);
  const intake = parseCsv(record.Intakes)[0] ?? "September 2027";
  const ieltsVal = toFloat(record.IeltsOverall);

  // Determine degree offering based on study levels found
  let degree: "Bachelors" | "Masters" | "Both" = "Both";
  const hasUG = agg.levels.has("Undergraduate") || agg.levels.has("Pathway Programs (UG)");
  const hasPG = agg.levels.has("Postgraduate") || agg.levels.has("Pathway Programs (PG)");
  if (hasUG && !hasPG) degree = "Bachelors";
  else if (hasPG && !hasUG) degree = "Masters";

  const topCourses = Array.from(agg.courses).slice(0, 8);

  const uni = await prisma.university.upsert({
    where:  { sourceId },
    update: {
      ...rankingFields,
      ...(ranking !== 9999 ? { ranking } : {}),
      courses: topCourses,
      degree,
      ...(tuitionValue > 0 ? { tuition, tuitionValue } : {}),
      ...(intake ? { intake } : {}),
    },
    create: {
      sourceId,
      slug:         makeSlug(sourceId),
      name:         String(record.universityName ?? "").trim(),
      initials:     makeInitials(String(record.universityName ?? "U")),
      countryId:    countrySlug,
      city:         String(record.universityCity ?? record.universityState ?? "").trim(),
      ranking,
      tuition,
      tuitionValue,
      courses:      topCourses,
      scholarships: true,
      intake,
      degree,
      ielts:        ieltsVal != null ? String(ieltsVal) : "6.5",
      ...rankingFields,
    },
  });

  return uni.id;
}

// ─────────────────────────────────────────────────────────────
// PROGRAM PAYLOAD BUILDER
// ─────────────────────────────────────────────────────────────

function buildProgramPayload(record: Record<string, unknown>, universityId: string) {
  return {
    universityId,
    name:                           String(record.Name ?? "Unnamed Program").trim(),
    concentration:                  (record.Concentration as string) ?? null,
    studyLevelId:                   toInt(record.StudyLevelId),
    studyLevel:                     (record.Studylvl as string) ?? null,
    categoryId:                     record.CategoryId != null ? String(record.CategoryId).trim() : null,
    subCategoryId:                  record.SubCategoryId != null ? String(record.SubCategoryId).trim() : null,
    isStemCourse:                   typeof record.IsStemCourse === "boolean" ? record.IsStemCourse : null,
    isOnlineCourse:                 typeof record.IsOnlineCourse === "boolean" ? record.IsOnlineCourse : null,
    isExtraChoicesOfPrograms:       typeof record.IsExtraChoicesOfPrograms === "boolean" ? record.IsExtraChoicesOfPrograms : null,
    highlights:                     (record.Highlights as string) ?? null,
    universityOrder:                toInt(record.UniversityOrder),
    durationMonths:                 toInt(record.Duration),
    campus:                         typeof record.Campus === "string" ? record.Campus.trim() : null,
    countryId:                      toInt(record.CountryId),
    cohortCountryCode:              (record.CohortCountryCode as string) ?? null,
    amount:                         toDecimal(record.Amount),
    tuitionFeeText:                 (record.TutionFee as string) ?? null,
    currencyCode:                   (record.CurrencyCode as string) ?? null,
    currency:                       (record.Currency as string) ?? null,
    tuitionFeeCurrency:             (record.TuitionFeeCurrency as string) ?? null,
    applicationFee:                 (record.ApplicationFee as string) ?? null,
    applicationFeeAmt:              toDecimal(record.ApplicationFeeAmt),
    applicationFeeCurrency:         (record.ApplicationFeeCurrency as string) ?? null,
    appFeeWaiverAvailable:          typeof record.AppFeeWaiverAvailable === "boolean" ? record.AppFeeWaiverAvailable : null,
    depositCurrency:                (record.DepositCurrency as string) ?? null,
    depositSortAmount:              toDecimal(record.DepositSortAmount),
    courseDeposit:                  record.CourseDeposit ? (record.CourseDeposit as Prisma.InputJsonValue) : undefined,
    universityDeposit:              record.UniversityDeposit ? (record.UniversityDeposit as Prisma.InputJsonValue) : undefined,
    intakes:                        parseCsv(record.Intakes),
    displayIntakes:                 safeStringArray(record.DisplayIntakes),
    applicationDeadline:            (record.ApplicationDeadline as string) ?? null,
    applicationDeadlineDetails:     (record.ApplicationDeadlineDetails as string) ?? null,
    intakesAndDeadlines:            (record.IntakesAndDeadlines as string) ?? null,
    upcomingIntakeDeadLines:        (record.UpcomingIntakeDeadLines as string) ?? null,
    intakesClosed:                  (record.IntakesClosed as string) ?? null,
    applicationMode:                (record.ApplicationMode as string) ?? null,
    applicationCount12Mo:           toInt(record.ApplicationCount12Mo),
    ieltsOverall:                   toFloat(record.IeltsOverall),
    ieltsNoBandLessThan:            toFloat(record.IeltsNoBandLessThan),
    ieltsRequired:                  typeof record.IeltsRequired === "boolean" ? record.IeltsRequired : null,
    ieltsWaiverScoreCBSE:           toFloat(record.IELTSWaiverScoreCBSE),
    ieltsWaiverScoreState:          toFloat(record.IELTSWaiverScoreState),
    pteScore:                       toInt(record.PteScore),
    pteNoSectionLessThan:           toInt(record.PteNoSectionLessThan),
    pteRequired:                    typeof record.PteRequired === "boolean" ? record.PteRequired : null,
    toeflScore:                     toInt(record.ToeflScore),
    toeflNoSectionLessThan:         toInt(record.ToeflNoSectionLessThan),
    toeflRequired:                  typeof record.ToeflRequired === "boolean" ? record.ToeflRequired : null,
    detScore:                       toInt(record.DETScore),
    detRequired:                    typeof record.DETRequired === "boolean" ? record.DETRequired : null,
    greScore:                       toInt(record.GreScore),
    greRequired:                    typeof record.GreRequired === "boolean" ? record.GreRequired : null,
    gmatScore:                      toInt(record.GmatScore),
    gmatRequired:                   typeof record.GmatRequired === "boolean" ? record.GmatRequired : null,
    satScore:                       toInt(record.SatScore),
    satRequired:                    typeof record.SatRequired === "boolean" ? record.SatRequired : null,
    actScore:                       toInt(record.ActScore),
    actRequired:                    typeof record.ActRequired === "boolean" ? record.ActRequired : null,
    withoutEnglishProficiency:      typeof record.WithoutEnglishProficiency === "boolean" ? record.WithoutEnglishProficiency : null,
    englishMarks12Score:            toFloat(record.EnglishMarks12Score),
    isMOIWaiver:                    typeof record.IsMOIWaiver === "boolean" ? record.IsMOIWaiver : null,
    elpAvailable:                   typeof record.ElpAvailable === "boolean" ? record.ElpAvailable : null,
    eslAvailable:                   typeof record.EslAvailable === "boolean" ? record.EslAvailable : null,
    eslElpDetail:                   (record.ESLELPDetail as string) ?? null,
    entryRequirement:               (record.EntryRequirement as string) ?? null,
    entryRequirementTwelfth:        (record.EntryRequirementTwelfth as string) ?? null,
    entryRequirementTwelfthOutOf100:(record.EntryRequirementTwelfthOutOf100 as string) ?? null,
    entryRequirementTwelfthOutOf45: (record.EntryRequirementTwelfthOutOf45 as string) ?? null,
    entryRequirementTwelfthOutOf10: (record.EntryRequirementTwelfthOutOf10 as string) ?? null,
    entryRequirementTwelfthOutOf7:  (record.EntryRequirementTwelfthOutOf7 as string) ?? null,
    entryRequirementTwelfthOutOf5:  (record.EntryRequirementTwelfthOutOf5 as string) ?? null,
    entryRequirementTwelfthOutOf4:  (record.EntryRequirementTwelfthOutOf4 as string) ?? null,
    entryRequirementUG:             (record.EntryRequirementUG as string) ?? null,
    entryRequirementUgOutOf100:     (record.EntryRequirementUgOutOf100 as string) ?? null,
    entryRequirementUgOutOf10:      (record.EntryRequirementUgOutOf10 as string) ?? null,
    entryRequirementUgOutOf7:       (record.EntryRequirementUgOutOf7 as string) ?? null,
    entryRequirementUgOutOf5:       (record.EntryRequirementUgOutOf5 as string) ?? null,
    entryRequirementUgOutOf4:       (record.EntryRequirementUgOutOf4 as string) ?? null,
    withoutMaths:                   typeof record.WithoutMaths === "boolean" ? record.WithoutMaths : null,
    workExp:                        (record.WorkExp as string) ?? null,
    backlog:                        toInt(record.backlog),
    backlogRange:                   (record.BacklogRange as string) ?? null,
    fifteenYearsEducation:          typeof record.FifteenYearsEducation === "boolean" ? record.FifteenYearsEducation : null,
    scholarshipAvailable:           typeof record.ScholarshipAvailable === "boolean" ? record.ScholarshipAvailable : null,
    scholarshipDetail:              ((record.ScholarshipDetail ?? record.ScholarshipDeatil) as string) ?? null,
    internshipAvailable:            typeof record.InternshipAvailable === "boolean" ? record.InternshipAvailable : null,
    averageScholarship:             toDecimal(record.AverageScholarship),
    averageScholarshipRemarks:      (record.AverageScholarshipRemarks as string) ?? null,
    eligibleCountryIds:             safeIntArray(record.EligibleCountryIds),
    eligibleCountryIdStudyLevelIds: safeStringArray(record.EligibleCountryIdStudyLevelIds),
    eligibleStateIds:               safeIntArray(record.EligibleStateIds),
    commissionAmount:               toDecimal(record.CommissionAmount),
    commissionMode:                 (record.CommissionMode as string) ?? null,
    commissionCurrency:             (record.CommissionCurrency as string) ?? null,
    commissionToolTipMessage:       (record.commissionToolTipMessage as string) ?? null,
    increasedCommissions:           record.IncreasedCommissions ? (record.IncreasedCommissions as Prisma.InputJsonValue) : undefined,
    remarks:                        (record.Remarks as string) ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// FILE PROCESSOR
// ─────────────────────────────────────────────────────────────

async function processFile(file: string, countrySlug: string): Promise<void> {
  const filePath = join(DATA_DIR, file);
  if (!existsSync(filePath)) {
    console.warn(`  Warning: File not found: ${file} — skipping`);
    return;
  }

  console.log(`\nProcessing ${file}...`);
  const raw    = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as { data: Record<string, unknown>[] };

  // Normalize records by trimming all key names and string values
  const records = (parsed.data ?? []).map((r) => {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      clean[k.trim()] = typeof v === "string" ? v.trim() : v;
    }
    return clean;
  });

  console.log(`  ${records.length.toLocaleString()} program records`);

  // Ensure this file's root country exists
  await ensureCountry(countrySlug);

  // Collect unique universities and aggregate their course names & levels
  const uniMap = new Map<number, UniAggregates>();
  for (const r of records) {
    const uid = toInt(r.UniversityId);
    if (!uid) continue;

    if (!uniMap.has(uid)) {
      uniMap.set(uid, {
        record: r,
        courses: new Set<string>(),
        levels: new Set<string>(),
      });
    }

    const entry = uniMap.get(uid)!;
    const progName = String(r.Name ?? "").trim();
    if (progName) entry.courses.add(progName);

    const lvl = String(r.Studylvl ?? "").trim();
    if (lvl) entry.levels.add(lvl);

    if (!entry.sampleAmount && r.Amount && toFloat(r.Amount)) {
      entry.sampleAmount = String(r.Amount);
      entry.sampleCurrency = typeof r.CurrencyCode === "string" ? r.CurrencyCode : undefined;
    }
  }

  console.log(`  ${uniMap.size} unique universities`);

  // Upsert universities
  const uniIdMap = new Map<number, string>(); // sourceId -> prisma cuid
  let uniDone = 0;
  for (const [sourceId, agg] of uniMap) {
    const countryRaw = String(agg.record.universityCountry ?? "").trim();
    const slug = COUNTRY_NAME_TO_SLUG[countryRaw] ?? countrySlug;
    await ensureCountry(slug);

    if (!ensuredCountries.has(slug)) {
      console.warn(`  Skipping university ${sourceId} — country "${slug}" unavailable`);
      continue;
    }

    const prismaId = await upsertUniversity(sourceId, agg, slug);
    uniIdMap.set(sourceId, prismaId);
    uniDone++;
    if (uniDone % 25 === 0 || uniDone === uniMap.size) {
      process.stdout.write(`\r  Universities: ${uniDone}/${uniMap.size}     `);
    }
  }
  console.log(`\r  Done: ${uniDone} universities upserted`);

  // Batch-upsert programs
  let progDone = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (record) => {
        const sourceId = toInt(record.Id);
        if (!sourceId) return;

        const uid = toInt(record.UniversityId);
        if (!uid) return;

        const universityId = uniIdMap.get(uid);
        if (!universityId) return;

        const payload = buildProgramPayload(record, universityId);
        await prisma.program.upsert({
          where:  { sourceId },
          update: payload,
          create: { sourceId, ...payload },
        });
        progDone++;
      })
    );

    const done = Math.min(i + BATCH_SIZE, records.length);
    process.stdout.write(`\r  Programs: ${done.toLocaleString()}/${records.length.toLocaleString()}     `);
  }
  console.log(`\r  Done: ${progDone.toLocaleString()} programs upserted`);
}

// ─────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("==================================================");
  console.log("  University & Program Data Import");
  console.log("==================================================");
  console.log(`DATABASE: ${process.env.DATABASE_URL?.replace(/:([^@]+)@/, ":***@")}\n`);

  for (const { file, countrySlug } of FILES) {
    await processFile(file, countrySlug);
  }

  // Update country university counts
  console.log("\nUpdating country university counts...");
  for (const { countrySlug } of FILES) {
    const count = await prisma.university.count({ where: { countryId: countrySlug } });
    await prisma.country.update({
      where: { id: countrySlug },
      data: { universitiesCount: count },
    });
    console.log(`  ${countrySlug}: ${count} universities`);
  }

  console.log("\nImport successfully completed!");
}

main()
  .catch((err) => {
    console.error("\nImport failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
