import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const country = searchParams.get("country");
    const countryId = searchParams.get("countryId") || country;
    const q = searchParams.get("q") || searchParams.get("search");
    const degree = searchParams.get("degree");
    const sourceIdParam = searchParams.get("sourceId");
    const slug = searchParams.get("slug");
    const includePrograms = searchParams.get("includePrograms") === "true";
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");

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

    if (countryId) {
      where.OR = [
        { countryId: { equals: countryId, mode: "insensitive" } },
        { country: { name: { equals: countryId, mode: "insensitive" } } },
      ];
    }

    if (degree && (degree === "Bachelors" || degree === "Masters" || degree === "Both")) {
      where.degree = degree;
    }

    if (q && q.trim()) {
      const term = q.trim();
      const searchConditions: Prisma.UniversityWhereInput[] = [
        { name: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const skip = limit && page ? (page - 1) * limit : undefined;

    const rows = await prisma.university.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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
    });

    // Shape data to match the University contract the frontend expects
    const universities = rows.map((u) => ({
      id:                                  u.id,
      sourceId:                            u.sourceId,
      slug:                                u.slug,
      name:                                u.name,
      initials:                            u.initials,
      country:                             u.country?.name ?? "",
      countryId:                           u.countryId,
      city:                                u.city,
      ranking:                             u.ranking,
      tuition:                             u.tuition,
      tuitionValue:                        u.tuitionValue,
      courses:                             u.courses,
      scholarships:                        u.scholarships,
      intake:                              u.intake,
      degree:                              (u.degree === "Bachelors" || u.degree === "Masters" ? u.degree : "Both") as "Bachelors" | "Masters" | "Both",
      ielts:                               u.ielts,
      // extended fields
      qsRanking:                           u.qsRanking,
      usNewsRanking:                       u.usNewsRanking,
      webomatricsNationalRanking:          u.webomatricsNationalRanking,
      webomatricsWorldRanking:             u.webomatricsWorldRanking,
      universityLogoExtension:             u.universityLogoExtension,
      universityAverageScholarship:        u.universityAverageScholarship
        ? Number(u.universityAverageScholarship)
        : null,
      universityAverageScholarshipRemarks: u.universityAverageScholarshipRemarks,
      ...(includePrograms && "programs" in u ? { programs: u.programs } : {}),
    }));

    if (searchParams.get("envelope") === "true") {
      return NextResponse.json({
        success: true,
        count: universities.length,
        universities,
      });
    }

    return NextResponse.json(universities);
  } catch (error) {
    console.error("[/api/universities] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch universities" },
      { status: 500 }
    );
  }
}
