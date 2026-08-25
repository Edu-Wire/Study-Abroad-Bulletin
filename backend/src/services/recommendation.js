import { prisma } from "../config/prisma.js";

// ============================================================================
// SCORING WEIGHTS & CONSTANTS
// ============================================================================

export const SCORING_WEIGHTS = {
  COUNTRY_MATCH: 50,
  INTEREST_MATCH: 30,
  STUDY_LEVEL_MATCH: 15,
  DEGREE_BRANCH_MATCH: 15,
  DEADLINE_URGENCY_7_DAYS: 20,
  DEADLINE_URGENCY_30_DAYS: 15,
  DEADLINE_URGENCY_90_DAYS: 10,
  DEADLINE_URGENCY_FUTURE: 5,
  RECENCY_3_DAYS: 10,
  RECENCY_7_DAYS: 7,
  RECENCY_30_DAYS: 4,
  RECENCY_90_DAYS: 2,
  CRITICAL_IMPORTANCE: 10,
  HIGH_IMPORTANCE: 5,
  MEDIUM_IMPORTANCE: 2,
};

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

/**
 * Safely normalize string for case-insensitive matching
 */
export function normalizeStr(str) {
  if (!str || typeof str !== "string") return "";
  return str.trim().toLowerCase();
}

/**
 * Check if any country in itemCountries matches student's targetCountries
 */
export function matchCountry(itemCountryIds = [], targetCountries = []) {
  if (!Array.isArray(itemCountryIds) || !Array.isArray(targetCountries) || targetCountries.length === 0) {
    return { matched: false, matchedCountry: null };
  }

  const normalizedTargets = targetCountries.map(normalizeStr).filter(Boolean);
  if (normalizedTargets.length === 0) return { matched: false, matchedCountry: null };

  for (const cid of itemCountryIds) {
    const normCid = normalizeStr(cid);
    if (!normCid) continue;
    if (normalizedTargets.includes(normCid)) {
      return { matched: true, matchedCountry: cid };
    }
  }

  return { matched: false, matchedCountry: null };
}

/**
 * Check if item category / type matches student's interest array
 */
export function matchInterest(category, interests = []) {
  if (!category || !Array.isArray(interests) || interests.length === 0) {
    return false;
  }
  const normCat = normalizeStr(category);
  return interests.some((interest) => normalizeStr(interest) === normCat);
}

/**
 * Check if study level matches between profile and content
 */
export function matchStudyLevel(itemLevel, studentLevel) {
  if (!itemLevel || !studentLevel) return false;
  const normItem = normalizeStr(itemLevel);
  const normStudent = normalizeStr(studentLevel);

  if (normItem === normStudent) return true;
  if (normItem === "both" || normItem === "all levels" || normItem === "all") return true;

  // Flexible study level groupings
  if (normStudent.includes("master") || normStudent.includes("postgrad")) {
    return normItem.includes("master") || normItem.includes("postgrad");
  }
  if (normStudent.includes("bachelor") || normStudent.includes("undergrad")) {
    return normItem.includes("bachelor") || normItem.includes("undergrad");
  }
  if (normStudent.includes("phd") || normStudent.includes("doctorate")) {
    return normItem.includes("phd") || normItem.includes("doctorate");
  }

  return false;
}

/**
 * Check if degree or branch keywords match text in content fields
 */
export function matchDegreeOrBranch(textFields = [], studentDegree = null, studentBranch = null) {
  const keywords = [studentDegree, studentBranch]
    .map(normalizeStr)
    .filter((k) => k.length >= 3);

  if (keywords.length === 0) return { matched: false, matchedKeyword: null };

  const combinedText = textFields.map(normalizeStr).join(" ");
  if (!combinedText) return { matched: false, matchedKeyword: null };

  for (const keyword of keywords) {
    if (combinedText.includes(keyword)) {
      return { matched: true, matchedKeyword: keyword };
    }
  }

  return { matched: false, matchedKeyword: null };
}

/**
 * Calculate recency score boost based on publication/creation date
 */
export function calculateRecencyScore(date, now = new Date()) {
  if (!date) return { score: 0, reason: null };
  const d = new Date(date);
  if (isNaN(d.getTime())) return { score: 0, reason: null };

  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 3) {
    return { score: SCORING_WEIGHTS.RECENCY_3_DAYS, reason: "Published in the last 3 days" };
  }
  if (diffDays <= 7) {
    return { score: SCORING_WEIGHTS.RECENCY_7_DAYS, reason: "Published this week" };
  }
  if (diffDays <= 30) {
    return { score: SCORING_WEIGHTS.RECENCY_30_DAYS, reason: "Published this month" };
  }
  if (diffDays <= 90) {
    return { score: SCORING_WEIGHTS.RECENCY_90_DAYS, reason: null };
  }

  return { score: 0, reason: null };
}

/**
 * Calculate urgency score based on deadline date (future deadlines only)
 */
export function calculateDeadlineUrgencyScore(deadlineDate, now = new Date()) {
  if (!deadlineDate) return { score: 0, reason: null, isPast: false };
  const d = new Date(deadlineDate);
  if (isNaN(d.getTime())) return { score: 0, reason: null, isPast: false };

  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Expired / past deadline
  if (diffDays < 0) {
    return { score: 0, reason: null, isPast: true };
  }

  if (diffDays <= 7) {
    return {
      score: SCORING_WEIGHTS.DEADLINE_URGENCY_7_DAYS,
      reason: `Urgent: Deadline closes in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      isPast: false,
    };
  }
  if (diffDays <= 30) {
    return {
      score: SCORING_WEIGHTS.DEADLINE_URGENCY_30_DAYS,
      reason: `Deadline within ${diffDays} days`,
      isPast: false,
    };
  }
  if (diffDays <= 90) {
    return {
      score: SCORING_WEIGHTS.DEADLINE_URGENCY_90_DAYS,
      reason: "Upcoming deadline within 3 months",
      isPast: false,
    };
  }

  return {
    score: SCORING_WEIGHTS.DEADLINE_URGENCY_FUTURE,
    reason: "Future deadline",
    isPast: false,
  };
}

// ============================================================================
// ARTICLE SCORING ENGINE
// ============================================================================

/**
 * Score an array of published articles against student profile preferences
 */
export function scoreArticles(articles = [], profile = null, now = new Date()) {
  const targetCountries = profile?.targetCountries || [];
  const interests = profile?.interests || [];
  const degree = profile?.degree || null;
  const branch = profile?.branch || null;

  return articles
    .filter((a) => a && a.status === "PUBLISHED") // Never score non-published articles
    .map((article) => {
      let score = 0;
      const reasons = [];

      // 1. Country Match (+50)
      const linkedCountries = [
        article.primaryCountryId,
        article.primaryCountry?.id,
        article.primaryCountry?.name,
        ...(article.countries || []).map((c) => c.countryId || c.country?.id || c.country?.name),
      ].filter(Boolean);

      const countryRes = matchCountry(linkedCountries, targetCountries);
      if (countryRes.matched) {
        score += SCORING_WEIGHTS.COUNTRY_MATCH;
        const countryLabel = article.primaryCountry?.name || countryRes.matchedCountry;
        reasons.push(`Matches your target country: ${countryLabel}`);
      }

      // 2. Interest / Category Match (+30)
      if (matchInterest(article.category, interests)) {
        score += SCORING_WEIGHTS.INTEREST_MATCH;
        reasons.push(`Matches your interest in ${article.category.replace(/_/g, " ")}`);
      }

      // 3. Degree / Branch Keyword Match (+15)
      const degreeRes = matchDegreeOrBranch(
        [article.headline, article.summary, article.content],
        degree,
        branch
      );
      if (degreeRes.matched) {
        score += SCORING_WEIGHTS.DEGREE_BRANCH_MATCH;
        reasons.push(`Relevant to your field of study`);
      }

      // 4. Recency Score (+0 to +10)
      const recency = calculateRecencyScore(article.publishedAt || article.createdAt, now);
      score += recency.score;
      if (recency.reason) {
        reasons.push(recency.reason);
      }

      // Fallback reason if no specific preference matched
      if (reasons.length === 0) {
        reasons.push("Latest global education news");
      }

      return {
        item: article,
        score,
        reasons,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeA = new Date(a.item.publishedAt || a.item.createdAt || 0).getTime();
      const timeB = new Date(b.item.publishedAt || b.item.createdAt || 0).getTime();
      return timeB - timeA;
    });
}

// ============================================================================
// SCHOLARSHIP SCORING ENGINE
// ============================================================================

/**
 * Score an array of scholarships against student profile preferences
 */
export function scoreScholarships(scholarships = [], profile = null, now = new Date()) {
  const targetCountries = profile?.targetCountries || [];
  const interests = profile?.interests || [];
  const studyLevel = profile?.studyLevel || null;
  const degree = profile?.degree || null;
  const branch = profile?.branch || null;

  return scholarships
    .map((scholarship) => {
      let score = 0;
      const reasons = [];

      // 1. Country Match (+50)
      const linkedCountries = [
        scholarship.university?.countryId,
        scholarship.university?.country?.id,
        scholarship.university?.country?.name,
        ...(scholarship.destinations || []).map(
          (d) => d.countryId || d.country?.id || d.country?.name
        ),
      ].filter(Boolean);

      const countryRes = matchCountry(linkedCountries, targetCountries);
      if (countryRes.matched) {
        score += SCORING_WEIGHTS.COUNTRY_MATCH;
        const countryLabel =
          scholarship.destinations?.[0]?.country?.name ||
          scholarship.university?.country?.name ||
          countryRes.matchedCountry;
        reasons.push(`Available in your target country: ${countryLabel}`);
      }

      // 2. Interest Match (+30) — Scholarships category
      if (interests.some((i) => normalizeStr(i).includes("scholarship"))) {
        score += SCORING_WEIGHTS.INTEREST_MATCH;
        reasons.push("Matches your interest in Scholarships");
      }

      // 3. Study Level Match (+15)
      if (matchStudyLevel(scholarship.degree, studyLevel)) {
        score += SCORING_WEIGHTS.STUDY_LEVEL_MATCH;
        reasons.push(`Matches your degree level: ${studyLevel}`);
      }

      // 4. Program / Branch Match (+15)
      const degreeRes = matchDegreeOrBranch(
        [scholarship.name, scholarship.organization, scholarship.eligibility, scholarship.funding],
        degree,
        branch
      );
      if (degreeRes.matched) {
        score += SCORING_WEIGHTS.DEGREE_BRANCH_MATCH;
        reasons.push("Matches your academic specialization");
      }

      // 5. Deadline Urgency (+5 to +20)
      if (scholarship.deadline) {
        const urgency = calculateDeadlineUrgencyScore(scholarship.deadline, now);
        score += urgency.score;
        if (urgency.reason) {
          reasons.push(urgency.reason);
        }
      } else {
        // Fallback to recency
        const recency = calculateRecencyScore(scholarship.createdAt, now);
        score += recency.score;
        if (recency.reason) {
          reasons.push(recency.reason);
        }
      }

      // Fallback reason
      if (reasons.length === 0) {
        reasons.push("Featured international scholarship");
      }

      return {
        item: scholarship,
        score,
        reasons,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Secondary sort: active deadlines first, then newest
      const deadA = a.item.deadline ? new Date(a.item.deadline).getTime() : Infinity;
      const deadB = b.item.deadline ? new Date(b.item.deadline).getTime() : Infinity;
      return deadA - deadB;
    });
}

// ============================================================================
// IMMIGRATION DEADLINE SCORING ENGINE
// ============================================================================

/**
 * Score an array of immigration/policy deadlines against student profile preferences
 */
export function scoreDeadlines(deadlines = [], profile = null, now = new Date()) {
  const targetCountries = profile?.targetCountries || [];
  const interests = profile?.interests || [];

  return deadlines
    .map((deadline) => {
      let score = 0;
      const reasons = [];

      // 1. Country Match (+50)
      const linkedCountries = [
        deadline.countryId,
        deadline.country?.id,
        deadline.country?.name,
      ].filter(Boolean);

      const countryRes = matchCountry(linkedCountries, targetCountries);
      if (countryRes.matched) {
        score += SCORING_WEIGHTS.COUNTRY_MATCH;
        const countryLabel = deadline.country?.name || countryRes.matchedCountry;
        reasons.push(`Directly affects visa & policy in ${countryLabel}`);
      }

      // 2. Interest / Type Match (+30)
      const typeMatches =
        matchInterest(deadline.deadlineType, interests) ||
        (Array.isArray(deadline.tags) &&
          deadline.tags.some((tag) => interests.some((i) => normalizeStr(i) === normalizeStr(tag))));

      if (typeMatches) {
        score += SCORING_WEIGHTS.INTEREST_MATCH;
        reasons.push(`Matches your interest in ${deadline.deadlineType || "Visa Policies"}`);
      }

      // 3. Deadline Urgency (+5 to +20)
      const urgency = calculateDeadlineUrgencyScore(deadline.deadlineDate, now);
      score += urgency.score;
      if (urgency.reason) {
        reasons.push(urgency.reason);
      }

      // 4. Critical / High Importance Boost (+5 to +10)
      if (deadline.importance === "CRITICAL") {
        score += SCORING_WEIGHTS.CRITICAL_IMPORTANCE;
        reasons.push("Critical policy requirement");
      } else if (deadline.importance === "HIGH") {
        score += SCORING_WEIGHTS.HIGH_IMPORTANCE;
        reasons.push("High priority deadline");
      }

      // Fallback reason
      if (reasons.length === 0) {
        reasons.push("Key official immigration deadline");
      }

      return {
        item: deadline,
        score,
        reasons,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeA = new Date(a.item.deadlineDate || 0).getTime();
      const timeB = new Date(b.item.deadlineDate || 0).getTime();
      return timeA - timeB;
    });
}

// ============================================================================
// MAIN PERSONALIZED RECOMMENDATIONS SERVICE
// ============================================================================

/**
 * Retrieve personalized recommendations for an authenticated user.
 *
 * @param {string} userId - User's unique database ID (from req.user.id)
 * @param {object} options - Optional configuration limits
 * @returns {Promise<object>} Structured personalized recommendations
 */
export async function getPersonalizedRecommendations(userId, options = {}) {
  const { articleLimit = 10, scholarshipLimit = 10, deadlineLimit = 10 } = options;

  // 1. Fetch user's stored StudentProfile from PostgreSQL
  let profile = null;
  if (userId) {
    profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });
  }

  const now = new Date();

  // 2. Concurrently fetch candidates from PostgreSQL
  const [articles, scholarships, deadlines] = await Promise.all([
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: {
        primaryCountry: { select: { id: true, name: true, flag: true } },
        countries: {
          include: { country: { select: { id: true, name: true, flag: true } } },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
    prisma.scholarship.findMany({
      include: {
        destinations: {
          include: { country: { select: { id: true, name: true, flag: true } } },
        },
        university: {
          include: { country: { select: { id: true, name: true, flag: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.immigrationDeadline.findMany({
      include: {
        country: { select: { id: true, name: true, flag: true } },
      },
      orderBy: { deadlineDate: "asc" },
      take: 50,
    }),
  ]);

  // 3. Compute deterministic scores and explainable reasons
  const scoredArticles = scoreArticles(articles, profile, now);
  const scoredScholarships = scoreScholarships(scholarships, profile, now);
  const scoredDeadlines = scoreDeadlines(deadlines, profile, now);

  // 4. Return structured recommendations
  return {
    success: true,
    hasProfile: Boolean(profile),
    profile: profile
      ? {
          targetCountries: profile.targetCountries,
          interests: profile.interests,
          studyLevel: profile.studyLevel,
          degree: profile.degree,
          branch: profile.branch,
          preferredIntake: profile.preferredIntake,
          budgetRange: profile.budgetRange,
        }
      : null,
    articles: scoredArticles.slice(0, articleLimit),
    scholarships: scoredScholarships.slice(0, scholarshipLimit),
    deadlines: scoredDeadlines.slice(0, deadlineLimit),
  };
}
