import { prisma } from "../../config/prisma.js";
import { JobNames } from "../../modules/ingestion/types.js";

/**
 * Generates a URL-safe unique slug from a headline.
 *
 * @param {string} headline
 * @returns {string}
 */
function slugify(headline) {
  const base = headline
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base.slice(0, 80)}-${randomSuffix}`;
}

/**
 * Worker job handler for converting an approved/auto-drafted candidate into a CMS draft Article.
 *
 * @param {object} job
 * @param {object} job.data
 * @param {string} job.data.candidateId
 * @param {string} [job.data.sourceItemId]
 * @returns {Promise<object>}
 */
export async function handleDraftJob(job) {
  const payload = job?.data || {};
  console.log(`[Job: ${JobNames.CANDIDATE_DRAFT}] Creating CMS draft for candidate: ${payload.candidateId}`);

  if (!payload.candidateId) {
    throw new Error("Missing required candidateId in draft job payload.");
  }

  const candidate = await prisma.articleCandidate.findUnique({
    where: { id: payload.candidateId },
    include: {
      sourceItem: {
        include: {
          contentSource: true,
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!candidate) {
    throw new Error(`ArticleCandidate "${payload.candidateId}" not found.`);
  }

  const sourceItem = candidate.sourceItem;
  const latestVersion = sourceItem?.versions[0] || null;

  // Check if article is already linked or created
  let article;
  if (candidate.articleId) {
    article = await prisma.article.findUnique({
      where: { id: candidate.articleId },
    });
  }

  const sourceUrl = sourceItem?.canonicalUrl || `https://source.local/${payload.candidateId}`;

  if (!article) {
    // Check if an article with this sourceUrl already exists
    article = await prisma.article.findFirst({
      where: { sourceUrl },
    });
  }

  if (!article) {
    // Generate unique slug
    const slug = slugify(candidate.headline);

    // Create draft Article in existing CMS model
    article = await prisma.article.create({
      data: {
        slug,
        headline: candidate.headline,
        summary: candidate.summary,
        content: candidate.content || sourceItem?.summary || candidate.summary,
        category: candidate.category || "VISA",
        status: "DRAFT",
        primaryCountryId: candidate.primaryCountryId || sourceItem?.countryId,
        sourceUrl,
        sourceName: sourceItem?.contentSource?.name || "Official Source",
        publishedAt: sourceItem?.publishedAt || new Date(),
        isRss: false,
      },
    });

    // Update candidate with articleId and status
    await prisma.articleCandidate.update({
      where: { id: candidate.id },
      data: {
        articleId: article.id,
        status: "DRAFT_CREATED",
      },
    });
  } else if (!candidate.articleId) {
    await prisma.articleCandidate.update({
      where: { id: candidate.id },
      data: {
        articleId: article.id,
        status: "DRAFT_CREATED",
      },
    });
  }

  // Create provenance link in ArticleSourceLink
  if (sourceItem) {
    await prisma.articleSourceLink.upsert({
      where: {
        articleId_sourceItemId: {
          articleId: article.id,
          sourceItemId: sourceItem.id,
        },
      },
      create: {
        articleId: article.id,
        sourceItemId: sourceItem.id,
        versionId: latestVersion?.id || null,
        linkType: "PRIMARY_SOURCE",
      },
      update: {
        versionId: latestVersion?.id || null,
      },
    });

    await prisma.sourceItem.update({
      where: { id: sourceItem.id },
      data: { processingStatus: "IMPORTED" },
    });
  }

  return {
    status: "DRAFT_CREATED",
    candidateId: candidate.id,
    articleId: article.id,
    slug: article.slug,
  };
}
