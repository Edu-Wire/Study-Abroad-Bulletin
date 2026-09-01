/**
 * Rate-limit client identity behind the BFF.
 *
 * Regression cover for a denial-of-service bug: because every request reaches
 * Express from the Next.js server, a limiter keyed on the socket address puts
 * ALL users in one bucket. One caller exhausting login attempts would lock out
 * everybody. These tests prove buckets are per-client, and that the header
 * carrying that identity cannot be forged by a direct caller.
 */
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import rateLimit from "express-rate-limit";

process.env.SESSION_HASH_SECRET =
  process.env.SESSION_HASH_SECRET ?? "test-session-hash-secret-".padEnd(48, "x");
process.env.BFF_SHARED_SECRET =
  process.env.BFF_SHARED_SECRET ?? "test-bff-shared-secret-".padEnd(48, "y");

const { requireBffSecret, clientKeyGenerator, CLIENT_ADDRESS_HEADER } =
  await import("../../backend/src/middleware/bff.js");

const SECRET = process.env.BFF_SHARED_SECRET;

/** App mirroring the real middleware order: BFF gate, then limiter, then route. */
async function withServer({ max = 2 } = {}) {
  const app = express();
  app.use(requireBffSecret);
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      max,
      keyGenerator: clientKeyGenerator,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      statusCode: 429,
      message: { success: false, message: "Too many requests." },
    })
  );
  app.get("/api/thing", (req, res) =>
    res.json({ success: true, key: clientKeyGenerator(req) })
  );

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    get: (headers) => fetch(`${base}/api/thing`, { headers }),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const asBff = (clientAddress) => ({
  "x-bff-secret": SECRET,
  ...(clientAddress ? { [CLIENT_ADDRESS_HEADER]: clientAddress } : {}),
});

test("two clients behind the BFF get independent buckets", async () => {
  const srv = await withServer({ max: 2 });

  try {
    // Client A exhausts its own allowance.
    assert.equal((await srv.get(asBff("203.0.113.10"))).status, 200);
    assert.equal((await srv.get(asBff("203.0.113.10"))).status, 200);
    assert.equal(
      (await srv.get(asBff("203.0.113.10"))).status,
      429,
      "client A should be limited after its own 2 requests"
    );

    // Client B must be unaffected. Before the fix this returned 429, because
    // both clients shared the BFF's single socket address.
    assert.equal(
      (await srv.get(asBff("198.51.100.20"))).status,
      200,
      "client B must not inherit client A's exhausted bucket"
    );
    assert.equal((await srv.get(asBff("198.51.100.20"))).status, 200);
    assert.equal(
      (await srv.get(asBff("198.51.100.20"))).status,
      429,
      "client B should be limited only by its own usage"
    );
  } finally {
    await srv.close();
  }
});

test("one client cannot deny service to everyone", async () => {
  const srv = await withServer({ max: 3 });

  try {
    // A hostile client burns far past the ceiling.
    for (let i = 0; i < 25; i++) {
      await srv.get(asBff("203.0.113.99"));
    }

    // A different client still gets its full allowance.
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      statuses.push((await srv.get(asBff("198.51.100.7"))).status);
    }

    assert.deepEqual(
      statuses,
      [200, 200, 200],
      "a flooding client must not consume another client's quota"
    );
  } finally {
    await srv.close();
  }
});

test("the limiter key reflects the address the BFF reported", async () => {
  const srv = await withServer({ max: 5 });

  try {
    const res = await srv.get(asBff("203.0.113.42"));
    const body = await res.json();
    assert.equal(body.key, "203.0.113.42");
  } finally {
    await srv.close();
  }
});

test("a direct caller cannot forge the client-address header", async () => {
  const srv = await withServer({ max: 5 });

  try {
    // No BFF secret: the request is refused outright, so the forged header
    // never reaches the limiter.
    const forged = await srv.get({ [CLIENT_ADDRESS_HEADER]: "1.2.3.4" });
    assert.equal(
      forged.status,
      403,
      "a request without the BFF secret must be rejected before rate limiting"
    );
  } finally {
    await srv.close();
  }
});

test("rotating a forged address cannot evade the limiter", async () => {
  const srv = await withServer({ max: 2 });

  try {
    // Without the shared secret every attempt is a 403, so cycling addresses
    // buys nothing. This is what keeps the trusted header from becoming a
    // limiter-evasion primitive.
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      const res = await srv.get({ [CLIENT_ADDRESS_HEADER]: `10.0.0.${i}` });
      statuses.push(res.status);
    }
    assert.ok(
      statuses.every((s) => s === 403),
      `expected all 403, got ${statuses.join(",")}`
    );
  } finally {
    await srv.close();
  }
});

test("requests without a reported address still share a bounded bucket", async () => {
  const srv = await withServer({ max: 2 });

  try {
    // A valid BFF request that omits the address header (hop count 0, or an
    // unresolvable client) must still be limited, not exempted.
    assert.equal((await srv.get(asBff())).status, 200);
    assert.equal((await srv.get(asBff())).status, 200);
    assert.equal(
      (await srv.get(asBff())).status,
      429,
      "an unidentified caller must not bypass the limiter"
    );
  } finally {
    await srv.close();
  }
});

test("IPv6 clients are keyed by subnet, not truncated", async () => {
  // A naive port strip would cut "2001:db8::1" down to "2001:db8:", making
  // distinct clients collide. express-rate-limit's helper groups IPv6 into a
  // subnet instead, so a client with a large allocation cannot rotate through
  // addresses for a fresh bucket each request.
  const full = clientKeyGenerator({ trustedClientAddress: "2001:db8::1" });
  const sibling = clientKeyGenerator({ trustedClientAddress: "2001:db8::2" });

  assert.ok(full.includes("/"), `expected a subnet key, got "${full}"`);
  assert.equal(
    full,
    sibling,
    "two addresses in one IPv6 subnet should share a bucket"
  );

  const elsewhere = clientKeyGenerator({
    trustedClientAddress: "2001:db9:abcd::1",
  });
  assert.notEqual(full, elsewhere, "different IPv6 subnets must not collide");
});

test("bracketed IPv6 with a port is handled", async () => {
  const bracketed = clientKeyGenerator({ trustedClientAddress: "[2001:db8::1]:4433" });
  const bare = clientKeyGenerator({ trustedClientAddress: "2001:db8::1" });
  assert.equal(bracketed, bare, "the port must be stripped, the address kept");
});

test("IPv4 with a port keys the same as without", async () => {
  assert.equal(
    clientKeyGenerator({ trustedClientAddress: "203.0.113.9:4433" }),
    clientKeyGenerator({ trustedClientAddress: "203.0.113.9" })
  );
});

test("IPv4-mapped IPv6 normalises to the IPv4 address", async () => {
  assert.equal(
    clientKeyGenerator({ ip: "::ffff:10.0.0.5" }),
    clientKeyGenerator({ ip: "10.0.0.5" })
  );
});

test("trust proxy is not enabled anywhere", async () => {
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const source = readFileSync(
    path.join(import.meta.dirname, "../../backend/src/app.js"),
    "utf8"
  );

  // Enabling trust proxy would make Express believe any X-Forwarded-For it
  // receives, including a client-forged one — the documented bypass.
  assert.ok(
    !/trust proxy|trustProxy/.test(source),
    "trust proxy must stay disabled; identity comes from the authenticated BFF header"
  );
});

test("the BFF forwards no client-controlled x-forwarded-for", async () => {
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const route = readFileSync(
    path.join(
      import.meta.dirname,
      "../../src/app/api/backend/[...path]/route.ts"
    ),
    "utf8"
  );

  assert.ok(
    !/headers\.set\("x-forwarded-for"/.test(route),
    "relaying the client's x-forwarded-for would let it forge an identity"
  );
  assert.match(
    route,
    /x-bff-client-address/,
    "the BFF should report the resolved address in its own header"
  );
});
