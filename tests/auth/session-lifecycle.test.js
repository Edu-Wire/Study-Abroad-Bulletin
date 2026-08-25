/**
 * Phase 2 — session lifecycle against a real database.
 *
 * Requires DATABASE_URL and an applied migration set. Skips as a whole when no
 * database is configured, so a clean checkout without a database still passes
 * while CI (which provisions Postgres) exercises these paths for real.
 */
import test from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_HASH_SECRET =
  process.env.SESSION_HASH_SECRET ?? "test-session-hash-secret-".padEnd(48, "x");
process.env.BFF_SHARED_SECRET =
  process.env.BFF_SHARED_SECRET ?? "test-bff-shared-secret-".padEnd(48, "y");

const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!hasDatabase) {
  test("session lifecycle integration", { skip: "DATABASE_URL is not set" }, () => {});
}

if (hasDatabase) {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const sessionService = await import(
    "../../backend/src/services/session.service.js"
  );
  const { SESSION_IDLE_TTL_MS } = await import(
    "../../backend/src/config/session.js"
  );

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const TEST_EMAIL = `session-test-${process.pid}@example.invalid`;
  let userId;

  test.before(async () => {
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        password: "not-a-real-hash",
        firstName: "Session",
        lastName: "Test",
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    userId = user.id;
  });

  test.after(async () => {
    // Sessions cascade with the user.
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  test("a fresh session resolves to its user", async () => {
    const { rawToken } = await sessionService.createSession(userId);
    const resolved = await sessionService.findActiveSession(rawToken);

    assert.ok(resolved, "expected the session to resolve");
    assert.equal(resolved.user.id, userId);
  });

  test("only the hash is persisted, never the raw token", async () => {
    const { rawToken, session } = await sessionService.createSession(userId);
    const row = await prisma.userSession.findUnique({ where: { id: session.id } });

    assert.ok(row);
    assert.notEqual(row.tokenHash, rawToken);
    assert.equal(row.tokenHash, sessionService.hashSessionToken(rawToken));
  });

  test("an unknown token does not resolve", async () => {
    assert.equal(await sessionService.findActiveSession("not-a-real-token"), null);
    assert.equal(await sessionService.findActiveSession(""), null);
    assert.equal(await sessionService.findActiveSession(null), null);
  });

  test("a revoked session stops resolving immediately", async () => {
    const { rawToken } = await sessionService.createSession(userId);
    assert.ok(await sessionService.findActiveSession(rawToken));

    await sessionService.revokeSessionByToken(rawToken);
    assert.equal(await sessionService.findActiveSession(rawToken), null);
  });

  test("an expired session does not resolve", async () => {
    const { rawToken, session } = await sessionService.createSession(userId);
    await prisma.userSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    assert.equal(await sessionService.findActiveSession(rawToken), null);
  });

  test("an idle session is expired and revoked", async () => {
    const { rawToken, session } = await sessionService.createSession(userId);
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date(Date.now() - SESSION_IDLE_TTL_MS - 60_000) },
    });

    assert.equal(await sessionService.findActiveSession(rawToken), null);

    const row = await prisma.userSession.findUnique({ where: { id: session.id } });
    assert.ok(row.revokedAt, "an idle session should be revoked, not merely ignored");
  });

  test("revoking all sessions ends every session for the user", async () => {
    const a = await sessionService.createSession(userId);
    const b = await sessionService.createSession(userId);
    const c = await sessionService.createSession(userId);

    const revoked = await sessionService.revokeAllSessionsForUser(userId);
    assert.ok(revoked >= 3);

    for (const s of [a, b, c]) {
      assert.equal(await sessionService.findActiveSession(s.rawToken), null);
    }
  });

  test("revoke-all can preserve the calling session", async () => {
    const keep = await sessionService.createSession(userId);
    const drop = await sessionService.createSession(userId);

    await sessionService.revokeAllSessionsForUser(userId, {
      exceptSessionId: keep.session.id,
    });

    assert.ok(
      await sessionService.findActiveSession(keep.rawToken),
      "the calling session should survive a password change"
    );
    assert.equal(await sessionService.findActiveSession(drop.rawToken), null);
  });

  test("sessions are scoped to their own user", async () => {
    const otherEmail = `session-other-${process.pid}@example.invalid`;
    const other = await prisma.user.create({
      data: {
        email: otherEmail,
        password: "not-a-real-hash",
        firstName: "Other",
        lastName: "User",
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    try {
      const mine = await sessionService.createSession(userId);
      const theirs = await sessionService.createSession(other.id);

      const resolvedMine = await sessionService.findActiveSession(mine.rawToken);
      const resolvedTheirs = await sessionService.findActiveSession(theirs.rawToken);

      assert.equal(resolvedMine.user.id, userId);
      assert.equal(resolvedTheirs.user.id, other.id);

      // Revoking one user's sessions must not touch the other's.
      await sessionService.revokeAllSessionsForUser(other.id);
      assert.ok(await sessionService.findActiveSession(mine.rawToken));
      assert.equal(await sessionService.findActiveSession(theirs.rawToken), null);
    } finally {
      await prisma.user.deleteMany({ where: { email: otherEmail } });
    }
  });

  test("a role change takes effect on the next request", async () => {
    const { rawToken } = await sessionService.createSession(userId);

    const before = await sessionService.findActiveSession(rawToken);
    assert.equal(before.user.role, "STUDENT");

    await prisma.user.update({ where: { id: userId }, data: { role: "EDITOR" } });

    const after = await sessionService.findActiveSession(rawToken);
    assert.equal(
      after.user.role,
      "EDITOR",
      "the session must reload the user, not cache a stale role"
    );

    await prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } });
  });

  test("a status change is visible to the session lookup", async () => {
    const { rawToken } = await sessionService.createSession(userId);

    await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });

    const resolved = await sessionService.findActiveSession(rawToken);
    // The service resolves; the middleware is what turns SUSPENDED into a 403.
    assert.equal(resolved.user.status, "SUSPENDED");

    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });
  });
}
