# Project Reorganization Plan

**Status:** Proposed — awaiting approval. No source files have been modified.
**Date:** 2026-08-27
**Branch:** `architecture-changes`
**Baseline commit:** `c92c856`

---

## 1. Purpose and non-goals

### Purpose

Move this codebase from a working-but-monolithic layout to a **staged modular monolith**, without
changing runtime behavior and without altering the deployment model.

Target data flow:

```
Seed fixtures ──► PostgreSQL ──► Express (repository → service → controller → route)
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
Browser → Next.js BFF route → Express            Next.js Server Component
  (/api/backend/*)                                → server-only reader → Express
```

### Explicit non-goals

| Not doing | Why |
|---|---|
| Full rewrite | 153 tests pass today. A rewrite forfeits that evidence. |
| Monorepo migration | No second consumer of the API exists yet. Cost without benefit. |
| Enabling `cacheComponents` | Separate migration with hard breaking changes. See §9. |
| Changing the security model | Verified working. See §3 — an invariant, not a target. |
| Renaming `src/components/*` subfolders | ~99 import references, zero behavioral gain. See §10. |

---

## 2. Verified baseline

Every figure was measured against the working tree at `c92c856`, not estimated.

### Environment

| Item | Version |
|---|---|
| Next.js | 16.3.0 |
| Express | 5.2.1 |
| express-rate-limit | 8.6.2 |
| Prisma / @prisma/client | 7.9.1 |
| React | 19.2.8 |
| Node (CI) | 24 |

### Backend

```
backend/src/server.js                    1621   ← 22 route handlers, 32 inline `prisma.*` calls
backend/src/services/recommendation.js    522
backend/src/validators/index.js           303
backend/src/services/session.service.js   184
backend/src/middleware/auth.js            164
backend/src/middleware/bff.js             110
backend/src/config/session.js              96
backend/src/middleware/validate.js         64
backend/src/middleware/rateLimiter.js      63
backend/src/config/db.js                   13
backend/src/config/prisma.js                9
                                        —————
                                         3149 total
```

`backend/src/routes/`, `controllers/`, `services/`, and `utils/` **already exist** as empty
directories with `.gitkeep` files. This plan finishes work that was already scaffolded.

`startServer()` is already isolated at `server.js:1608-1621`, so the `app.js` / `server.js` split
is mechanically clean.

### Frontend — largest files

```
1320  src/components/editorial/AdminArticleLiveEditor.tsx
 832  src/components/home/ServerSections.tsx
 789  src/app/admin/users/page.tsx
 702  src/data/mock.ts
 662  src/components/admin/RSSPreviewPanel.tsx
 612  src/app/admin/news/page.tsx
 497  src/components/site/Header.tsx
 495  src/lib/taxonomy.ts
 482  src/app/dashboard/DashboardClient.tsx
 474  src/components/admin/ArticleFormModal.tsx
 464  src/app/admin/page.tsx
```

### Test suite

`153 tests, 0 failures, ~87s` (requires a live PostgreSQL). Suites in `tests/api/` (8 files),
`tests/auth/` (4 files), plus `tests/setup.mjs`. **`tests/e2e/` exists but is empty.**

`npx tsc --noEmit` is clean. `.lint-baseline.json` records 38 accepted warnings
(35 × `no-unused-vars`).

---

## 3. Invariants — must not change

Load-bearing security properties, verified in code. Any diff that weakens one is rejected
regardless of its other merits.

| Invariant | Enforced at |
|---|---|
| Express is the sole authorization authority | `backend/src/middleware/auth.js`; re-reads session + user per request |
| The BFF route is transport-only | `src/app/api/backend/[...path]/route.ts` — header comment states this explicitly |
| No browser-visible backend URL | `src/lib/server/backendConfig.ts` — `server-only`, no `NEXT_PUBLIC_*` |
| No browser JWT / no browser-readable token | `jsonwebtoken` removed; opaque session cookie only |
| No browser-trusted role cookie | Roles resolved server-side via `/api/me` |
| `trust proxy` stays OFF | `backend/src/middleware/bff.js:76-79` — enabling it restores the XFF forgery bypass |
| Client address believed only after secret check | `bff.js:65-69` — assignment is downstream of `secretsMatch` |
| Repositories become the only layer touching Prisma | Target state, post-extraction |
| `src/data/*` is seed content, never runtime content | Target state, enforced by test (Phase 8) |

Three tests already guard the removed-JWT invariant, including a source scan over
`["backend/src", "src/lib", "src/app", "prisma"]`.

---

## 4. Findings that change the plan

Five issues found during audit. Three are blocking.

### 4.1 — BLOCKING: server-side readers collapse into one rate-limit bucket

**Evidence chain:**

- `backend/src/server.js:82` → `app.use("/api", generalApiLimiter)` — global, **100 req / 15 min**
- `backend/src/middleware/rateLimiter.js:12` → all limiters key on `clientKeyGenerator`
- `clientKeyGenerator` (`bff.js:96`) prefers `req.trustedClientAddress`
- `req.trustedClientAddress` is set only when `x-bff-client-address` is present (`bff.js:65-69`)
- **Only the BFF route sends that header** — `src/app/api/backend/[...path]/route.ts:141`
- **`src/lib/server/session.ts` does not send it**, and neither will new readers

So every server-reader request falls back to `req.ip` — the Next.js server's own address. All such
traffic shares **one 100-request bucket**. The comment in `rateLimiter.js:6-8` describes this exact
outcome: *"letting a single caller exhaust the limit for everyone — a denial of service rather than
a protection."*

express-rate-limit's own docs describe the failure mode in the same terms: a `keyGenerator`
"returning identical values creates a global rate limiter."

Converting six page domains to server readers multiplies this traffic. Real visitors would receive
429s. **Must be resolved before any page is converted.** See D3.

### 4.2 — BLOCKING: `GET /api/countries` is not reusable

`server.js:823-833` selects only three fields:

```js
select: { id: true, name: true, flag: true },
```

The comment above it reads *"for admin form dropdowns."* The countries pages require
`universitiesCount`, `averageTuition`, `popularIntake`, `updatesCount`, `heroImage`.

Phase 5 therefore **adds** a public endpoint; it does not reuse this one.

### 4.3 — BLOCKING: contract drift between Prisma and the frontend types

Measured field by field. This is the "silent divergence" the plan exists to prevent — and it is
already present:

| Domain | Prisma | `src/data/*` | Kind of drift |
|---|---|---|---|
| Country | `universitiesCount` | `universities` | rename |
| Country | `updatesCount` | `updates` | rename |
| Country | `code`, `heroImage` | *(absent)* | missing on frontend |
| University | `slug`, `countryId` (relation) | *(no slug)*, `country: string` | shape |
| Scholarship | `deadline: DateTime?` + `deadlineString` | `deadline: string` | split column |
| Scholarship | `destinations[]` (join table) | `country: string` | cardinality |
| Scholarship | *(none)* | `daysLeft: number` | **computed, not stored** |
| Deadline | `relatedArticleTitle`, `relatedArticleHref` | `relatedArticle: { title, href }` | flat vs nested |
| Deadline | `deadlineDate: DateTime` | `deadline: string` (ISO) | type + name |
| Deadline | `countryId` | `country`, `countryCode` | denormalized |

`daysLeft` deserves emphasis: it is **derived at render time and has no column.** Whoever writes the
countries/scholarships services must decide whether it is computed in the service, the reader, or
the component. Left undecided it becomes three inconsistent implementations.

### 4.4 — Scope reduction: 12 of 30 `mock.ts` importers are type-only

This materially shrinks the work.

**Type-only (12) — resolved for free by Phase 1, no conversion needed:**

```
src/app/dashboard/DashboardClient.tsx        src/components/home/LatestNews.tsx
src/components/cards/CountryCard.tsx         src/components/home/ServerSections.tsx
src/components/cards/MiscCards.tsx           src/lib/articles.ts
src/components/cards/NewsCards.tsx           src/lib/rss/index.ts
src/components/cards/ScholarshipCard.tsx     src/lib/rss/ircc.ts
src/components/cards/UniversityCard.tsx      src/lib/rss/uk.ts
```

**Value imports (17) — real conversion work:**

```
src/app/admin/countries/page.tsx      src/app/guides/[slug]/page.tsx
src/app/admin/deadlines/page.tsx      src/app/scholarships/page.tsx
src/app/admin/guides/page.tsx         src/app/scholarships/[slug]/page.tsx
src/app/admin/scholarships/page.tsx   src/app/search/page.tsx
src/app/admin/universities/page.tsx   src/app/universities/[slug]/page.tsx
src/app/admin/visa/page.tsx           src/app/visa/page.tsx
src/app/countries/page.tsx            src/components/common/SearchWithDropdown.tsx
src/app/guides/page.tsx               src/components/common/Sidebar.tsx
                                      src/components/home/FindYourUniversity.tsx
```

Six of the value importers are **admin pages reading mock data** — arguably worse than the public
ones: an admin screen that appears to manage content but edits an in-memory array.

### 4.5 — Asset duplication is worse than "consolidate logos" implies

Verified by MD5:

```
2e7a0da9024df863c30469e59c705eff  public/logo-footer.png            0 refs
2e7a0da9024df863c30469e59c705eff  public/logo/footer-logo.png       0 refs
2e7a0da9024df863c30469e59c705eff  public/logo/footer-logo-v2.png    0 refs
2e7a0da9024df863c30469e59c705eff  public/logo/footer-logo-v3.png    1 ref   ← keep
f1a0a55971cfc28b71b2023feecd3ff2  public/logo.png                   0 refs
f1a0a55971cfc28b71b2023feecd3ff2  public/logo/logo.png              9 refs  ← keep
```

Four byte-identical footer logos. Fully unreferenced: `public/logo.png`, `public/logo-footer.png`,
`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`.

`public/logo/ab-logo.png` is **942 KB**, loaded on 10 auth screens. Optimize while there.

---

## 5. Architecture decisions, with evidence

### D1 — Server Components call a server-only reader, never the app's own BFF route

**Decision:** Server Components import a `server-only` reader that fetches `BACKEND_URL` directly
with the `x-bff-secret` header. They never fetch `/api/backend/*`.

**Proof — a correctness requirement, not a preference.** Next.js 16.3.0 ships a guide named
`backend-for-frontend.md`, describing this exact architecture. Its "Caveats → Server Components"
section states, verbatim
(`node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md:879-885`):

> Fetch data in Server Components directly from its source, not via Route Handlers.
>
> For Server Components prerendered at build time, using Route Handlers **will fail the build step**.
> This is because, while building there is no server listening for these requests.
>
> For Server Components rendered on demand, fetching from Route Handlers is **slower due to the
> extra HTTP round trip** between the handler and the render process.

Vercel lists the same thing as a named mistake — *"Using Route Handlers with Server Components…
You don't need the additional network hop."* `nextjs.org/blog/building-apis-with-nextjs` prescribes
the resolution: route handler and Server Component both call **one shared server-only reader**.

Violating D1 breaks `npm run build` — one of our own gates.

**Precedent in this repo:** `src/lib/server/session.ts:60-70` already implements D1 exactly —
`server-only` import, direct `BACKEND_URL`, `x-bff-secret` header, explicit `cache: "no-store"`,
fails closed on every error path. **This file is the template. Do not invent a second pattern.**

The BFF route stays. Browser code still needs it — `next.config.ts` sets `connect-src 'self'`
precisely because browser code only ever calls the same-origin BFF.

### D2 — Every reader states cache intent explicitly

**Decision:** No reader relies on a default. Public content uses `next: { revalidate: N }`.
Session- or user-scoped reads use `cache: "no-store"`.

**Proof.** `next.config.ts` does **not** set `cacheComponents`, so the previous caching model
applies. Per `02-guides/caching-without-cache-components.md:11`:

> By default, `fetch` requests are **not cached**.

The subtlety that matters: the documented default is **`auto no cache`**, which is *not* `no-store`.
From `03-api-reference/04-functions/fetch.md`:

> **`auto no cache`** (default): …**will fetch once during `next build`** because the route will be
> statically prerendered.
>
> **`no-store`**: fetches on every request, **even if Request-time APIs are not detected**.

A reader left on the default gets its data **frozen into the build artifact** and serves stale
content indefinitely. This is the single most likely way a converted page ships subtly wrong.

**Precedent:** both correct patterns already exist here — `src/lib/server/session.ts:69`
(`cache: "no-store"`, user-scoped) and `src/lib/rss/parser.ts:149` (`next: { revalidate }`,
public content).

**Prohibited:** `unstable_cache` — *"replaced by `use cache` in Next.js 16"*
(`04-functions/unstable_cache.md:8`). Also `use cache` / `cacheLife` / `cacheTag`, inert without
`cacheComponents: true`.

**Available:** `React.cache()` for per-request deduplication. Caveat: *"Memoization does not apply
in Route Handlers, since they are not part of the React component tree"* — a shared reader dedupes
across Server Components but not inside the BFF route.

### D3 — Rate-limit identity is separated by caller class, and the trusted class gets its own quota

**Decision:** Server-side reads of public content are a **distinct caller class**. They are `skip`ped
out of the per-IP browser limiter and placed under a **separate, generous service-quota limiter**
keyed on a constant service identifier. Browser traffic through the BFF keeps per-end-user IP
limiting exactly as today.

**They are not exempted from limiting altogether.** This is the correction that matters: an earlier
draft of this plan recommended plain exemption. Research does not support that.

**Proof — vendors that have formalized this model re-key rather than exempt:**

- **AWS API Gateway** documents four throttling tiers with an explicit order of application.
  Per-client limits "are applied to clients that use API keys associated with your usage plan as
  client identifier" — an authenticated client identifier **replaces IP as the key**, and still sits
  underneath an account-wide ceiling. Nothing is exempt.
- **Kong** exposes this as first-class config: `rate-limiting-advanced`'s `limit_by` accepts `ip`,
  `consumer`, `credential`, `service`. Kong publishes a how-to specifically on running different
  limits for Services and Consumers simultaneously — the direct analogue of "service quota +
  per-end-user quota."
- **OWASP Microservices Security Cheat Sheet** warns that edge-only enforcement creates a single
  point of failure "violat[ing] defense-in-depth principles," and that most implementations use
  **both** layers. Moving the trusted caller's limit entirely to the edge is the single-layer
  arrangement OWASP warns against.
- **OWASP API4:2023** requires "a limit on how often a client can interact with the API within a
  defined timeframe," and adds that limits "should be fine tuned based on the business needs." One
  global 100/15min IP bucket spanning two structurally different caller classes is the
  misconfiguration API4 points at — independent of the BFF issue.

**Proof the mechanism is supported.** express-rate-limit 8.6.2 documents both hooks in its own
typings and docs:

- `skip: ValueDeterminingMiddleware<boolean>` — *"Method (in the form of middleware) to determine
  whether or not this request counts towards a client's quota. By default, skips no requests."*
  (`node_modules/express-rate-limit/dist/index.d.ts:459-465`). The docs describe it as the hook for
  "allowlisting specific IPs or users."
- `keyGenerator: ValueDeterminingMiddleware<string>` (`index.d.ts:436`)
- `limit` may be a function returning different limits per caller class.

And the library endorses keying on identity rather than IP where identity exists
(`index.d.ts:8-9`):

> If you write a custom keyGenerator that allows a fallback to IP address for unauthenticated users,
> return `ipKeyGenerator(req.ip)` rather than just `req.ip`.

`clientKeyGenerator` already does this correctly (`bff.js:120`).

**Rejected alternative — propagating a synthetic end-user identity.** The OWASP Microservices
cheat sheet warns that header-based identity propagation means "the recipient microservice has to
trust the calling microservice. If the calling microservice wants to violate access control rules,
it can do so by setting any user/client ID or user roles it wants in the HTTP header," and suits
"only highly trusted environments." Its recommended stronger forms are a **signed structure**
(the *phantom token* pattern; Netflix "Passport" is the reference implementation) or **mTLS**.

Identity propagation is the right pattern for *authenticated per-user* endpoints. It is the wrong
pattern here: these are **public, read-only reads with no end-user identity available**, so
forwarding identity would mean synthesizing one — strictly worse than an honest service quota.

**Non-negotiable constraints:**

1. `trust proxy` stays **off**. `ERR_ERL_PERMISSIVE_TRUST_PROXY` exists because "Express returns the
   leftmost entry in the X-Forwarded-For header, which malicious clients could manipulate to bypass
   rate limiting."
2. The `skip` predicate must be evaluated **after** `requireBffSecret`, conditioned on the *verified*
   secret — never on a client-settable header alone. A `skip` trusting an unverified header hands any
   caller a rate-limit bypass.
3. Restrict the skip to `GET` on public-read paths. Never to mutations.
4. **Fail closed.** Absent or wrong secret ⇒ the client-address header is not trustworthy ⇒ fall
   back to the socket address, never to the unverified header. `bff.js` already does this.
5. Any IP used as a key must pass through `ipKeyGenerator`. Per `ERR_ERL_KEY_GEN_IPV6`, keying on a
   raw IPv6 string "expose[s] IPv6 users to rate-limit bypass by rotating through available
   addresses."
6. **Supplying a custom `keyGenerator` suppresses the library's trust-proxy validation**, so the
   safety net is gone and correctness is entirely on us — hence the required test below.
7. Volumetric protection belongs at the edge/CDN as Layer 1; the Express limiters remain Layer 2.

**On the shared-secret header itself.** Our `x-bff-secret` + `x-bff-client-address` pair establishes
provenance **cryptographically**, where the documented mechanisms (MDN, OWASP) establish it
positionally (hop count) or by network identity (proxy IP allowlist). MDN's rule is that
"any security-related use of `X-Forwarded-For`… *must only* use IP addresses added by a trusted
proxy," and warns that if the origin is reachable from the internet, "**no part** of the
`X-Forwarded-For` IP list can be considered trustworthy." A secret check is arguably stronger on
that axis, since it fails closed regardless of network position. But note honestly: **no OWASP, RFC,
or vendor document names or endorses this mechanism** — it is sound *application* of a documented
principle, not a citable pattern. It is also a bearer credential: keep it out of logs, require
HTTPS, rotate it, compare in constant time (`bff.js:32-34` already does), and have the BFF
**overwrite** rather than pass through any inbound copy of either header. If a citable-by-name
mechanism is ever required, mTLS or a signed identity structure is the one with explicit backing.

**Required tests:**

- a server-reader-shaped request does not consume the browser bucket;
- an unauthenticated caller cannot reach the exempt path;
- the service-quota limiter actually engages (a constant key is not an unlimited key).

### D4 — Contracts are derived from three sources, not two

**Decision:** `src/contracts/` is reconciled from **`prisma/schema.prisma`**,
`backend/src/validators/index.js`, and `src/data/*`.

**Rationale.** Schema is the third input and the authoritative one — §4.3 shows the drift is between
Prisma and the frontend types, so a reconciliation ignoring the schema would encode the drift rather
than remove it. Prisma field names win on conflict; renames happen in the mapping layer, once.

### D5 — Read-only Prisma in Server Components is valid, but standardized away

Direct Prisma reads in Server Components are legitimate App Router practice, and three exist today
(`src/app/countries/[slug]/page.tsx:27,48`; `src/app/immigration-tracker/page.tsx:37`).

**Decision:** route them through Express anyway. One read path is worth a network hop; *"sometimes
Prisma, sometimes fetch"* is the state that rots. Recorded so nobody re-litigates it later as a bug.

---

## 6. Implementation phases

Each phase is independently shippable, ends green on all gates (§8), and is one or a few small
commits. **No phase begins until the previous one is green.**

### Phase 0 — Decide D3 (no code)

Write `docs/architecture/rate-limit-identity.md`: confirm the two-limiter shape, set the service
quota value, name the tests. Blocks Phase 4.

**Exit:** decision recorded and approved.

### Phase 1 — Contracts

Create `src/contracts/`: `common.ts`, `auth.ts`, `articles.ts`, `countries.ts`, `universities.ts`,
`scholarships.ts`, `deadlines.ts`, `consultants.ts`.

Reconcile per D4. Resolve **every row** of the §4.3 drift table explicitly — including where
`daysLeft` is computed. Re-export from `src/data/mock.ts` so nothing breaks yet.

Resolves all **12 type-only importers** (§4.4) for free.

**Commit:** `refactor(contracts): extract shared domain types`
**Exit:** full gates green. Zero runtime behavior change.

### Phase 2 — Express app/server split + route inventory test

Split `server.js` into `app.js` (app construction) and `server.js` (bootstrap only: env, config
validation, `connectDB`, listen). `startServer()` is already isolated at `server.js:1608`.

**Add the route-inventory test first.** It snapshots the 22 method+path pairs and asserts the built
app exposes exactly the same set. This test guards every later phase — the single highest-value
artifact in this plan.

**Commits:** `test(backend): pin the route inventory` → `refactor(backend): split app construction from bootstrap`
**Exit:** gates green; route inventory identical.

### Phase 3 — Auth module extraction (pilot)

Extract `backend/src/modules/auth/` — routes, controller, service, repository — moving Prisma calls
out of handlers.

Auth is the pilot because `tests/auth/` has 4 suites covering session lifecycle, token entropy,
RBAC, and password change. It is the domain where a regression is most likely to be *caught*.

**Commit:** `refactor(backend): extract auth module`
**Exit:** gates green; `npm run test:auth` green; route inventory identical.

### Phase 4 — Implement D3

Implement the Phase 0 decision plus its three tests. Correctness matters here, not elegance — it
must land before traffic multiplies.

**Commit:** `fix(security): separate service and end-user rate-limit identity`
**Exit:** gates green + new rate-limit tests green.

### Phase 5 — Countries vertical slice (the template)

The full pattern, end to end, once:

```
Prisma Country → countries.repository.js → countries.service.js → countries.controller.js
  → GET /api/countries/public, GET /api/countries/public/:slug
  → src/lib/server/countries.ts   (D1 shape, copied from session.ts; D2 cache intent)
  → src/app/countries/page.tsx, src/app/countries/[slug]/page.tsx
```

Per §4.2 this **adds** endpoints; the existing dropdown `/api/countries` keeps its narrow projection
(or calls the same service with a narrow select). Per D5, `[slug]/page.tsx` loses its direct Prisma
calls.

**Stop here for review.** This slice is replicated six times; a flaw costs 6×.

**Commit:** `feat(countries): database-backed countries via public API`
**Exit:** gates green; page output matches pre-conversion content (§8).

### Phase 6 — Remaining database-backed domains

One domain per commit, same pattern: Articles (public read) → Universities → Scholarships →
Immigration deadlines → Consultants.

Each requires a **new public read endpoint** — none exists today except `/api/countries`. Do not
loosen the admin routes' guards to serve public traffic.

The six **admin** pages reading mock data (§4.4) convert here too, against the same services.

**Exit per domain:** gates green; route inventory updated deliberately; content verified.

### Phase 7 — Guides and Visa decision

Neither has a Prisma model. The schema has 12 models; `Guide` and `VisaUpdate` are not among them.

Choose per domain and record it:

- **Option A — database-backed:** model + migration + admin CRUD + public GET + convert pages.
- **Option B — deliberately file-based:** move to `src/content/guides/` or `src/content/visa/`,
  document as editorial source content, and name it `content`, not `data`, so the Phase 8 test
  does not flag it.

Do not leave these half-converted or ambiguously named.

### Phase 8 — Lock the boundary

Add the architecture test: **no file outside `prisma/` may import `src/data/*`.**

This is what makes the change permanent. Until it exists, mock data can drift back into the render
path in any future PR.

**Commit:** `test(architecture): forbid runtime imports of seed data`

### Phase 9 — Frontend feature organization

Only now split the large files, against a stable contract and read path:

`AdminArticleLiveEditor.tsx` (1320) → `ServerSections.tsx` (832) → `admin/users/page.tsx` (789)
→ `RSSPreviewPanel.tsx` (662) → `admin/news/page.tsx` (612).

Create `src/features/<domain>/` **only when a file actually moves into it.** Empty scaffolding rots —
`backend/src/controllers/.gitkeep` is the proof in this very repo.

Pages should read route params, call a reader, compose components, and handle
loading/error/not-found. Route files stay in `src/app/` — App Router requires it.

### Phase 10 — Assets and documentation

Per §4.5: delete the 3 redundant footer logos and 6 unreferenced assets; keep `footer-logo-v3.png`
and `logo/logo.png`; optimize `ab-logo.png` (942 KB).

Move docs into `docs/architecture/`, `docs/deployment/`, `docs/security/`.

**`DEPLOYMENT-GUIDE.md` requires care.** `tests/api/docs-hygiene.test.js` hardcodes root paths:

```js
const DOCS = ["DEPLOYMENT-GUIDE.md", "README.md"].filter(existsSync);
...
const guide = readDoc("DEPLOYMENT-GUIDE.md");   // unguarded — throws ENOENT if moved
```

Two tests call `readDoc("DEPLOYMENT-GUIDE.md")` **unguarded**. Worse, the credential and IP scans
are `existsSync`-filtered, so if the file moved they would **silently pass over zero files** — a
security regression that reports green.

**Rule: update the test's paths in the same commit as the move. Never move first.** Also extend the
JWT source-scan roots from `["backend/src", "src/lib", "src/app", "prisma"]` to include
`src/features/` and `src/contracts/`.

Decide `tests/e2e/` (currently empty): populate or delete.

---

## 7. Target structure

Directories are created **when first used**, not up front.

```
src/
├── app/                      # Next.js routes only (App Router requires this location)
├── contracts/                # Shared domain types — reconciled from schema + validators + data
├── features/<domain>/        # Created per domain in Phase 9, only when populated
├── components/               # KEEP existing names: admin auth cards common editorial home site
├── lib/
│   ├── api/                  # Browser transport (adminFetch → /api/backend/*)
│   ├── server/               # server-only readers — the D1 pattern
│   ├── rss/
│   └── utils/
├── data/                     # Seed fixtures ONLY after Phase 8; importable by prisma/ alone
└── content/                  # Deliberately file-based editorial content (Phase 7 Option B)

backend/src/
├── server.js                 # bootstrap only
├── app.js                    # Express app construction
├── config/  middleware/  validators/
└── modules/<domain>/         # routes → controller → service → repository
                              # auth, countries, articles, universities,
                              # scholarships, deadlines, consultants

prisma/   tests/   docs/{architecture,deployment,security}/   scripts/   public/
```

`backend/src/routes|controllers|services|utils/` already exist. Either populate them or fold them
into `modules/` — do not leave both conventions half-used.

---

## 8. Gates

Run after **every** phase. Mirrors `.github/workflows/ci.yml` step for step.

```bash
npx prisma generate          # must precede typecheck, or client types are missing
npx prisma validate
npm run typecheck
npm run lint
npm run lint:baseline        # eslint exits 0 on warnings; this catches creep past 38
npm test                     # 153 tests, ~87s, needs a live PostgreSQL
npm run build                # also proves D1 — a self-BFF fetch fails here
npm audit --omit=dev
```

`lint:baseline` is not optional. Plain `lint` exits 0 on warnings, and dead imports — the most
common refactor artifact — surface only as warnings.

### Architecture checks

| Check | Introduced |
|---|---|
| Route inventory unchanged (22 method+path pairs) | Phase 2 |
| Server-reader traffic does not consume the browser bucket | Phase 4 |
| Unauthenticated callers cannot reach the skip path | Phase 4 |
| Service-quota limiter engages | Phase 4 |
| No file outside `prisma/` imports `src/data/*` | Phase 8 |
| No credentials or provider IPs in docs; scan covers all source roots | Phase 10 |

### Per-domain content verification

After each conversion: run `npm run db:seed` against a clean database, then confirm the converted
page renders the same content as before. This catches a wrong field mapping in a repository — which,
given §4.3, is the most likely defect in this entire effort.

Seed must succeed **twice** in a row (idempotency); `tests/api/seed-idempotency.test.js` exists.

### CI trigger gap

`.github/workflows/ci.yml` triggers on `["main", "deep-project-audit"]`. The working branch is
**`architecture-changes`**, so **push events will not run CI.** `pull_request:` is unfiltered, so PRs
do run. Either add the branch or work strictly through PRs — never assume a silent push was green.

---

## 9. Deliberately deferred

| Item | Why deferred |
|---|---|
| `cacheComponents: true` | Per `02-guides/migrating-to-cache-components.md`: once enabled, route segments exporting `dynamic`, `revalidate`, or `fetchCache` **error**; uncached data outside `<Suspense>` errors; Node runtime required. The v16 upgrade guide states it *"is not a rename-only change."* |
| `use cache` / `cacheLife` / `cacheTag` | Stable in 16 but **inert without `cacheComponents`**. Do not add. |
| `unstable_cache` | Soft-deprecated: *"replaced by `use cache` in Next.js 16."* Do not add. |
| Edge/CDN volumetric rate limiting (D3 Layer 1) | Deployment-level task; Phase 4 covers the application layer. Track separately. |
| mTLS or signed identity structure between Next.js and Express | Stronger than a shared secret, but a larger change. Revisit if the trust boundary widens. |
| Monorepo split | No second API consumer exists. |
| CSP promotion from report-only | Independent security task; `next.config.ts` documents the staging rationale. |

Verified not applicable: `revalidateTag` (whose signature changed in v16 to require a `cacheLife`
argument) has **zero occurrences** in `src/` or `backend/`. `dynamicIO` and `experimental.ppr`, both
removed in v16, are unused.

---

## 10. Rejected proposals

| Proposal | Why rejected |
|---|---|
| Rename `components/` to `ui/` + `layout/` | Neither exists. Import counts: `common` 27, `site` 27, `editorial` 20, `cards` 12, `admin` 11, `home` 2, `auth` 2 — ~99 references rewritten for zero behavioral gain, colliding with Phase 9's splits and touching the same imports twice. The existing split is already coherent: `site` *is* the layout layer. |
| Move `src/data/mock.ts` to `tests/fixtures/` | Imported by 30 runtime files including live public pages, and `prisma/seed.ts` depends on it. Moving it breaks production and the seed. |
| Delete `mock.ts` early | It is the seed input and the current source of the shared types. Removable only after Phase 7. |
| "Pages must not call Prisma" as an absolute rule | Read-only Prisma in a Server Component is idiomatic App Router. The real rule is narrower (D5): no authorization decisions, no mutations. |
| Create all feature folders up front | `backend/src/controllers/.gitkeep` is this repo's own evidence that empty scaffolding rots. |
| Raise the rate limit to fix §4.1 | Hides the defect instead of fixing the identity model. |
| **Fully exempt trusted server reads from all rate limiting** | An earlier draft of this plan proposed it. Rejected: OWASP's edge-vs-service guidance calls single-layer enforcement a defense-in-depth violation, and AWS/Kong both model trusted callers by re-keying under their own quota, never by exemption. Superseded by D3. |
| Synthesize an end-user identity for server reads | OWASP Microservices cheat sheet: a header-propagated identity lets the caller "set any user/client ID… it wants," suiting "only highly trusted environments." These reads are public and have no end-user identity to forward. |

---

## 11. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrong field mapping in a repository (§4.3) | **High** | Silent wrong content | Phase 1 reconciles against the schema; per-domain content verification (§8) |
| Rate-limit starvation (§4.1) | **High** if unaddressed | Site-wide 429s | Phase 0 decision + Phase 4 before any conversion + 3 tests |
| `skip` predicate trusts an unverified header | Medium | **Rate-limit bypass for any caller** | Evaluate after `requireBffSecret`; GET-only; explicit test |
| Data frozen into build via default caching (D2) | Medium | Permanently stale pages | Explicit cache intent on every reader; enforce in review |
| Route lost during extraction | Medium | Endpoint 404s | Route-inventory test, added in Phase 2 before any extraction |
| Docs move breaks/blinds hygiene test (Phase 10) | Medium | Security scan silently passes on 0 files | Same-commit rule; extend scan roots |
| Perf regression: in-process array → HTTP fetch | Medium | Slower pages | `revalidate` on public readers; measure before/after on the Phase 5 slice |
| Custom `keyGenerator` suppresses trust-proxy validation | Medium | Latent misconfiguration goes unwarned | Tests in Phase 4 replace the lost safety net |
| Silent CI on pushes (§8) | Medium | False confidence | Add branch to triggers or use PRs only |
| Scope creep into `cacheComponents` | Low | Large unplanned migration | §9 defers it explicitly |

---

## 12. Order of execution

```
Phase 0   Decide D3 (rate-limit identity)          ← no code, blocks Phase 4
Phase 1   Contracts                                ← resolves 12 type-only importers
Phase 2   app/server split + route inventory test  ← guards everything after
Phase 3   Auth module (pilot, best-tested domain)
Phase 4   Implement D3                             ← MUST precede any page conversion
Phase 5   Countries slice                          ← REVIEW GATE: the template
Phase 6   Articles, Universities, Scholarships, Deadlines, Consultants
Phase 7   Guides / Visa decision
Phase 8   Architecture test locks src/data/
Phase 9   Frontend feature splits
Phase 10  Assets + documentation
```

**Recommended first step:** Phase 0. It is the only remaining blocker that can force rework of
Phase 5, and it costs no code.

---

## Appendix A — Evidence index

Every claim above traces to one of these.

**Repository (at `c92c856`):**

- `backend/src/server.js` — 1621 lines; routes at 121, 197, 287, 311, 333, 397, 417, 441, 501, 530,
  561, 657, 781, 823, 845, 906, 999, 1077, 1110, 1359, 1439, 1602; global limiter at 82;
  bootstrap at 1608
- `backend/src/middleware/bff.js` — constant-time compare 32-34; secret check 51-58; trusted-address
  promotion 65-69; `trust proxy` rationale 76-79; `ipKeyGenerator` use 120
- `backend/src/middleware/rateLimiter.js` — shared-bucket warning 6-8; `keyGenerator` 12
- `src/app/api/backend/[...path]/route.ts` — transport-only contract in header comment;
  `x-bff-client-address` at 141
- `src/lib/server/session.ts` — the D1 reference implementation, 60-70
- `src/lib/server/backendConfig.ts` — `server-only`; `getBackendUrl`, `getBffSharedSecret`
- `src/lib/rss/parser.ts:149` — `next: { revalidate }` precedent
- `prisma/schema.prisma` — 12 models; no `Guide`, no `VisaUpdate`
- `prisma/seed.ts:5-8` — already imports `src/data/*`
- `tests/api/docs-hygiene.test.js` — hardcoded doc paths; JWT scan roots
- `.github/workflows/ci.yml` — gate order; branch triggers
- `.lint-baseline.json` — 38 warnings

**Next.js 16.3.0 vendored docs (`node_modules/next/dist/docs/`):**

- `01-app/02-guides/backend-for-frontend.md:877-885` — Server Components caveat (D1)
- `01-app/02-guides/caching-without-cache-components.md:11` — fetch not cached by default (D2)
- `01-app/03-api-reference/04-functions/fetch.md` — `auto no cache` vs `no-store` (D2)
- `01-app/03-api-reference/04-functions/unstable_cache.md:8` — replaced by `use cache`
- `01-app/02-guides/migrating-to-cache-components.md` — why §9 defers the flag
- `01-app/01-getting-started/08-caching.md` — `use cache` requires `cacheComponents`

**express-rate-limit 8.6.2 typings (`node_modules/express-rate-limit/dist/index.d.ts`):**

- `:459-465` — `skip` option contract
- `:436` — `keyGenerator`
- `:8-9` — identity-over-IP guidance; `ipKeyGenerator` fallback
- `:20` — `ipKeyGenerator` signature

**External — Next.js / Vercel:**

- [Building APIs with Next.js](https://nextjs.org/blog/building-apis-with-nextjs) — shared Data Access Layer for route handler + Server Component
- [Common mistakes with the Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) — "Using Route Handlers with Server Components"
- [Caching (previous model)](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components)

**External — rate limiting and identity (D3):**

- [OWASP API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [OWASP Microservices Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Microservices_Security_Cheat_Sheet.html) — edge vs service layers; identity-propagation warning
- [OWASP IP Spoofing via HTTP Headers](https://owasp.org/www-community/pages/attacks/ip_spoofing_via_http_headers)
- [express-rate-limit — Configuration](https://express-rate-limit.mintlify.app/reference/configuration)
- [express-rate-limit — Error Codes](https://express-rate-limit.mintlify.app/reference/error-codes) — `ERR_ERL_PERMISSIVE_TRUST_PROXY`, `ERR_ERL_KEY_GEN_IPV6`
- [AWS API Gateway — Request Throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html) — four throttling tiers
- [Kong — Rate Limiting Advanced](https://developer.konghq.com/plugins/rate-limiting-advanced/) — `limit_by`
- [Kong — Different limits for Services and Consumers](https://developer.konghq.com/how-to/throttle-apis-with-services-and-consumers/)
- [MDN — X-Forwarded-For](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For) — trusted-proxy requirement
- [Netflix — Edge Authentication and Token-Agnostic Identity Propagation](https://netflixtechblog.com/edge-authentication-and-token-agnostic-identity-propagation-514e47e0b602) — Passport / phantom token

### Contested or unverified — flagged, not relied upon

1. The widely repeated claim that for `trust proxy` "both `true` and `false` are wrong; only a hop
   count is correct" is **not present** in the current express-rate-limit troubleshooting guide. That
   page does contain the numeric example `app.set('trust proxy', 1)` and an empirical calibration
   method. This plan relies on the `ERR_ERL_PERMISSIVE_TRUST_PROXY` text and the numeric example,
   not the stronger phrasing.
2. The secret-verified custom-header mechanism is **not named or endorsed** in any OWASP, RFC, or
   vendor document located. It is sound application of MDN/OWASP's trusted-provenance principle, but
   it is not a citable pattern. mTLS or a signed identity structure are the alternatives with
   explicit backing.
3. The "edge as Layer 1, application as Layer 2" framing is well supported by OWASP's edge-vs-service
   section but is partly vendor synthesis; no single normative source states it as a rule.

---

## Appendix B — Approval checklist

- [ ] §3 invariants accepted as non-negotiable
- [ ] D1 accepted (server readers, not self-BFF) — build-breaking if violated
- [ ] D2 accepted (explicit cache intent on every reader)
- [ ] D3 accepted (skip the per-IP limiter **and** add a service-quota limiter — not plain exemption)
- [ ] D3 service-quota value chosen ← Phase 0 output, blocks Phase 4
- [ ] D4 accepted (contracts reconciled from schema first)
- [ ] D5 accepted (Prisma reads in Server Components standardized away, by choice)
- [ ] §10 rejections accepted, especially no `components/` rename
- [ ] Phase 7: Guides → Option A or B; Visa → Option A or B
- [ ] CI branch trigger gap resolved
- [ ] Phase 0 authorized to begin
