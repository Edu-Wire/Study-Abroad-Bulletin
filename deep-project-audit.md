# Deep Project Audit

\## Executive Summary

The project is a Next.js 16 frontend with a separate Express 5 backend,
Prisma 7, PostgreSQL, JWT authentication, RSS ingestion, and AWS
deployment documentation.

The frontend builds successfully and TypeScript passes. However, the
backend currently has a critical authorization failure: admin endpoints
do not authenticate requests or enforce roles. Any client that can reach
the backend can read, modify, publish, or delete users and articles.

Overall production-readiness: 3.5/10 until the API security boundary is
fixed.

Validation:

-   npx tsc --noEmit: passed
-   npm run build: passed
-   ESLint: no diagnostics emitted, but the process did not terminate
    normally; result treated as inconclusive
-   Next.js warning: middleware convention is deprecated; migrate to
    proxy

---------

\## Architecture Overview

Browser ├─ Next.js pages/components ├─ localStorage JWT ├─
client-controlled auth cookies └─ direct API calls or /api/backend proxy
│ ▼ Express backend on port 8000 ├─ JWT login/signup ├─ Admin user CRUD
├─ Admin article CRUD ├─ RSS preview/import └─ Prisma PostgreSQL access
│ ▼ PostgreSQL via Prisma 7

The Next.js server also accesses PostgreSQL directly through:

-   src/lib/prisma.ts
-   src/lib/articles.ts
-   country and immigration pages

This creates two backend access paths:

1.  Next.js server → PostgreSQL
2.  Browser → Express → PostgreSQL

The authentication system only protects the user interface
superficially. The Express API is not protected.

---------

\# Critical and High-Priority Findings

\## 1. Admin API endpoints have no authentication or authorization

Severity: CRITICAL Files: backend/src/server.js Locations: Lines
211--380, 409--650, 860--1090 Category: Authentication / Authorization /
Privilege Escalation

\### Problem

All admin routes are registered directly:

app.get("/api/admin/users", ...) app.post("/api/admin/users/invite",
...) app.patch("/api/admin/users/:id", ...)
app.delete("/api/admin/users/:id", ...)

app.post("/api/admin/articles", ...) app.put("/api/admin/articles/:id",
...) app.patch("/api/admin/articles/:id/status", ...)
app.delete("/api/admin/articles/:id", ...)

There is no middleware such as:

requireAuth requireRole("ADMIN")

The frontend does not send Authorization headers for most admin requests
either.

\### Why it matters

Anyone who can access the backend can:

-   List all users
-   Create admin users
-   Promote users to SUPER_ADMIN
-   Reset passwords
-   Suspend/delete users
-   Create or edit articles
-   Publish articles
-   Delete articles
-   Import RSS content

This is a complete privilege-escalation path.

\### Recommended fix

Create centralized middleware that:

1.  Reads a bearer token
2.  Verifies the JWT
3.  Loads the current user from PostgreSQL
4.  Rejects suspended users
5.  Enforces role permissions per route

Every admin endpoint must use it.

---------

\## 2. JWT uses a known fallback secret

Severity: CRITICAL File: backend/src/server.js:11 Category:
Cryptographic Security

const JWT_SECRET = process.env.JWT_SECRET \|\|
"studyabroadnews_secret_key_2026";

\### Problem

If JWT_SECRET is missing in production, the application silently uses a
publicly known secret committed to the repository and documentation.

An attacker can forge a valid JWT containing:

{ "userId": "...", "role": "SUPER_ADMIN" }

\### Recommended fix

Fail fast:

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET \|\| JWT_SECRET.length \< 32) { throw new
Error("JWT_SECRET must be configured with a strong value"); }

Rotate the secret immediately if this project has ever been deployed
with the fallback value.

---------

\## 3. Client-controlled cookies are treated as admin authorization

Severity: CRITICAL Files:

-   src/middleware.ts:4--26
-   src/app/auth/login/page.tsx:37--38
-   src/components/admin/AdminSidebar.tsx:165--170

\### Problem

The middleware trusts these browser cookies:

const token = request.cookies.get("auth_token")?.value; const role =
request.cookies.get("auth_role")?.value;

The role cookie is written by client-side JavaScript:

document.cookie = `auth_role=${res.user.role || "STUDENT"}; ...`;

Any user can modify auth_role using browser developer tools.

The middleware does not verify the JWT or query the database.

\### Why it matters

The UI access check is forgeable. A user can set:

auth_role=SUPER_ADMIN

and pass the Next.js route guard.

\### Recommended fix

Use a server-set, HttpOnly, Secure, SameSite=Lax session cookie. Verify
it server-side in middleware or route handlers. Never use a separate
client-controlled role cookie.

---------

\## 4. JWTs are stored in localStorage

Severity: HIGH Files:

-   src/app/auth/login/page.tsx:32
-   src/app/auth/signup/page.tsx:34
-   src/components/admin/AdminSidebar.tsx:165

\### Problem

localStorage.setItem("authToken", res.token);

Any XSS vulnerability, compromised third-party script, browser
extension, or injected script can read the token.

\### Recommended fix

Prefer an HttpOnly session cookie. Remove JWT persistence from
localStorage.

---------

\## 5. Suspended users can still authenticate

Severity: HIGH File: backend/src/server.js:104--151 Category:
Authentication / Account Lifecycle

\### Problem

Login retrieves the user and validates the password, but never checks:

user.status === "ACTIVE"

A suspended user receives a valid JWT.

/api/me also returns the user without rejecting suspended accounts.

\### Recommended fix

Reject non-active accounts during login and every authenticated request:

if (user.status !== "ACTIVE") { return res.status(403).json({ success:
false, message: "Account is not active", }); }

Do not rely only on the role embedded in the JWT. Load current user
state from the database.

---------

\## 6. Default credentials are committed and seeded deterministically

Severity: HIGH Files:

-   prisma/seed.ts:406--408
-   DEPLOYMENT-GUIDE.md:128--130
-   backend/src/server.js:268

\### Problem

The seed creates predictable accounts:

admin@abroadbulletin.com / Admin@123456 editor@abroadbulletin.com /
Editor@123456 student@abroadbulletin.com / Student@123456

The invite endpoint also uses:

const initialPassword = password \|\| "Staff@123456";

\### Why it matters

Running the seed in production creates or resets known privileged
credentials.

\### Recommended fix

-   Remove production staff seeding
-   Require passwords through environment variables only for local
    development
-   Force password change after invitation
-   Never use a shared default password
-   Add password policy validation

---------

\## 7. CORS is open to every origin

Severity: HIGH File: backend/src/server.js:14

app.use(cors({ origin: "\*" }));

\### Problem

Any website can call the API from browser JavaScript.

This is especially dangerous because the API exposes authentication and
administrative operations and currently lacks authorization.

\### Recommended fix

Allow only known frontend origins:

const allowedOrigins = \[ "https://main.d271ktfwm3qyiw.amplifyapp.com",
\];

app.use(cors({ origin: allowedOrigins, credentials: true, }));

---------

\## 8. No rate limiting or brute-force protection

Severity: HIGH Files:

-   backend/src/server.js:24--90
-   backend/src/server.js:96--159

\### Problem

Signup and login have:

-   No request rate limiting
-   No IP throttling
-   No account lockout
-   No failed-login monitoring
-   No CAPTCHA or abuse control

\### Recommended fix

Add rate limiting specifically for:

-   /api/login
-   /api/signup
-   password reset endpoints
-   admin password changes

Use a shared store such as Redis in multi-instance deployments.

---------

\# Bugs and Reliability Issues

\## 9. Admin frontend requests do not include authentication headers

Severity: HIGH Files:

-   src/app/admin/news/page.tsx
-   src/app/admin/users/page.tsx
-   src/components/admin/ArticleFormModal.tsx
-   src/components/admin/RSSPreviewPanel.tsx
-   src/components/editorial/AdminArticleLiveEditor.tsx

Examples:

fetch(`${API_BASE_URL}/admin/users`)

fetch(`${API_BASE_URL}/admin/articles/${id}`, { method: "DELETE", })

\### Problem

The API has no authorization currently, so requests work accidentally.
Once authorization is correctly added, these requests will fail unless a
centralized authenticated fetch helper is introduced.

\### Recommended fix

Create one authenticated request wrapper that:

-   Reads the session
-   Sends credentials or bearer token
-   Handles 401/403 globally
-   Clears invalid sessions
-   Returns typed errors

---------

\## 10. Public content uses an admin endpoint

Severity: HIGH File: src/lib/articles.ts:126--171

fetch(`${apiBaseUrl}/admin/articles?status=PUBLISHED&limit=100`)

\### Problem

Public pages depend on an admin route. This couples public content
delivery to administrative API behavior and exposes an endpoint that
accepts arbitrary status filters.

\### Recommended fix

Create a public endpoint:

GET /api/articles GET /api/articles/:slug

Keep admin endpoints inaccessible to public clients.

---------

\## 11. Public article retrieval is capped at 100 records

Severity: MEDIUM File: src/lib/articles.ts:126--171

Both list and slug lookup use:

limit=100

\### Problem

Once more than 100 published articles exist:

-   Older articles disappear from the public API path
-   getArticleBySlug() can return null for valid articles
-   Search and related-content behavior becomes incomplete

\### Recommended fix

Add a dedicated single-article endpoint and proper pagination:

GET /api/articles/:slug GET /api/articles?page=1&pageSize=20

---------

\## 12. Public API ordering is not based on publication date

Severity: MEDIUM File: backend/src/server.js:428--439

The admin article query orders by:

orderBy: { createdAt: "desc" }

Public article retrieval uses this admin endpoint.

\### Problem

An older article edited recently may appear ahead of a newly published
article.

\### Recommended fix

Order public articles by:

orderBy: { publishedAt: "desc" }

---------

\## 13. parseInt() can produce invalid pagination values

Severity: MEDIUM File: backend/src/server.js:420--422

const pageNum = Math.max(1, parseInt(page)); const limitNum =
Math.min(100, Math.max(1, parseInt(limit)));

For values such as ?page=abc, parseInt() returns NaN.

The resulting Prisma query can fail or produce a 500 response.

\### Recommended fix

Use validated numeric parsing:

const parsedPage = Number.parseInt(String(page), 10); const parsedLimit
= Number.parseInt(String(limit), 10);

const pageNum = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) :
1; const limitNum = Number.isFinite(parsedLimit) ? Math.min(100,
Math.max(1, parsedLimit)) : 20;

---------

\## 14. RSS imports are vulnerable to race-condition duplicates

Severity: MEDIUM Files:

-   backend/src/server.js:1023--1054
-   prisma/schema.prisma:135

\### Problem

The code checks for an existing sourceUrl, then creates an article:

const duplicate = await prisma.article.findFirst(...) ... await
tx.article.create(...)

Two concurrent requests can both pass the duplicate check.

sourceUrl has no unique constraint.

\### Recommended fix

Add:

sourceUrl String? @unique

Then handle Prisma unique constraint errors.

---------

\## 15. Seed creates duplicate university intakes on every run

Severity: MEDIUM File: prisma/seed.ts:210

await prisma.universityIntake.create({ data: { universityId:
university.id, term: u.intake, status: "Open", }, });

\### Problem

Unlike the other seed operations, this is not an upsert. Running the
seed repeatedly creates duplicate intake records.

\### Recommended fix

Add a unique constraint:

@@unique(\[universityId, term\])

Then use upsert.

---------

\## 16. Database migration logic is duplicated inside the seed

Severity: MEDIUM File: prisma/seed.ts:390--400

The seed executes schema-changing SQL:

\$executeRawUnsafe(...)

\### Problem

Schema changes belong in migrations. Mixing schema repair logic into
seed execution creates drift between:

-   schema.prisma
-   migration history
-   deployed databases
-   seed behavior

The catch block also logs "Schema columns verified." even when the SQL
may have failed.

\### Recommended fix

-   Move all schema changes into Prisma migrations
-   Remove schema mutation from seed
-   Fail seed execution when required schema is unavailable

---------

\## 17. Backend startup does not wait for database connectivity

Severity: MEDIUM File: backend/src/server.js:18

connectDB(); ... app.listen(...)

\### Problem

The server starts listening even if PostgreSQL is unavailable. Requests
then fail at runtime.

\### Recommended fix

Start the server only after the database connection succeeds:

await connectDB(); app.listen(...);

Use a top-level startup function with clean failure handling.

---------

\## 18. RSS fetches have no explicit timeout

Severity: MEDIUM Files:

-   backend/src/server.js:688--700
-   src/lib/rss/parser.ts:145--153

\### Problem

External feed requests can hang for an extended period. The homepage and
admin RSS preview can consume workers while waiting.

\### Recommended fix

Use AbortController with a bounded timeout, for example 8--10 seconds.

---------

\# Security Findings

\## Confirmed

-   Admin API authorization is absent
-   Client-controlled role cookie is trusted by middleware
-   JWT fallback secret is known
-   JWT stored in localStorage
-   Suspended users can log in
-   CORS is unrestricted
-   Default credentials are committed and deterministic
-   No rate limiting exists

\## Potential risks requiring verification

\### External URL handling

The following values are rendered as links:

-   consultant websites
-   immigration application URLs
-   RSS source URLs

Relevant files include:

-   src/app/consultants/\[slug\]/page.tsx
-   src/app/immigration-tracker/\[slug\]/page.tsx
-   src/data/rssSources.ts

The current data appears curated, so this is not confirmed as an
exploit. If administrators can edit these values through an API,
validate them against https: URLs and reject javascript: or unsupported
schemes.

\### Article HTML

dangerouslySetInnerHTML appears to contain static CSS in:

-   src/components/editorial/AdminArticleLiveEditor.tsx:1324

That specific use is not an XSS finding. If article content is later
rendered as HTML, it must be sanitized before storage or rendering.

---------

\# Performance and Scalability

\## 1. Repeated full article fetches

src/lib/articles.ts fetches up to 100 articles for both:

-   list pages
-   single slug lookup

Use indexed, purpose-specific queries instead.

\## 2. Country pages filter articles in application memory

src/app/countries/\[slug\]/page.tsx calls getPublishedArticles() and
then filters by country name:

(await getPublishedArticles()).filter(...)

This loads all published articles before filtering.

Use a database query on primaryCountryId or ArticleCountry.

\## 3. Missing important indexes

The schema lacks indexes for common access patterns:

-   Article.status
-   Article.publishedAt
-   Article.primaryCountryId
-   Article.rssSourceId
-   Article.sourceUrl
-   ImmigrationDeadline.countryId
-   ImmigrationDeadline.deadlineDate
-   University.countryId

Recommended examples:

@@index(\[status, publishedAt\]) @@index(\[primaryCountryId,
publishedAt\]) @@index(\[rssSourceId\])

\## 4. Direct external backend IP fallback

File: src/app/api/backend/\[...path\]/route.ts:6

const backendUrl = process.env.NEXT_PUBLIC_API_URL \|\|
"http://13.233.198.182:8000";

This creates:

-   environment leakage
-   insecure HTTP fallback
-   dependency on a mutable server IP
-   possible production misconfiguration

Fail fast in production when the API URL is missing.

---------

\# Code Quality and Maintainability

\## Backend structure

backend/src/server.js is approximately 1,100 lines and contains:

-   authentication
-   user administration
-   article CRUD
-   RSS parsing
-   RSS import
-   database startup
-   health checks

This makes authorization, testing, and ownership difficult.

Recommended split:

backend/src/ app.js server.js middleware/ authenticate.js authorize.js
error-handler.js routes/ auth.routes.js admin-users.routes.js
admin-articles.routes.js rss.routes.js services/ auth.service.js
article.service.js rss.service.js validators/ repositories/

\## Dead MongoDB code

The project declares and imports Mongoose:

-   package.json
-   backend/src/models/User.js

But the application uses PostgreSQL and Prisma everywhere.

backend/src/config/db.js is also named generically while connecting
through Prisma.

Remove:

-   mongoose
-   backend/src/models/User.js
-   unused MongoDB-oriented naming

\## Type safety

TypeScript is strict, but several any usages remain, particularly in:

-   src/app/news/\[slug\]/page.tsx
-   src/lib/rss/parser.ts
-   src/app/countries/\[slug\]/page.tsx
-   client error handling

These are especially important around external RSS data and API
responses.

Use runtime schemas such as Zod for:

-   request bodies
-   API responses
-   RSS normalization boundaries

\## Duplicate data sources

The application still contains substantial mock data:

-   src/data/mock.ts
-   src/data/consultants.ts
-   src/data/immigrationDeadlines.ts

Some pages use Prisma while others continue using static data. This can
create inconsistent production behavior.

---------

\# Testing Gaps

No test files were found in the reviewed project tree.

Highest-value tests to add:

\## Authentication

-   invalid credentials
-   suspended user login
-   expired JWT
-   forged JWT
-   missing JWT
-   role changes after token issuance
-   password reset validation

\## Authorization

-   student cannot access admin routes
-   editor cannot manage users
-   admin cannot access super-admin settings
-   unauthenticated requests receive 401
-   unauthorized roles receive 403

\## Articles

-   invalid category
-   invalid status
-   duplicate slug
-   duplicate RSS source URL
-   concurrent RSS imports
-   article publication ordering
-   draft visibility

\## RSS

-   malformed XML
-   HTML instead of XML
-   timeout
-   empty feed
-   duplicate entries
-   invalid links
-   feed source failure isolation

\## End-to-end

-   login → admin navigation
-   admin article creation
-   article publication → public visibility
-   logout → protected route denial

---------

\# File-by-File Findings Summary

\## Configuration

-   package.json: unused Mongoose dependency; no test script; no
    typecheck script
-   next.config.ts: minimal configuration; no security headers
-   tsconfig.json: strict mode enabled; allowJs broadens mixed-language
    surface
-   eslint.config.mjs: valid setup, but lint command did not terminate
    during audit
-   amplify.yml: frontend-only deployment while backend deployment is
    manual
-   prisma.config.ts: depends on DATABASE_URL without explicit startup
    validation
-   next-env.d.ts: generated file; no issue found
-   postcss.config.mjs: no issue found

\## Backend

-   backend/src/server.js: critical authorization failure, weak secret
    fallback, no rate limiting, oversized responsibility
-   backend/src/config/prisma.js: Prisma setup works but lacks explicit
    missing-env validation
-   backend/src/config/db.js: startup connection result is ignored
-   backend/src/models/User.js: unused MongoDB model and dependency

\## Database

-   prisma/schema.prisma: missing operational indexes and unique RSS
    source URL
-   prisma/seed.ts: deterministic credentials, duplicate intake
    creation, schema mutation during seed
-   migrations: generally incremental, but schema changes are duplicated
    in seed

\## Authentication

-   src/lib/api/auth.ts: uses any error handling and returns raw thrown
    objects
-   src/app/auth/login/page.tsx: localStorage token and
    client-controlled cookies
-   src/app/auth/signup/page.tsx: localStorage token; no strong password
    policy
-   src/app/auth/reset/page.tsx: reset form is only UI; no reset API
    flow exists
-   src/middleware.ts: trusts client-controlled role cookie and does not
    verify JWT

\## Public data layer

-   src/lib/articles.ts: admin endpoint used for public data, 100-record
    cap, repeated full retrieval
-   src/lib/rss/parser.ts: external data typed as any, no explicit
    timeout
-   src/lib/rss/ircc.ts, src/lib/rss/uk.ts: reasonable feed isolation
    but depend on unvalidated external structures
-   src/lib/prisma.ts: reasonable singleton pattern

\## Admin UI

-   src/app/admin/\*: pages call admin APIs without auth headers
-   src/components/admin/\*: repeated fetch/error handling, no
    centralized authorization-aware client
-   src/components/editorial/AdminArticleLiveEditor.tsx: large component
    with mixed editing, preview, upload, and publishing responsibilities

\## Public pages

-   Most pages are structurally sound
-   Several pages mix Prisma data and mock data
-   country article filtering is inefficient
-   public routes depend on the current admin API behavior

---------

\# Prioritized Action Plan

\## P0 --- Fix immediately

1.  Add authentication and role middleware to every admin backend route.
2.  Remove the JWT fallback secret.
3.  Stop trusting auth_role from the browser.
4.  Move authentication to secure HttpOnly cookies.
5.  Remove or rotate all known/default credentials.
6.  Reject suspended users.
7.  Restrict CORS to the production frontend.
8.  Add rate limiting to authentication and admin mutation routes.

\## P1 --- Fix next

1.  Create public article endpoints separate from admin endpoints.
2.  Add request validation for all backend payloads.
3.  Add unique constraint on Article.sourceUrl.
4.  Fix seed idempotency for university intakes.
5.  Make backend startup fail when PostgreSQL is unavailable.
6.  Add RSS request timeouts.
7.  Validate pagination values.
8.  Add authorization-aware frontend API client.

\## P2 --- Improve soon

1.  Add database indexes.
2.  Split backend/src/server.js.
3.  Remove Mongoose and dead code.
4.  Replace any around API/RSS boundaries.
5.  Consolidate mock and database data sources.
6.  Add unit, integration, and end-to-end tests.
7.  Add structured logging and request IDs.
8.  Add security headers and production environment validation.

\## P3 --- Optional improvements

1.  Migrate Next.js middleware to proxy.
2.  Add separate npm scripts for typecheck, test, and test:e2e.
3.  Improve deployment documentation consistency.
4.  Replace direct IP fallbacks with required environment variables.
5.  Improve naming in database connection modules.

---------

\# Final Scorecard

Area Score Reason ━━━━━━━━━━━━━━━━━━━━━━ ━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Architecture 4/10 Functional split, but duplicated frontend/backend data
access and oversized backend ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Code Quality 5/10 Reasonable organization in frontend; backend is
monolithic and mixed ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Security 1/10 Admin API is unauthenticated; known JWT secret and
client-controlled authorization ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Performance 5/10 Acceptable at small scale, but repeated full queries
and missing indexes ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Reliability 4/10 Build works, but startup, RSS timeout, seed, and
concurrency issues remain ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Maintainability 5/10 TypeScript helps, but duplicated responsibilities
and mock/DB overlap ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Scalability 4/10 Current API/data model will degrade as articles and
users grow ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Testing 1/10 No meaningful automated test suite found
────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Developer Experience 5/10 Documentation exists, but deployment is split
and some docs are stale/inconsistent ────────────────────── ───────
─────────────────────────────────────────────────────────────────────────────────────
Production Readiness 2/10 Build-ready, but not safe to expose publicly
until authorization is implemented

The first remediation should be the backend authorization layer. Until
that is fixed, frontend route protection is only cosmetic.
