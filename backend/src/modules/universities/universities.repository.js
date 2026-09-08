import { prisma } from "../../config/prisma.js";

const countrySelect = {
  id: true,
  name: true,
  code: true,
  flag: true,
};

const universitySelect = {
  id: true,
  slug: true,
  name: true,
  initials: true,
  countryId: true,
  city: true,
  ranking: true,
  tuition: true,
  tuitionValue: true,
  courses: true,
  scholarships: true,
  intake: true,
  degree: true,
  ielts: true,
  country: { select: countrySelect },
};

export const publicUniversitySelect = universitySelect;

export async function listPublicUniversities() {
  return prisma.university.findMany({
    select: universitySelect,
    orderBy: [{ ranking: "asc" }, { name: "asc" }],
  });
}

export async function findPublicUniversityBySlug(slug) {
  return prisma.university.findUnique({
    where: { slug },
    select: {
      ...universitySelect,
      intakes: {
        select: {
          id: true,
          term: true,
          applicationDeadline: true,
          documentDeadline: true,
          depositDeadline: true,
          isRolling: true,
          status: true,
        },
        orderBy: { applicationDeadline: "asc" },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Admin CRUD - same select shape as the public list; the admin table needs
// every field the public directory does, plus none it doesn't.
// ---------------------------------------------------------------------------

export async function listAdminUniversities() {
  return prisma.university.findMany({
    select: universitySelect,
    orderBy: [{ ranking: "asc" }, { name: "asc" }],
  });
}

export async function findAdminUniversityById(id) {
  return prisma.university.findUnique({ where: { id }, select: universitySelect });
}

export async function findUniversityBySlugExcludingId(slug, excludeId) {
  return prisma.university.findFirst({
    where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
    select: { id: true },
  });
}

export async function createUniversity(data) {
  return prisma.university.create({ data, select: universitySelect });
}

export async function updateUniversity(id, data) {
  return prisma.university.update({ where: { id }, data, select: universitySelect });
}

export async function deleteUniversity(id) {
  return prisma.university.delete({ where: { id } });
}
