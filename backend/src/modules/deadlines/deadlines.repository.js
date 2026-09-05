import { prisma } from "../../config/prisma.js";

const deadlineSelect = {
  id: true,
  slug: true,
  title: true,
  countryId: true,
  country: { select: { id: true, name: true, code: true, flag: true } },
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

export async function listDeadlines() {
  return prisma.immigrationDeadline.findMany({
    select: deadlineSelect,
    orderBy: { deadlineDate: "asc" },
  });
}

export async function findDeadlineById(id) {
  return prisma.immigrationDeadline.findUnique({ where: { id }, select: deadlineSelect });
}

export async function findDeadlineBySlugExcludingId(slug, excludeId) {
  return prisma.immigrationDeadline.findFirst({
    where: excludeId ? { slug, NOT: { id: excludeId } } : { slug },
    select: { id: true },
  });
}

export async function createDeadline(data) {
  return prisma.immigrationDeadline.create({ data, select: deadlineSelect });
}

export async function updateDeadline(id, data) {
  return prisma.immigrationDeadline.update({ where: { id }, data, select: deadlineSelect });
}

export async function deleteDeadline(id) {
  return prisma.immigrationDeadline.delete({ where: { id } });
}
