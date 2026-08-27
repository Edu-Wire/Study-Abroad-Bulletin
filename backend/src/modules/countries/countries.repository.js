import { prisma } from "../../config/prisma.js";

const countryFields = {
  id: true,
  name: true,
  code: true,
  flag: true,
  universitiesCount: true,
  averageTuition: true,
  popularIntake: true,
  updatesCount: true,
  heroImage: true,
};

const universityFields = {
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
};

const scholarshipFields = {
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
};

const deadlineFields = {
  id: true,
  slug: true,
  title: true,
  countryId: true,
  deadlineDate: true,
  deadlineType: true,
  status: true,
  importance: true,
  description: true,
  source: true,
  lastUpdated: true,
  relatedArticleTitle: true,
  relatedArticleHref: true,
  applicationUrl: true,
  tags: true,
  content: true,
};

const articleFields = {
  id: true,
  slug: true,
  headline: true,
  summary: true,
  content: true,
  category: true,
  readingTime: true,
  image: true,
  breaking: true,
  featured: true,
  isRss: true,
  sourceUrl: true,
  sourceName: true,
  publishedAt: true,
};

const consultantFields = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  description: true,
  countryId: true,
  cities: true,
  services: true,
  website: true,
  verified: true,
  featured: true,
  rating: true,
  reviewCount: true,
  established: true,
  categories: true,
  sponsored: true,
  lastUpdated: true,
};

export const publicCountrySelect = countryFields;

export async function listPublicCountries() {
  return prisma.country.findMany({
    select: countryFields,
    orderBy: { name: "asc" },
  });
}

export async function findPublicCountryById(id) {
  return prisma.country.findUnique({
    where: { id },
    select: {
      ...countryFields,
      universities: {
        select: universityFields,
        orderBy: [{ ranking: "asc" }, { name: "asc" }],
      },
      immigrationDeadlines: {
        select: deadlineFields,
        orderBy: { deadlineDate: "asc" },
      },
      scholarships: {
        select: {
          scholarship: {
            select: {
              ...scholarshipFields,
              university: {
                select: { id: true, slug: true, name: true },
              },
            },
          },
        },
      },
      articles: {
        where: { article: { status: "PUBLISHED" } },
        orderBy: { article: { publishedAt: "desc" } },
        select: { article: { select: articleFields } },
      },
      consultantDestinations: {
        select: {
          consultant: { select: consultantFields },
        },
      },
      consultantsHQ: {
        select: consultantFields,
      },
    },
  });
}
