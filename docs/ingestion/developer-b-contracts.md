# Developer B — Frozen Contracts (Day 2)

Everything Developer B builds is **pure and dependency-injected**. Adapters and
services never import Prisma, never import a concrete HTTP client by path, and
never open a socket. All I/O arrives through `AdapterContext`.

Source of truth in code: `backend/src/modules/ingestion/adapters/base/types.ts`.
This document is the human-readable freeze and the hand-off list for Developer A.

---

## 1. File-extension convention

| Owner | Extension | Notes |
| :--- | :--- | :--- |
| Developer A | `.js` (ESM, `"type": "module"`) | `ingestion.routes.js`, `types.js`, `utils/*.js` |
| Developer B | `.ts` | Established Day 1; typechecked by the root `tsconfig.json` (`include: **/*.ts`) |

**Dependency on A (build step):** B's `.ts` modules are typechecked but not
compiled. Node 24 can strip types from `.ts` only with explicit `.ts` import
specifiers, which conflicts with `tsc`'s bundler resolution used across this
repo. Before the worker imports B code at runtime, one of the following must be
agreed — no bundler was added today:

1. run the worker through `tsx` (already a devDependency), or
2. add a `tsc` build step emitting `.js` for `backend/`, or
3. B converts the adapter layer to `.js` + JSDoc types at merge time.

B's `verify:sources` script runs under `tsx`, so registry validation works today
either way.

---

## 2. `AdapterContext` — provided by A at call time

```ts
interface AdapterContext {
  source: SourceConfig;                  // B-owned shape, from the registry
  http: HttpClient;                      // A-owned impl (timeouts, retries, backoff,
                                         // Retry-After, conditional GET, redirect caps,
                                         // payload limits, SSRF guard)
  xml: { parse(text: string): unknown }; // A-owned safe parser (DTD/entities disabled)
  logger: AdapterLogger;
  now(): Date;
  syncState?: { watermarkAt?: string; cursor?: string; etag?: string; lastModified?: string };
  window?: { start: Date; end: Date; cursor?: string };  // backfill lane
  signal?: AbortSignal;
  maxItems?: number;
}

interface HttpResponse<T = string> {
  status: number;
  headers: Record<string, string>;
  finalUrl: string;      // after redirects — canonical-URL fallback
  body: T;
  notModified: boolean;  // 304 via conditional GET
}

interface HttpClient {
  get<T = string>(url: string, opts?: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    maxBytes?: number;
    responseType?: "text" | "json" | "buffer";
    conditional?: { etag?: string; lastModified?: string };
  }): Promise<HttpResponse<T>>;
}
```

A's `utils/httpClient.js` already exports `safeFetch(url, options)` with the SSRF
guard, `parseRetryAfter` and `calculateBackoffWithJitter`. **A must provide a thin
`HttpClient` wrapper over `safeFetch`** matching the signature above —
specifically `finalUrl`, `notModified`, and the `conditional` option. B consumes
nothing else.

Similarly `xml.parse` wraps A's `utils/safeXmlParser.js#parseSafeXml`.

---

## 3. `IngestionRepos` — persistence B needs from A

B **never** calls Prisma. Every write goes through these methods:

```ts
interface IngestionRepos {
  aiAssessment: { create(payload): Promise<{ id: string }> };
  articleCandidate: {
    upsertBySourceItem(payload): Promise<{ id: string; status: string }>;
    findBySourceItem(sourceItemId: string): Promise<CandidateRecord | null>;
  };
  article: { createDraftFromCandidate(payload): Promise<{ id: string; slug: string }> };
  articleSourceLink: { link(payload): Promise<void> };
  country: { findIdsByCodes(codes: string[]): Promise<Record<string, string>> };
}
```

`article.createDraftFromCandidate` **must** persist `status: "DRAFT"`. B passes it
explicitly and asserts it in a unit test, but A owns the write.

---

## 4. Job payloads B expects from A's worker

### `source.classify` → `classification.service.assess()`

```ts
{
  source: SourceConfig;              // or sourceCode: string, resolved via requireSource()
  sourceItem: { id: string; externalId: string; canonicalUrl: string; detailStatus: string };
  document: NormalizedSourceDocument;  // full text, NOT the feed summary
  repos: IngestionRepos;
  logger: AdapterLogger;
  providerOverride?: "mock" | "anthropic";
}
// returns { prefilter, assessment, route, assessmentId }
```

### `candidate.draft` → `candidate.service.createOrUpdateCandidate()`

```ts
{
  source: SourceConfig;
  sourceItem: { id: string; ... };
  version?: { id: string; hash: string };
  document: NormalizedSourceDocument;
  assessment: AiAssessment;
  route: EditorialRoute;
  repos: IngestionRepos;
  actor?: { id: string; kind: "SYSTEM" | "USER" };
}
```

**Idempotency key is `sourceItem.id`.** Re-running sync updates the candidate; it
never creates a second one.

---

## 5. Enum alignment with A's `types.js`

B's internal taxonomy matches A's `InternalAiCategory` exactly (`STUDENT_VISA`,
`IMMIGRATION_POLICY`, `POST_STUDY_WORK`, `INTERNATIONAL_EDUCATION`, `SCHOLARSHIP`,
`ADMISSIONS`, `DATA_INTELLIGENCE`, `EU_POLICY`, `OTHER`), plus one value A does
not have:

- **`UNCLASSIFIED`** — B's terminal fallback. `enforceCategoryInvariants()` assigns
  it whenever confidence or scholarship relevance falls below the gate. **A must
  add `UNCLASSIFIED` to `InternalAiCategory` and to the Prisma enum**, or persist
  it as `OTHER` and keep the distinction in `reasonCodes`. B will not default to
  `SCHOLARSHIP` under any circumstance.

B's `EditorialRoute` is finer-grained than A's `RoutingDecision`. Mapping B applies
before handing a value to A:

| B `EditorialRoute` | A `RoutingDecision` |
| :--- | :--- |
| `IGNORE` | `IGNORE` |
| `HOLD` | `IGNORE` (evidence retained, no candidate surfaced) |
| `REVIEW` | `REVIEW` |
| `AUTO_DRAFT` | `CREATE_DRAFT` |
| `CRITICAL_DRAFT_ALERT` | `CREATE_DRAFT` (+ pin/alert flag on the candidate) |

`RoutingDecision.PUBLISH` exists in A's enum but **B never emits it.** Phase 1
launch safety (Blueprint §10.3) is human-publish-only.

---

## 6. Environment variables B introduces

| Var | Default | Purpose |
| :--- | :--- | :--- |
| `AI_PROVIDER` | `mock` | `mock` \| `anthropic`. Mock is the default so the Day-3 E2E never needs an API key. |
| `ANTHROPIC_API_KEY` | — | Required only when `AI_PROVIDER=anthropic`. |
| `AI_MODEL` | `claude-sonnet-5` | Model id recorded on every assessment. |
| `INGESTION_DEV_CONTEXT` | unset | `1` enables B's in-memory harness stubs. Never set in production. |
| `NEXT_PUBLIC_INGESTION_API` | unset | `1` makes the Admin UI call A's endpoints instead of the registry-seeded fallback. |

---

## 7. Dependencies on Developer A

1. **`HttpClient` wrapper** over `safeFetch` exposing `finalUrl`, `notModified`
   and `conditional` (§2). Without it adapters cannot run against live sources.
2. **`xml.parse` wrapper** over `parseSafeXml` (§2).
3. **`IngestionRepos`** implementation (§3). B's services are written against it
   and stubbed locally behind `INGESTION_DEV_CONTEXT=1`.
4. **`UNCLASSIFIED`** added to `InternalAiCategory` + the Prisma enum, or an
   agreed persistence strategy for it (§5).
5. **`article.createDraftFromCandidate` must hardcode `status: "DRAFT"`.**
   There is no B code path that sets `PUBLISHED`.
6. **Content hashing, versioning and diffing stay with A.** B's change-watch
   adapters return the extracted content region and material facts only; they
   deliberately do not hash.
7. **🔴 SECURITY — auth on the ingestion router.** `backend/src/server.js:80`
   mounts `ingestionRoutes` at `/api/admin`. Read endpoints in
   `ingestion.routes.js` (`GET /content-sources`, `/source-items`, `/source-runs`,
   `/source-health`) carry **no auth middleware** — only the mutating routes use
   `requireAdmin`. Separately, `src/middleware.ts` trusts an unverified
   `auth_role` cookie for admin routing. Neither is B-owned and neither was
   touched today. **A must mount the ingestion router behind the same
   auth/role middleware as the other admin endpoints, and that middleware must
   be hardened, before cutover.**
8. **`POST /content-sources/:id/sync`** is enqueue-only and must return promptly
   with a run id; the Admin UI disables the button while a run is in flight and
   does not poll for completion today.

---

## 8. What B guarantees to A

- Adapters are stateless and side-effect free apart from `ctx.http` reads.
- No adapter computes a hash, a version, or a diff.
- No adapter or service imports `prisma`, `fetch`, `axios`, or `node:https`.
- Every registry record has `autoPublish: false`; `validateRegistry()` throws
  otherwise.
- Every registry record carries an Appendix A reference and an official URL;
  `npm run verify:sources` regenerates `docs/ingestion/appendix-a-traceability.md`
  from them.
- A failed discovery page raises `DiscoveryPageError` and is never silently
  converted into "end of results".
