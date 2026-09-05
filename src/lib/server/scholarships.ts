import "server-only";

import type { Scholarship } from "@/contracts/api";
import type { Scholarship as FrontendScholarship } from "@/data/mock";
import { getBackendUrl, getBffSharedSecret } from "./backendConfig";

const SERVICE_READER_HEADER = "x-bff-service-reader";
const SERVICE_READER_VALUE = "1";

type ScholarshipsResponse = {
  success?: boolean;
  scholarships?: Scholarship[];
};

/** Load the public scholarship catalogue through the server-side BFF boundary. */
export async function getScholarships(): Promise<Scholarship[]> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/scholarships`, {
      headers: {
        accept: "application/json",
        "x-bff-secret": getBffSharedSecret(),
        [SERVICE_READER_HEADER]: SERVICE_READER_VALUE,
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = (await response.json()) as ScholarshipsResponse;
    return data.success && Array.isArray(data.scholarships) ? data.scholarships : [];
  } catch (error) {
    console.error("[scholarships] failed to load public scholarships:", error);
    return [];
  }
}

export async function getScholarship(slug: string): Promise<Scholarship | null> {
  try {
    const response = await fetch(
      `${getBackendUrl()}/api/scholarships/${encodeURIComponent(slug)}`,
      {
        headers: {
          accept: "application/json",
          "x-bff-secret": getBffSharedSecret(),
          [SERVICE_READER_HEADER]: SERVICE_READER_VALUE,
        },
        cache: "no-store",
      },
    );

    if (response.status === 404) return null;
    if (!response.ok) return null;

    const data = (await response.json()) as { success?: boolean; scholarship?: Scholarship };
    return data.success && data.scholarship ? data.scholarship : null;
  } catch (error) {
    console.error(`[scholarships] failed to load scholarship ${slug}:`, error);
    return null;
  }
}

const TYPE_LABEL: Record<Scholarship["type"], FrontendScholarship["type"]> = {
  FULLY_FUNDED: "Fully Funded",
  PARTIAL: "Partial",
  TUITION_WAIVER: "Tuition Waiver",
};

function daysUntil(deadline: string | null): number {
  if (!deadline) return 999;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/** Maps the API DTO to the shape ScholarshipCard already expects. */
export function toFrontendScholarship(s: Scholarship): FrontendScholarship {
  return {
    id: s.slug,
    name: s.name,
    organization: s.organization,
    country: s.destinations[0]?.name ?? "Global",
    funding: s.funding,
    degree: s.degree,
    deadline: s.deadlineString,
    daysLeft: daysUntil(s.deadline),
    eligibility: s.eligibility,
    type: TYPE_LABEL[s.type],
  };
}