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
