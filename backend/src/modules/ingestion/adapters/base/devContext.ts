// TEMPORARY - Developer B local harness. Delete after merge with Developer A's
// shared HTTP client (A4) and repositories. Never imported by production code
// paths: `createDevContext` throws unless INGESTION_DEV_CONTEXT=1, and the only
// callers are fixture tests.

import { XMLParser } from "fast-xml-parser";

import type {
  AdapterContext,
  AdapterLogger,
  HttpClient,
  HttpRequestOptions,
  HttpResponse,
  IngestionRepos,
  SyncState,
} from "./types";
import type { SourceConfig } from "../../config/sourceConfig.schema";

function assertDevContextEnabled(): void {
  if (process.env.INGESTION_DEV_CONTEXT !== "1") {
    throw new Error(
      "devContext is a local harness. Set INGESTION_DEV_CONTEXT=1 to use it; production supplies the real AdapterContext."
    );
  }
}

/**
 * In-memory HTTP client backed by recorded fixtures. Blueprint 16.1 requires
 * adapter contract tests with no live network: a test that hits gov.uk fails on
 * a plane, on a rate limit, and on any day a department reorganises its CMS.
 */
export class FixtureHttpClient implements HttpClient {
  readonly requests: string[] = [];

  constructor(
    private readonly fixtures: Record<string, string | object>,
    private readonly options: { notModified?: boolean } = {}
  ) {}

  async get<T = string>(url: string, opts?: HttpRequestOptions): Promise<HttpResponse<T>> {
    this.requests.push(url);

    if (this.options.notModified && opts?.conditional?.etag) {
      return {
        status: 304,
        headers: {},
        finalUrl: url,
        body: "" as T,
        notModified: true,
      };
    }

    const fixture = this.match(url);
    if (fixture === undefined) {
      throw new Error(`No fixture registered for ${url}`);
    }

    return {
      status: 200,
      headers: { "content-type": typeof fixture === "string" ? "text/html" : "application/json" },
      finalUrl: url,
      body: fixture as T,
      notModified: false,
    };
  }

  /** Exact match first, then the longest registered prefix. */
  private match(url: string): string | object | undefined {
    if (url in this.fixtures) return this.fixtures[url];

    const prefixes = Object.keys(this.fixtures)
      .filter((key) => url.startsWith(key.split("?")[0]))
      .sort((a, b) => b.length - a.length);

    return prefixes.length > 0 ? this.fixtures[prefixes[0]] : undefined;
  }
}

/**
 * XXE-safe parse settings mirroring Developer A's `safeXmlParser.js`: entity
 * processing off, no DTD expansion. The harness must not be more permissive
 * than production, or a fixture test would pass on a parser we never ship.
 */
export const devXmlParser = {
  parse(text: string): unknown {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      processEntities: false,
      parseTagValue: false,
      trimValues: true,
    });
    return parser.parse(text);
  },
};

export function createSilentLogger(sink: string[] = []): AdapterLogger {
  const record = (level: string) => (message: string) => {
    sink.push(`${level}: ${message}`);
  };
  return {
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
  };
}

/** In-memory repositories. Records every write so tests can assert on them. */
export function createDevRepos(): IngestionRepos & {
  writes: { assessments: unknown[]; candidates: unknown[]; articles: unknown[]; links: unknown[] };
} {
  const writes = {
    assessments: [] as unknown[],
    candidates: [] as unknown[],
    articles: [] as unknown[],
    links: [] as unknown[],
  };
  const candidatesBySourceItem = new Map<string, Record<string, unknown>>();

  return {
    writes,
    aiAssessment: {
      async create(payload) {
        writes.assessments.push(payload);
        return { id: `assessment-${writes.assessments.length}` };
      },
    },
    articleCandidate: {
      async upsertBySourceItem(payload) {
        writes.candidates.push(payload);
        const key = String(payload.sourceItemId);
        const existing = candidatesBySourceItem.get(key);
        const record: Record<string, unknown> = {
          ...(existing ?? {}),
          ...payload,
          id: existing?.id ?? `candidate-${key}`,
        };
        candidatesBySourceItem.set(key, record);
        return { id: String(record.id), status: String(record.status ?? "PENDING") };
      },
      async findBySourceItem(sourceItemId) {
        return candidatesBySourceItem.get(sourceItemId) ?? null;
      },
    },
    article: {
      async createDraftFromCandidate(payload) {
        writes.articles.push(payload);
        return { id: `article-${writes.articles.length}`, slug: String(payload.slug ?? "draft") };
      },
    },
    articleSourceLink: {
      async link(payload) {
        writes.links.push(payload);
      },
    },
    country: {
      async findIdsByCodes(codes) {
        return Object.fromEntries(codes.map((code) => [code, `country-${code}`]));
      },
    },
  };
}

export interface DevContextOptions {
  source: SourceConfig;
  fixtures: Record<string, string | object>;
  syncState?: SyncState;
  now?: Date;
  notModified?: boolean;
  maxItems?: number;
}

export function createDevContext(options: DevContextOptions): AdapterContext & {
  http: FixtureHttpClient;
  logs: string[];
} {
  assertDevContextEnabled();

  const logs: string[] = [];
  const frozenNow = options.now ?? new Date("2026-09-02T09:00:00.000Z");

  return {
    source: options.source,
    http: new FixtureHttpClient(options.fixtures, { notModified: options.notModified }),
    xml: devXmlParser,
    logger: createSilentLogger(logs),
    now: () => frozenNow,
    syncState: options.syncState,
    maxItems: options.maxItems,
    logs,
  };
}
