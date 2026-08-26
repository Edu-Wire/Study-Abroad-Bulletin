# Permanent Security and Reliability Remediation Plan

## Status

Proposed. No application changes are included in this plan.

## Objective

Replace browser-facing JWT authentication with hosting-independent, database-backed opaque sessions. Route every browser API request through the Next.js application, preserve Express as the authorization authority, and close the remaining audit findings without tying the project to a specific host or public backend URL.

## Target Architecture

```text
Browser
  -> Next.js same-origin route handlers: /api/backend/*
  -> Express API: BACKEND_URL
  -> PostgreSQL
```

Rules:

- Browser code uses only relative `/api/backend/*` URLs.
- `BACKEND_URL` is server-only and is never exposed through a `NEXT_PUBLIC_*` variable.
- Express is the only source of truth for session validity, user status, and roles.
- The browser receives only an HttpOnly opaque session cookie, never a JWT or session token in JSON.
- Next.js `proxy.ts` performs only an optimistic cookie-presence redirect. It does not query the database or make authorization decisions.
- The server-rendered admin layout performs the authoritative role check through Express.

## Security Decisions

### Opaque sessions

Use a 32-byte cryptographically random token. Store an HMAC-SHA-256 hash of the token in PostgreSQL; only the raw token is held in the browser cookie.

Cookie name and attributes:

```text
__Host-abroad_session
HttpOnly
Secure in production
SameSite=Lax
Path=/
No Domain attribute
```

`SameSite=Lax` keeps normal navigation compatible while the BFF route enforces CSRF checks on state-changing requests. The cookie must be host-only so it works without cross-domain sharing.

### Session lifetime

- Absolute expiry: 7 days.
- Idle expiry: 24 hours, refreshed only after an authenticated request.
- Revoke the current session on logout.
- Revoke every session for a user after password reset or password change.
- Existing sessions remain safe after role or status changes because Express reloads the user record on every request.

### Backend boundary

Add `BFF_SHARED_SECRET` to Next.js and Express. The Next.js BFF sends it as `X-BFF-Secret`; Express rejects browser-originated API traffic that lacks it, except `/api/health`.

## Environment Variables

```text
# Next.js server only
BACKEND_URL=https://api.internal-or-public-host
BFF_SHARED_SECRET=<strong-random-secret>

# Express server only
DATABASE_URL=<postgres-connection-string>
SESSION_HASH_SECRET=<strong-random-secret>
BFF_SHARED_SECRET=<same-value-as-next>
NODE_ENV=production
```

Remove `NEXT_PUBLIC_API_URL` and JWT-related production configuration after the migration is complete.

## Implementation Phases

### Phase 1: Database session model and migration

Files:

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_user_sessions/migration.sql`
- `prisma/seed.ts`
- `package.json`

Work:

1. Add `UserSession` with `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `lastUsedAt`, and `createdAt`.
2. Add `User.sessions` relation.
3. Add unique index on `tokenHash` and indexes on `[userId, expiresAt]` and `expiresAt`.
4. Create a separate corrective migration for:
   - `Article.sourceUrl` unique constraint.
   - `UniversityIntake(universityId, term)` unique constraint.
5. Before applying unique constraints, run a production preflight query to identify duplicates and resolve them deliberately.
6. Add `db:generate`, `db:validate`, and `db:migrate:deploy` scripts.
7. Ensure CI runs `prisma generate` before TypeScript validation.

Acceptance:

- `npx prisma validate` passes.
- `npx prisma generate` succeeds.
- `npx tsc --noEmit` succeeds.
- Seed can run twice without creating duplicate university intakes.

### Phase 2: Express session service and authorization middleware

Files:

- `backend/src/config/session.js` (new)
- `backend/src/services/session.service.js` (new)
- `backend/src/middleware/auth.js`
- `backend/src/middleware/bff.js` (new)
- `backend/src/server.js`
- `backend/src/validators/index.js`

Work:

1. Replace JWT generation and verification with session token creation, hashing, lookup, expiry, refresh, and revocation.
2. Replace `auth_token` cookie parsing with `__Host-abroad_session` parsing.
3. Keep current database-backed active-user and role checks in the authorization middleware.
4. Make login and signup return user metadata only to the BFF; never return a session token to browser JSON.
5. Add logout and logout-all session revocation endpoints.
6. Require `X-BFF-Secret` for all browser-facing Express endpoints except health checks.
7. Add `/api/me` as the authoritative session and role endpoint for the Next.js server.
8. Use a strong password policy and add a `mustChangePassword` field or equivalent invitation state before allowing invited staff access.

Acceptance:

- Missing, revoked, expired, or malformed sessions return 401.
- Suspended users return 403.
- Role changes apply on the next request.
- Login does not return a token in JSON.
- Logout invalidates the session immediately.

### Phase 3: Same-origin Next.js BFF and frontend session flow

Files:

- `src/app/api/backend/[...path]/route.ts` (new)
- `src/lib/api/auth.ts`
- `src/lib/api/apiClient.ts`
- `src/lib/api/student.ts`
- `src/proxy.ts`
- `src/app/admin/layout.tsx` (new or updated)
- `src/app/auth/login/page.tsx`
- `src/app/auth/signup/page.tsx`
- `src/components/auth/LogoutButton.tsx`
- `src/components/site/Header.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/editorial/AdminArticleLiveEditor.tsx`

Work:

1. Implement the catch-all Route Handler that forwards method, path, body, query string, and selected response headers to `BACKEND_URL`.
2. Forward the host-only session cookie from Next.js to Express server-side.
3. On login/signup, set the `__Host-abroad_session` cookie from the Next.js response; never expose the token to client JavaScript.
4. Remove every `NEXT_PUBLIC_API_URL`, direct backend URL, direct IP fallback, `Authorization` header built from browser storage, and browser cookie token read.
5. Change all API clients to relative `/api/backend/*` requests with `credentials: "include"`.
6. Update login/signup success checks to use `res.success`, not `res.token`.
7. Remove `authUser` as an authority source. It may remain only as non-security UI cache if required, but header/sidebar state should come from `/api/backend/me`.
8. Make `proxy.ts` redirect only when the session cookie is absent.
9. Make the admin server layout call Express with the incoming session and require `EDITOR`, `ADMIN`, or `SUPER_ADMIN` before rendering admin routes.

Acceptance:

- The frontend works without any public backend URL environment variable.
- Browser requests never target the Express host directly.
- A successful login reaches `/admin` without a redirect loop.
- A student cannot render an admin page.
- API authorization remains enforced if a user bypasses the UI.

### Phase 4: CSRF, rate limiting, validation, and headers

Files:

- `src/app/api/backend/[...path]/route.ts`
- `backend/src/middleware/rateLimiter.js`
- `backend/src/middleware/validate.js`
- `backend/src/server.js`
- `next.config.ts`

Work:

1. Require a CSRF token/header pair for `POST`, `PUT`, `PATCH`, and `DELETE` requests, excluding login/signup only where origin checks are sufficient.
2. Validate request origin in the BFF before forwarding state-changing requests.
3. Apply `adminMutationLimiter` to article create, update, publish-status, delete, RSS import, user invite/update/delete, and password changes.
4. Keep login/signup rate limiting. Move the limiter store to Redis only when deploying multiple backend replicas.
5. Stop assigning to `req.query` in `backend/src/middleware/validate.js`; put parsed values in `res.locals.validated` and update affected route handlers.
6. Add HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection, and a staged Content Security Policy in `next.config.ts`.

Acceptance:

- `GET /api/admin/articles?page=1` does not throw an Express 5 error.
- Invalid query/body/params return a structured 400 response.
- All listed admin mutations return 429 after their configured limit.
- Cross-origin state-changing requests are rejected.

### Phase 5: Tests, verification, and rollout

Files:

- `tests/auth/*.test.ts` (new)
- `tests/api/*.test.ts` (new)
- `tests/e2e/*.spec.ts` (new)
- `package.json`
- `DEPLOYMENT-GUIDE.md`

Work:

1. Add unit/integration tests for sessions, role authorization, validation, rate limits, RSS duplicate handling, and seed idempotency.
2. Add one browser E2E flow: login, create article, publish article, verify public visibility, logout, verify admin denial.
3. Add CI order:
   - `npm ci`
   - `npx prisma generate`
   - `npx prisma validate`
   - `npm run typecheck`
   - `npm run lint`
   - test suite
   - `npm run build`
4. Update the deployment guide to remove default credentials, public IP instructions, and `NEXT_PUBLIC_API_URL` instructions.
5. Rotate the old JWT secret after deployment and remove all JWT code/configuration.

Acceptance:

- All automated checks pass from a clean checkout.
- `npm audit --omit=dev` findings are reviewed and Prisma is upgraded only to a compatible patched release; do not force a major downgrade.
- No token, session ID, or backend URL is available to browser JavaScript.

## Rollout and Rollback

1. Apply the additive database migrations first.
2. Deploy Express session support while JWT support remains temporarily available only to existing sessions.
3. Deploy the Next.js BFF and switch browser callers to it.
4. Verify login, admin access, publication, logout, and session revocation in staging.
5. Disable JWT issuance and remove legacy JWT acceptance after all active deployments use the BFF.
6. If rollback is needed before legacy removal, deploy the previous application version; do not drop `UserSession` or the new indexes.

## Definition of Done

- All admin endpoints are server-authorized.
- Session tokens are opaque, HttpOnly, secure, host-only cookies.
- No browser code uses a public backend URL, JWT, or role cookie.
- The Express 5 query-validation crash is fixed.
- Prisma schema, generated client, and applied migrations agree.
- Security tests, build, lint, Prisma validation, and TypeScript checks pass.
- Deployment documentation contains no known credentials or provider-specific backend IP fallback.
