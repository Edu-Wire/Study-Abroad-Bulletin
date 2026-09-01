import "server-only";

import type { Country } from "@/contracts/api";
import { getBackendUrl, getBffSharedSecret } from "./backendConfig";

const SERVICE_READER_HEADER = "x-bff-service-reader";
const SERVICE_READER_VALUE = "1";

type CountriesResponse = {
  success?: boolean;
  countries?: Country[];
};

/** Load the public country catalogue through the server-side BFF boundary. */
export async function getCountries(): Promise<Country[]> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/countries/public`, {
      headers: {
        accept: "application/json",
        "x-bff-secret": getBffSharedSecret(),
        [SERVICE_READER_HEADER]: SERVICE_READER_VALUE,
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = (await response.json()) as CountriesResponse;
    return data.success && Array.isArray(data.countries) ? data.countries : [];
  } catch (error) {
    console.error("[countries] failed to load public countries:", error);
    return [];
  }
}
