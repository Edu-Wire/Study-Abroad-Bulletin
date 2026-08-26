# Deployment Guide

## Architecture

```text
Browser
  -> Next.js (same-origin route handlers at /api/backend/*)
  -> Express API (reachable only from the Next.js server)
  -> PostgreSQL
```

The browser never talks to the Express API directly. It calls relative
`/api/backend/*` paths on the Next.js origin, and the Next.js server forwards
those requests onward. Two consequences shape everything below:

- The backend URL is **server-only**. There is no `NEXT_PUBLIC_*` variable for
  it, and nothing in the browser bundle names the API host.
- Express remains the sole authority for session validity, account status, and
  roles. The Next.js proxy performs only an optimistic cookie-presence redirect
  and makes no authorization decision.

Components: a Next.js frontend, a Node/Express API behind an HTTPS reverse
proxy, managed PostgreSQL, and a process manager on the API host.

## Environment variables

Never commit any of these. Set them through your host's secret configuration.

### Next.js server

```text
BACKEND_URL=https://api.internal-or-public-host
BFF_SHARED_SECRET=<32+ char random secret, identical to the Express value>
TRUSTED_PROXY_HOP_COUNT=1
```

`TRUSTED_PROXY_HOP_COUNT` is how many trusted reverse proxies or CDNs sit in
front of Next.js. It decides which entry of `X-Forwarded-For` is believed as the
real client address, which in turn is what the API's rate limiters bucket on.

- `0` — Next.js is reached directly (local development). `X-Forwarded-For` is
  ignored entirely.
- `1` — one managed proxy or CDN appends the client address. This is the default
  in production and the common case.
- `2+` — a chain, for example a CDN in front of a platform load balancer.

Counting is done from the **right** of the header, because a client can prepend
anything it likes to the left.

**The two error directions are not symmetric. Set this from the verified
topology, never a guess:**

- **Too high is unsafe.** It reaches left past the entries your proxies appended,
  into the client-controlled part of the header, letting a caller forge an
  address and evade or poison IP-based rate limits. The app rejects the clearest
  case — a chain shorter than the configured count — and logs a warning, but a
  too-high value combined with a padded chain cannot be distinguished from a
  genuine one.
- **Too low is merely inaccurate.** It reads an address your own infrastructure
  appended, grouping legitimate users together. Never forgeable.

When in doubt, prefer the lower value. If the variable is unset or malformed the
app trusts no header at all and logs a warning, which is safe but groups every
proxied user into one rate-limit bucket.

To verify the real value, log the raw header from your proxy for a known client
and count how many entries your infrastructure appends:

```text
X-Forwarded-For: <client>, <proxy-1>, <proxy-2>
                            ^^^^^^^^^^^^^^^^^^^  TRUSTED_PROXY_HOP_COUNT = 2
```

### Express server

```text
NODE_ENV=production
PORT=8000
DATABASE_URL=<postgres connection string>
SESSION_HASH_SECRET=<32+ char random secret>
BFF_SHARED_SECRET=<same value as the Next.js server>
FRONTEND_URL=https://your-frontend-host
```

Generate each secret independently:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

The Express server refuses to start if `SESSION_HASH_SECRET` or
`BFF_SHARED_SECRET` is missing or shorter than 32 characters. This is
intentional — it cannot run in an insecure state.

`NEXT_PUBLIC_API_URL` and `JWT_SECRET` are no longer used. Remove them from
every environment once the deployment below is complete.

## Sessions

Authentication uses opaque, database-backed sessions:

- A 32-byte random token goes to the browser in a host-only `HttpOnly` cookie
  (`__Host-abroad_session` in production).
- Only an HMAC-SHA-256 hash of that token is stored in PostgreSQL, so reading
  the session table does not yield usable cookies.
- Absolute expiry is 7 days; idle expiry is 24 hours.
- Logout, password change, password reset, and suspension all revoke sessions
  server-side.

Because sessions live in the database, rotating `SESSION_HASH_SECRET`
invalidates every existing session and signs all users out. Plan that as a
deliberate action.

## Frontend deployment

The frontend builds and deploys from your Git host's CI/CD integration on push
to the release branch.

```bash
git add .
git commit -m "Your change message"
git push
```

Confirm `BACKEND_URL` and `BFF_SHARED_SECRET` are set in the frontend host's
server-side environment. If either is missing, the BFF returns HTTP 500 and no
API call succeeds.

## Backend deployment

```bash
cd /path/to/Study-Abroad-News
git pull
npm ci --omit=dev --no-audit --no-fund
npx prisma generate
pm2 restart study-backend --update-env
pm2 save
```

If only backend source changed and dependencies did not, `npm ci` can be
skipped.

Check logs:

```bash
pm2 logs study-backend
```

## Database migrations

Always back up before migrating.

```bash
cd /path/to/Study-Abroad-News
git pull

# Inspect duplicates before any migration that adds a unique constraint.
# This script is strictly read-only.
npm run db:preflight:duplicates

npx prisma migrate deploy
npx prisma generate
pm2 restart study-backend --update-env
```

### Unique-constraint migrations

`20260825110000_corrective_unique_constraints` adds unique indexes on
`Article.sourceUrl` and `UniversityIntake(universityId, term)`. These were
declared in `schema.prisma` but had never been emitted into a migration, so
existing databases drifted from the schema.

The migration **aborts with a descriptive error if duplicates exist**. It never
deletes rows. Resolve duplicates deliberately — decide which row to keep — and
re-run. Run `npm run db:preflight:duplicates` first to see exactly what is
affected.

Do not run destructive Prisma commands against production.

## Seed data

```bash
cd /path/to/Study-Abroad-News
npx prisma db seed
```

The seed is idempotent: every write is an upsert, so running it twice creates no
duplicates.

In production the seed creates a super admin **only** when you supply both
values explicitly:

```bash
INITIAL_ADMIN_EMAIL=<admin email> \
INITIAL_ADMIN_PASSWORD=<strong password> \
npx prisma db seed
```

There is no default production password, and no credentials are recorded in this
repository. Passwords must satisfy the application policy: at least 12
characters with lowercase, uppercase, digit, and symbol.

Demo accounts are created only outside production and only when
`SEED_DEMO_USERS=true`.

### Staff accounts

Invite staff through the admin UI rather than the seed. An invited user receives
a generated temporary password and is flagged `mustChangePassword`.

On first sign-in they are redirected to `/auth/change-password`, and until they
set their own password the API allows only the password-change, session, and
logout endpoints. Administrative resets set the same flag, so a password an
administrator knows always has to be replaced by its owner.

## Reverse proxy

Terminate HTTPS at the proxy and forward to the Node backend on port `8000`.

```nginx
server {
    listen 80;
    server_name api.your-host;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.your-host;

    ssl_certificate     /etc/letsencrypt/live/api.your-host/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-host/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`X-Forwarded-For` matters: it is how the client address reaches Next.js, which
then reports it to the API for rate limiting. Confirm the proxy **appends** to
this header rather than overwriting it, and set `TRUSTED_PROXY_HOP_COUNT` to
match the number of proxies in front of Next.js.

Note that Express itself does **not** enable `trust proxy`. It receives the
client address in a dedicated header from the BFF, believed only because the
same request carried a valid `X-BFF-Secret`. Enabling `trust proxy` would make
Express accept any `X-Forwarded-For` it is given, including a forged one.

After editing:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Firewall

Expose only what is needed:

```text
22    SSH
80    HTTP (redirect only)
443   HTTPS
```

Port `8000` must **not** be open to the internet. The API is reached through the
reverse proxy, and only the Next.js server needs to call it. Direct API requests
that lack the `X-BFF-Secret` header are rejected anyway — but closing the port
is the stronger control.

## Post-deployment verification

The API rejects requests without the shared secret, so a bare `curl` against it
is expected to fail with 403. Verify through the frontend instead:

```bash
# Health check — the one endpoint exempt from the BFF secret.
curl https://api.your-host/api/health

# Public data through the BFF.
curl https://your-frontend-host/api/backend/countries

# Direct API access must be refused.
curl -i https://api.your-host/api/countries    # expect 403
```

Then confirm in a browser:

- `/auth/login` — logging in reaches `/admin` with no redirect loop.
- A student account cannot render `/admin`; it redirects to `/dashboard`.
- Logout returns to the login page, and `/admin` no longer renders afterwards.
- An invited staff member is sent to `/auth/change-password` on first sign-in and
  reaches `/admin` only after saving a new password.
- Rate limiting buckets per client, not globally: exhausting login attempts from
  one address must not lock out a second address.
- DevTools: the session cookie is `HttpOnly`, and no token, role, or backend URL
  appears in `localStorage`, `sessionStorage`, or any readable cookie.

```bash
pm2 status
```

## Process manager

```bash
pm2 status                                  # app status
pm2 restart study-backend --update-env      # restart
pm2 logs study-backend                      # logs
pm2 save                                    # persist config
pm2 startup                                 # enable on reboot
```

## Checklists

Frontend only:

```text
Push to the release branch -> CI/CD builds and deploys
```

Backend only:

```text
SSH -> git pull -> npm ci (if deps changed) -> prisma generate -> pm2 restart
```

Database changed:

```text
Back up -> git pull -> db:preflight:duplicates -> prisma migrate deploy
        -> prisma generate -> pm2 restart
```

Rotating a secret:

```text
Update both Next.js and Express -> redeploy both -> verify login
(rotating SESSION_HASH_SECRET signs out every user)
```
