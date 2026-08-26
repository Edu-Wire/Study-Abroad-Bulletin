/**
 * Invited-staff password change flow.
 *
 * Regression cover for a dead end: mustChangePassword was enforced in Express
 * while no UI existed to clear it, so an invited administrator logged in,
 * reached /admin, and every privileged call returned PASSWORD_CHANGE_REQUIRED
 * with no way forward.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

// The route is a server shell (page.tsx) wrapping the client form in Suspense,
// because useSearchParams cannot run during prerendering.
const PAGE = "src/app/auth/change-password/ChangePasswordForm.tsx";
const ROUTE = "src/app/auth/change-password/page.tsx";

// ---------------------------------------------------------------------------
// The page exists and can actually submit
// ---------------------------------------------------------------------------

test("a password-change page exists", () => {
  assert.ok(
    existsSync(path.join(repoRoot, ROUTE)),
    "invited staff need a route to clear mustChangePassword"
  );
  assert.ok(
    existsSync(path.join(repoRoot, PAGE)),
    "the client form should live beside the route shell"
  );
});

test("the route wraps the form in a Suspense boundary", () => {
  // useSearchParams in a prerendered route needs this, or the build fails.
  const shell = read(ROUTE);
  assert.match(shell, /Suspense/);
  assert.match(shell, /ChangePasswordForm/);
});

test("the page calls the password-change endpoint", () => {
  const source = read(PAGE);
  assert.match(source, /changePassword\(/);
  assert.match(source, /currentPassword/);
  assert.match(source, /newPassword/);
});

test("the page offers a logout escape hatch", () => {
  // A user who cannot complete the change must still be able to leave.
  assert.match(read(PAGE), /LogoutButton/);
});

test("the page mirrors the server password policy", () => {
  const page = read(PAGE);
  const validators = read("backend/src/validators/index.js");

  // The server requires 12 chars plus four character classes; the client-side
  // hints must not promise something the server will reject.
  assert.match(validators, /min\(12,/);
  assert.match(page, /length >= 12/);

  for (const cls of [/\[a-z\]/, /\[A-Z\]/, /\[0-9\]/]) {
    assert.ok(cls.test(page), `the page should hint the ${cls} requirement`);
  }
  assert.ok(
    /\[\^A-Za-z0-9\]/.test(page),
    "the page should hint the symbol requirement"
  );
});

// ---------------------------------------------------------------------------
// Redirects into the flow
// ---------------------------------------------------------------------------

test("login redirects a flagged user to the password change page", () => {
  const source = read("src/app/auth/login/page.tsx");
  assert.match(source, /mustChangePassword/);
  assert.match(source, /\/auth\/change-password/);
});

test("the admin layout redirects a flagged user server-side", () => {
  const source = read("src/app/admin/layout.tsx");

  assert.match(source, /user\.mustChangePassword/);
  assert.match(source, /\/auth\/change-password/);

  // The check must come after the role check but before rendering the shell,
  // otherwise the admin UI renders and every request inside it fails.
  const flagAt = source.indexOf("mustChangePassword");
  const shellAt = source.indexOf("<AdminShell>");
  assert.ok(flagAt > -1 && shellAt > -1 && flagAt < shellAt,
    "the redirect must precede rendering AdminShell");
});

test("the dashboard redirects a flagged user server-side", () => {
  const source = read("src/app/dashboard/page.tsx");
  assert.match(source, /mustChangePassword/);
  assert.match(source, /\/auth\/change-password/);
});

// ---------------------------------------------------------------------------
// Express access while the flag stands
// ---------------------------------------------------------------------------

test("the password-change endpoint is reachable while flagged", () => {
  const server = read("backend/src/server.js");
  const section = server.slice(server.indexOf('"/api/password/change"'));
  const chain = section.slice(0, section.indexOf("async (req, res)"));

  // Bare `authenticate`, not requireSettledAuth: gating this on a settled
  // password would make the flag impossible to clear.
  assert.match(chain, /\bauthenticate\b/);
  assert.ok(
    !/requirePasswordChanged|requireSettledAuth/.test(chain),
    "gating this endpoint on the flag would deadlock the account"
  );
});

test("session endpoints the flow needs stay reachable while flagged", () => {
  const server = read("backend/src/server.js");

  // /api/me drives the UI, /api/logout-all backs the escape hatch. Both use
  // requireAuth, which does not check the flag.
  for (const route of ['"/api/me"', '"/api/logout-all"']) {
    const at = server.indexOf(route);
    assert.ok(at > -1, `expected route ${route}`);
    const chain = server.slice(at, at + 200);
    assert.match(chain, /requireAuth/, `${route} must not require a settled password`);
  }
});

test("ordinary data routes are gated on a settled password", () => {
  const server = read("backend/src/server.js");

  for (const route of ["/api/student/profile", "/api/student/feed"]) {
    const at = server.indexOf(`"${route}"`);
    assert.ok(at > -1, `expected route ${route}`);
    const chain = server.slice(at, at + 200);
    assert.match(
      chain,
      /requireSettledAuth/,
      `${route} must not be usable with a temporary password`
    );
  }
});

test("privileged role chains enforce the flag", () => {
  const auth = read("backend/src/middleware/auth.js");

  for (const chain of ["requireEditor", "requireAdmin", "requireSuperAdmin"]) {
    const at = auth.indexOf(`export const ${chain} =`);
    assert.ok(at > -1, `expected ${chain}`);
    const body = auth.slice(at, auth.indexOf("]", at));
    assert.match(
      body,
      /requirePasswordChanged/,
      `${chain} must enforce the password change`
    );
  }
});

test("requireSettledAuth enforces the flag and requireAuth does not", () => {
  const auth = read("backend/src/middleware/auth.js");

  const settledAt = auth.indexOf("export const requireSettledAuth =");
  const settled = auth.slice(settledAt, auth.indexOf("]", settledAt));
  assert.match(settled, /requirePasswordChanged/);

  const plainAt = auth.indexOf("export const requireAuth =");
  const plain = auth.slice(plainAt, auth.indexOf("]", plainAt));
  assert.ok(
    !/requirePasswordChanged/.test(plain),
    "requireAuth must stay usable by the password-change flow"
  );
});

// ---------------------------------------------------------------------------
// The flag reaches the client
// ---------------------------------------------------------------------------

test("the session user type carries mustChangePassword", () => {
  assert.match(read("src/lib/server/session.ts"), /mustChangePassword/);
  assert.match(read("src/lib/api/auth.ts"), /mustChangePassword/);
});

test("Express selects mustChangePassword when loading the user", () => {
  // If authenticate did not select it, every consumer would read undefined and
  // the gate would silently pass.
  assert.match(
    read("backend/src/services/session.service.js"),
    /mustChangePassword: true/,
    "the session lookup must select the flag"
  );
});

test("changing the password clears the flag", () => {
  const server = read("backend/src/server.js");
  const section = server.slice(server.indexOf('"/api/password/change"'));
  assert.match(
    section,
    /mustChangePassword: false/,
    "a successful change must clear the flag"
  );
});
