import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ImmigrationTrackerClient } from "./ImmigrationTrackerClient";
import type { ImmigrationDeadline } from "@/data/immigrationDeadlines";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Immigration Deadline Tracker — Student Visa & Policy Intelligence",
  description:
    "Important student visa, immigration policy changes and application dates — live from database and organized by destination.",
};

const deadlineTypeDisplayMap: Record<string, ImmigrationDeadline["deadlineType"]> = {
  VISA: "Visa",
  IMMIGRATION: "Immigration",
  APPLICATION: "Application",
  REGISTRATION: "Registration",
  POLICY: "Policy",
  SCHOLARSHIP: "Scholarship",
};

const statusDisplayMap: Record<string, ImmigrationDeadline["status"]> = {
  CLOSING_SOON: "Closing Soon",
  UPCOMING: "Upcoming",
  UPDATED: "Updated",
  PASSED: "Passed",
};

const importanceDisplayMap: Record<string, ImmigrationDeadline["importance"]> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
};

export default async function ImmigrationTrackerPage() {
  const dbDeadlines = await prisma.immigrationDeadline.findMany({
    include: {
      country: true,
    },
    orderBy: {
      deadlineDate: "asc",
    },
  });

  const deadlines: ImmigrationDeadline[] = dbDeadlines.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    country: d.country.name,
    countryCode: d.country.code,
    deadline: d.deadlineDate.toISOString().split("T")[0],
    deadlineType: deadlineTypeDisplayMap[d.deadlineType] || "Visa",
    status: statusDisplayMap[d.status] || "Upcoming",
    importance: importanceDisplayMap[d.importance] || "High",
    description: d.description,
    source: d.source,
    lastUpdated: d.lastUpdated,
    relatedArticle: d.relatedArticleTitle
      ? {
          title: d.relatedArticleTitle,
          href: d.relatedArticleHref || "#",
        }
      : undefined,
    applicationUrl: d.applicationUrl || undefined,
    tags: d.tags,
    content: d.content || undefined,
  }));

  return <ImmigrationTrackerClient initialDeadlines={deadlines} />;
}
