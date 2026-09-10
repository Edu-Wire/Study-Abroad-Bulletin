import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { University } from "@/contracts/universities";

export const dynamic = "force-dynamic";

/**
 * Normalizes raw database university records into a clean, strictly-typed public contract.
 */
function normalizeUniversity(u: {
  id: string;
  sourceId: number | null;
  slug: string;
  name: string;
  initials: string;
  countryId: string;
  country?: { name: string; id: string; code: string } | null;
  city: string;
  ranking: number;
  tuition: string;
  tuitionValue: number;
  courses: string[];
  scholarships: boolean;
  intake: string;
  degree: string;
  ielts: string;
  qsRanking: number | null;
  usNewsRanking: number | null;
  webomatricsNationalRanking: number | null;
  webomatricsWorldRanking: number | null;
  universityLogoExtension: string | null;
  universityAverageScholarship: unknown;
  universityAverageScholarshipRemarks: string | null;
  programs?: unknown[];
}): University {
  return {
    id: u.id,
    sourceId: typeof u.sourceId === "number" ? u.sourceId : null,
    slug: u.slug || "",
    name: (u.name || "").trim(),
    initials:
      u.initials ||
      (u.name
        ? u.name
            .split(" ")
            .map((w: string) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "UN"),
    country: u.country?.name ?? "",
    countryId: u.countryId ?? (u.country?.id ?? ""),
    city: (u.city || "").trim(),
    ranking: typeof u.ranking === "number" && !isNaN(u.ranking) ? u.ranking : 999,
    tuition: u.tuition || "Contact University",
    tuitionValue:
      typeof u.tuitionValue === "number" && !isNaN(u.tuitionValue)
        ? u.tuitionValue
        : 0,
    courses: Array.isArray(u.courses) ? u.courses : [],
    scholarships: Boolean(u.scholarships),
    intake: u.intake || "September 2027",
    degree: (u.degree === "Bachelors" || u.degree === "Masters"
      ? u.degree
      : "Both") as "Bachelors" | "Masters" | "Both",
    ielts: u.ielts ? String(u.ielts).trim() : "6.5",
    qsRanking: typeof u.qsRanking === "number" ? u.qsRanking : null,
    usNewsRanking: typeof u.usNewsRanking === "number" ? u.usNewsRanking : null,
    webomatricsNationalRanking:
      typeof u.webomatricsNationalRanking === "number"
        ? u.webomatricsNationalRanking
        : null,
    webomatricsWorldRanking:
      typeof u.webomatricsWorldRanking === "number"
        ? u.webomatricsWorldRanking
        : null,
    universityLogoExtension: u.universityLogoExtension || null,
    universityAverageScholarship:
      u.universityAverageScholarship != null
        ? Number(u.universityAverageScholarship)
        : null,
    universityAverageScholarshipRemarks:
      u.universityAverageScholarshipRemarks || null,
    ...(Array.isArray(u.programs) ? { programs: u.programs } : {}),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const country = searchParams.get("country");
    const countryId = searchParams.get("countryId") || country;
    const city = searchParams.get("city");
    const q = searchParams.get("q") || searchParams.get("search");
    const degree = searchParams.get("degree");
    const ranking = searchParams.get("ranking");
    const tuition = searchParams.get("tuition");
    const scholarships = searchParams.get("scholarships");
    const intake = searchParams.get("intake");
    const course = searchParams.get("course");
    const sourceIdParam = searchParams.get("sourceId");
    const slug = searchParams.get("slug");
    const includePrograms = searchParams.get("includePrograms") === "true";
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const envelopeParam = searchParams.get("envelope");

    // Build filter conditions
    const where: Prisma.UniversityWhereInput = {};

    if (sourceIdParam) {
      const parsedSourceId = parseInt(sourceIdParam, 10);
      if (!isNaN(parsedSourceId)) {
        where.sourceId = parsedSourceId;
      }
    }

    if (slug) {
      where.slug = slug;
    }

    if (countryId && countryId !== "All") {
      where.OR = [
        { countryId: { equals: countryId, mode: "insensitive" } },
        { country: { name: { equals: countryId, mode: "insensitive" } } },
        { country: { code: { equals: countryId, mode: "insensitive" } } },
      ];
    }

    if (city && city !== "All") {
      where.city = { equals: city, mode: "insensitive" };
    }

    if (
      degree &&
      degree !== "All" &&
      (degree === "Bachelors" || degree === "Masters" || degree === "Both")
    ) {
      where.degree = degree;
    }

    // Ranking filter
    if (ranking && ranking !== "All") {
      if (ranking === "Top 25" || ranking === "top25") {
        where.ranking = { lte: 25 };
      } else if (ranking === "Top 50" || ranking === "top50") {
        where.ranking = { lte: 50 };
      } else if (ranking === "Top 100" || ranking === "top100") {
        where.ranking = { lte: 100 };
      }
    }

    // Tuition filter
    if (tuition && tuition !== "All") {
      if (tuition === "Under 20,000" || tuition === "under20k") {
        where.tuitionValue = { lt: 20000 };
      } else if (tuition === "20,000 – 40,000" || tuition === "20k-40k") {
        where.tuitionValue = { gte: 20000, lte: 40000 };
      } else if (tuition === "Over 40,000" || tuition === "over40k") {
        where.tuitionValue = { gt: 40000 };
      }
    }

    // Scholarships filter
    if (scholarships === "Available" || scholarships === "true") {
      where.scholarships = true;
    }

    // Intake filter
    if (intake && intake !== "All") {
      where.intake = { contains: intake, mode: "insensitive" };
    }

    // Course filter
    if (course && course !== "All") {
      where.courses = { has: course };
    }

    // Free text search
    if (q && q.trim()) {
      const term = q.trim();
      const searchConditions: Prisma.UniversityWhereInput[] = [
        { name: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { country: { name: { contains: term, mode: "insensitive" } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Pagination calculations
    const limit = limitParam
      ? Math.min(100, Math.max(1, parseInt(limitParam, 10)))
      : 18;
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const skip = (page - 1) * limit;

    const whereClause = Object.keys(where).length > 0 ? where : undefined;

    // Parallel fetch of total count and page slice
    const [total, rows] = await Promise.all([
      prisma.university.count({ where: whereClause }),
      prisma.university.findMany({
        where: whereClause,
        include: includePrograms
          ? {
              country: true,
              programs: { take: 50, orderBy: { name: "asc" } },
            }
          : {
              country: true,
            },
        orderBy: { ranking: "asc" },
        take: limit,
        skip,
      }),
    ]);

    // Normalize all records
    const universities = rows.map(normalizeUniversity);
    const totalPages = Math.ceil(total / limit) || 1;

    // Bare array if explicitly requested with envelope=false
    if (envelopeParam === "false") {
      return NextResponse.json(universities);
    }

    // Standard normalized API response envelope
    return NextResponse.json({
      success: true,
      count: universities.length,
      data: universities,
      universities, // preserved for backward-compatibility
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[/api/universities] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch universities" },
      { status: 500 }
    );
  }
}
