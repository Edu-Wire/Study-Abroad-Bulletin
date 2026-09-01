import "server-only";

import type { University } from "@/contracts/api";
import { getBackendUrl, getBffSharedSecret } from "./backendConfig";

const SERVICE_READER_HEADER = "x-bff-service-reader";
const SERVICE_READER_VALUE = "1";

type UniversitiesResponse = {
  success?: boolean;
  universities?: University[];
};

/** Load the public university catalogue through the server-side BFF boundary. */
export async function getUniversities(): Promise<University[]> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/universities`, {
      headers: {
        accept: "application/json",
        "x-bff-secret": getBffSharedSecret(),
        [SERVICE_READER_HEADER]: SERVICE_READER_VALUE,
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = (await response.json()) as UniversitiesResponse;
    return data.success && Array.isArray(data.universities)
      ? data.universities
      : [];
  } catch (error) {
    console.error("[universities] failed to load public universities:", error);
    return [];
  }
}

export async function getUniversity(slug: string): Promise<University | null> {
  try {
    const response = await fetch(
      `${getBackendUrl()}/api/universities/${encodeURIComponent(slug)}`,
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

    const data = (await response.json()) as { success?: boolean; university?: University };
    return data.success && data.university ? data.university : null;
  } catch (error) {
    console.error(`[universities] failed to load university ${slug}:`, error);
    return null;
  }
}
