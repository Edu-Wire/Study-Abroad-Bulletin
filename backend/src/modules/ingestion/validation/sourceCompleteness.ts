/**
 * Day-3 B3 — source completeness.
 *
 * For every configured Phase 1 source, answer the seven questions from the
 * execution plan:
 *
 *   adapter exists?  config exists?  official reference recorded?
 *   discover works?  detail works?   identity defined?  healthcheck works?
 *
 * "Works" is checked by execution, not by reading the source. Each adapter is
 * instantiated and its methods are called with a probe context whose HTTP client
 * records the request and then throws a sentinel. An adapter that reaches the
 * network with a URL derived from its own config has demonstrably built a
 * request; one that returns without any HTTP call (a change-watch enumerating
 * its targets) has demonstrably produced items. An unimplemented method throws
 * `AdapterNotImplementedError`, and that is the failure this catches.
 *
 * No live request is ever made: the sentinel is thrown before a socket opens,
 * so this runs offline and cannot be broken by a department reorganising its
 * CMS. It proves the wiring, not the remote endpoint — `POST
 * /api/admin/content-sources/:id/healthcheck` is what tests the endpoint.
 */

import { XMLParser } from "fast-xml-parser";

import { PHASE1_SOURCES } from "../config/sourceRegistry";
import { ADAPTER_REGISTRY, createAdapter } from "../adapters/index";
import { AdapterNotImplementedError, type SourceAdapter } from "../adapters/base/SourceAdapter";
import type { SourceConfig } from "../config/sourceConfig.schema";
import type {
  AdapterContext,
  DiscoveredItem,
  HttpRequestOptions,
  HttpResponse,
} from "../adapters/base/types";

/** Thrown by the probe HTTP client instead of opening a connection. */
class ProbeIntercept extends Error {
  constructor(readonly url: string) {
    super(`probe intercepted request to ${url}`);
    this.name = "ProbeIntercept";
  }
}

/** Adapters wrap failures (`DiscoveryPageError`), so unwrap before judging. */
function findIntercept(error: unknown, depth = 0): ProbeIntercept | null {
  if (depth > 5 || !error || typeof error !== "object") return null;
  if (error instanceof ProbeIntercept) return error;
  const cause = (error as { cause?: unknown }).cause;
  return cause ? findIntercept(cause, depth + 1) : null;
}

function findNotImplemented(error: unknown, depth = 0): AdapterNotImplementedError | null {
  if (depth > 5 || !error || typeof error !== "object") return null;
  if (error instanceof AdapterNotImplementedError) return error;
  const cause = (error as { cause?: unknown }).cause;
  return cause ? findNotImplemented(cause, depth + 1) : null;
}

function createProbeContext(source: SourceConfig): AdapterContext & { requests: string[] } {
  const requests: string[] = [];

  return {
    source,
    requests,
    http: {
      async get<T = string>(url: string, _opts?: HttpRequestOptions): Promise<HttpResponse<T>> {
        requests.push(url);
        throw new ProbeIntercept(url);
      },
    },
    xml: {
      parse(text: string) {
        return new XMLParser({ processEntities: false, ignoreAttributes: false }).parse(text);
      },
    },
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    now: () => new Date("2026-09-04T00:00:00.000Z"),
    maxItems: 5,
  };
}

export type CheckStatus = "PASS" | "FAIL" | "NOT_APPLICABLE";

export interface Check {
  status: CheckStatus;
  detail: string;
}

export interface SourceCompleteness {
  code: string;
  name: string;
  geo: string;
  family: string;
  enabled: boolean;
  checks: {
    adapterExists: Check;
    configExists: Check;
    officialReference: Check;
    discoverWorks: Check;
    detailWorks: Check;
    identityDefined: Check;
    healthcheckWorks: Check;
  };
  complete: boolean;
}

const pass = (detail: string): Check => ({ status: "PASS", detail });
const fail = (detail: string): Check => ({ status: "FAIL", detail });
const notApplicable = (detail: string): Check => ({ status: "NOT_APPLICABLE", detail });

/**
 * Classify the outcome of calling one adapter method under the probe.
 *
 * Reaching the network is a pass. Completing with no request is a pass only
 * when the method genuinely has nothing to fetch, which the caller decides;
 * everything else is the adapter failing before it built a request.
 */
function judge(
  outcome: { ok: true; value: unknown } | { ok: false; error: unknown },
  requests: string[],
  onNoRequest: (value: unknown) => Check
): Check {
  if (outcome.ok) {
    return requests.length > 0
      ? pass(`requested ${requests[0]}`)
      : onNoRequest(outcome.value);
  }

  const intercepted = findIntercept(outcome.error);
  if (intercepted) return pass(`requested ${intercepted.url}`);

  const notImplemented = findNotImplemented(outcome.error);
  if (notImplemented) return fail(`${notImplemented.method}() is not implemented`);

  const message = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
  return fail(`threw before issuing a request: ${message}`);
}

async function attempt<T>(
  run: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * A stand-in discovery record for probing `fetchDetail` on a source whose own
 * discovery could not complete offline.
 *
 * `discoveryRaw` carries the transport-specific fields adapters read at detail
 * time — a dataset's file URL, a watch target key, a GOV.UK base path. Without
 * them a detail probe would report a failure that only the probe caused: the
 * adapter would return `EMPTY_CONTENT` before building a request, which looks
 * identical to an unwired adapter and is not.
 */
function syntheticItem(source: SourceConfig): DiscoveredItem {
  return {
    sourceId: source.code,
    externalId: `probe-${source.code}`,
    canonicalUrl: source.discovery.url,
    title: `Completeness probe for ${source.name}`,
    publishedAt: "2026-09-01T00:00:00.000Z",
    documentType: "PROBE",
    sourceTopics: [],
    discoveryRaw: {
      fileUrl: source.discovery.url,
      releaseKey: "2026-08",
      watchTargetKey: source.watchTargets?.[0]?.key,
      basePath: new URL(source.discovery.url).pathname,
    },
  };
}

async function checkDiscover(
  adapter: SourceAdapter,
  source: SourceConfig
): Promise<{ check: Check; item: DiscoveredItem }> {
  const ctx = createProbeContext(source);
  const outcome = await attempt(() => adapter.discover(ctx));

  const check = judge(outcome, ctx.requests, (value) => {
    // A change-watch enumerates its configured targets without fetching.
    const items = (value as { items?: DiscoveredItem[] }).items ?? [];
    return items.length > 0
      ? pass(`enumerated ${items.length} target(s) with no request`)
      : fail("returned no items and issued no request");
  });

  const discovered =
    outcome.ok && ((outcome.value as { items?: DiscoveredItem[] }).items ?? []).length > 0
      ? (outcome.value as { items: DiscoveredItem[] }).items[0]
      : syntheticItem(source);

  return { check, item: discovered };
}

async function checkDetail(
  adapter: SourceAdapter,
  source: SourceConfig,
  item: DiscoveredItem
): Promise<Check> {
  const ctx = createProbeContext(source);
  const outcome = await attempt(() => adapter.fetchDetail(item, ctx));

  return judge(outcome, ctx.requests, (value) => {
    const status = (value as { detailStatus?: string }).detailStatus;
    // A source whose discovery payload is already the full document declares
    // `requiresDetailFetch: false`; returning without a request is correct there.
    if (!source.detail.requiresDetailFetch) {
      return pass(`no detail fetch required (${status ?? "no status"})`);
    }
    return fail("returned without fetching, but the config requires a detail fetch");
  });
}

async function checkHealthcheck(adapter: SourceAdapter, source: SourceConfig): Promise<Check> {
  if (typeof adapter.healthcheck !== "function") {
    return fail("adapter does not implement healthcheck()");
  }

  const ctx = createProbeContext(source);
  const outcome = await attempt(() => adapter.healthcheck!(ctx));

  if (!outcome.ok) {
    // A healthcheck that throws instead of reporting is itself the defect:
    // the operations screen would get a 500 rather than a health state.
    const intercepted = findIntercept(outcome.error);
    return intercepted
      ? fail(`reached ${intercepted.url} but threw instead of returning a health state`)
      : fail(`threw: ${outcome.error instanceof Error ? outcome.error.message : String(outcome.error)}`);
  }

  const health = outcome.value as { state?: string; checkedAt?: string };
  if (!health?.state || !health.checkedAt) {
    return fail("returned no health state");
  }
  return ctx.requests.length > 0
    ? pass(`probed ${ctx.requests[0]} -> ${health.state}`)
    : pass(`returned ${health.state} with no request`);
}

function checkOfficialReference(source: SourceConfig): Check {
  const { references, appendixExempt, note, owner } = source.provenance;
  if (references.length > 0) {
    return pass(`Appendix A ${references.join(", ")} · ${owner}`);
  }
  if (appendixExempt && note) {
    return pass(`exempt — ${note}`);
  }
  return fail("no Appendix A reference and no justified exemption");
}

function checkIdentity(source: SourceConfig): Check {
  if (!source.externalIdStrategy) return fail("no externalIdStrategy");
  if (!source.canonicalUrlRule) return fail("no canonicalUrlRule");
  return pass(`${source.externalIdStrategy} -> ${source.canonicalUrlRule}`);
}

/** Run all seven checks for one source. */
export async function checkSource(source: SourceConfig): Promise<SourceCompleteness> {
  const adapterExists = ADAPTER_REGISTRY[source.code]
    ? pass(`${source.adapterClass} (${source.adapter})`)
    : fail("no adapter registered for this source code");

  let adapter: SourceAdapter | null = null;
  let instantiationError: string | null = null;
  try {
    adapter = createAdapter(source);
  } catch (error) {
    instantiationError = error instanceof Error ? error.message : String(error);
  }

  const unavailable = fail(
    instantiationError ? `adapter did not instantiate: ${instantiationError}` : "no adapter"
  );

  let discoverWorks = unavailable;
  let detailWorks = unavailable;
  let healthcheckWorks = unavailable;

  if (adapter) {
    const discovery = await checkDiscover(adapter, source);
    discoverWorks = discovery.check;
    detailWorks = await checkDetail(adapter, source, discovery.item);
    healthcheckWorks = await checkHealthcheck(adapter, source);
  }

  const checks = {
    adapterExists,
    // Reaching this function at all means the source parsed the registry
    // schema, which is where the config's validity is actually decided.
    configExists: pass(`${source.transport} · ${source.schedule} · priority ${source.priority}`),
    officialReference: checkOfficialReference(source),
    discoverWorks,
    detailWorks,
    identityDefined: checkIdentity(source),
    healthcheckWorks,
  };

  return {
    code: source.code,
    name: source.name,
    geo: source.geo,
    family: source.adapter,
    enabled: source.enabled,
    checks,
    complete: Object.values(checks).every((check) => check.status !== "FAIL"),
  };
}

export async function checkAllSources(): Promise<SourceCompleteness[]> {
  const results: SourceCompleteness[] = [];
  for (const source of PHASE1_SOURCES) {
    results.push(await checkSource(source));
  }
  return results;
}

export const CHECK_LABELS: Array<[keyof SourceCompleteness["checks"], string]> = [
  ["adapterExists", "adapter"],
  ["configExists", "config"],
  ["officialReference", "official ref"],
  ["discoverWorks", "discover"],
  ["detailWorks", "detail"],
  ["identityDefined", "identity"],
  ["healthcheckWorks", "healthcheck"],
];
