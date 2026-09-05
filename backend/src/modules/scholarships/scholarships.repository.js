import { prisma } from "../../config/prisma.js";

const scholarshipSelect = {
  id: true,
  slug: true,
  name: true,
  organization: true,
  funding: true,
  degree: true,
  deadline: true,
  deadlineString: true,
  eligibility: true,
  type: true,
  universityId: true,
  university: { select: { id: true, name: true } },
  destinations: {
    select: { country: { select: { id: true, name: true, code: true, flag: true } } },
  },
};

export async function listPublicScholarships() {
  return prisma.scholarship.findMany({
    select: scholarshipSelect,
    orderBy: { deadline: "asc" },
  });
}

export async function findPublicScholarshipBySlug(slug) {
  return prisma.scholarship.findUnique({
    where: { slug },
    select: scholarshipSelect,
  });
}

export async function listScholarships() {
  return prisma.scholarship.findMany({
    select: scholarshipSelect,
    orderBy: { deadline: "asc" },
  });
}

export async function findScholarshipById(id) {
  return prisma.scholarship.findUnique({ where: { id }, select: scholarshipSelect });
}

export async function findScholarshipBySlugExcludingId(slug, excludeId) {
  return prisma.scholarship.findFirst({
    where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
    select: { id: true },
  });
}

export async function createScholarship({ countryIds, ...data }) {
  const scholarship = await prisma.$transaction(async (tx) => {
    const created = await tx.scholarship.create({ data });

    if (Array.isArray(countryIds) && countryIds.length > 0) {
      await tx.scholarshipHostCountry.createMany({
        data: countryIds.map((countryId) => ({ scholarshipId: created.id, countryId })),
        skipDuplicates: true,
      });
    }

    return tx.scholarship.findUnique({ where: { id: created.id }, select: scholarshipSelect });
  });

  return scholarship;
}

export async function updateScholarship(id, { countryIds, ...data }) {
  return prisma.$transaction(async (tx) => {
    await tx.scholarship.update({ where: { id }, data });

    await tx.scholarshipHostCountry.deleteMany({ where: { scholarshipId: id } });
    if (Array.isArray(countryIds) && countryIds.length > 0) {
      await tx.scholarshipHostCountry.createMany({
        data: countryIds.map((countryId) => ({ scholarshipId: id, countryId })),
        skipDuplicates: true,
      });
    }

    return tx.scholarship.findUnique({ where: { id }, select: scholarshipSelect });
  });
}

export async function deleteScholarship(id) {
  return prisma.scholarship.delete({ where: { id } });
}
