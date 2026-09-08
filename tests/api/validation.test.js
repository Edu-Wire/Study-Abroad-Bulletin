/**
 * Express 5 query-validation repair.
 *
 * Express 5 exposes `req.query` as a getter-only property, so the previous
 * middleware's `req.query = result.data` threw
 *   TypeError: Cannot set property query of #<IncomingMessage>
 * turning every request with a query schema into a 500. These tests boot a real
 * Express 5 app against the real middleware to prove the repair holds.
 */
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { validateRequest } from "../../backend/src/middleware/validate.js";
import {
  ArticleQuerySchema,
  ArticleCreateSchema,
  UserIdParamSchema,
  StrongPasswordSchema,
} from "../../backend/src/validators/index.js";

/** Boot an app on an ephemeral port and return a request helper. */
async function withServer(configure) {
  const app = express();
  app.use(express.json());
  configure(app);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  return {
    async request(path, options) {
      const res = await fetch(base + path, options);
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Leave json null; the raw body is asserted instead.
      }
      return { status: res.status, json, text };
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test("a validated query request does not throw an Express 5 error", async () => {
  const srv = await withServer((app) => {
    app.get(
      "/api/admin/articles",
      validateRequest({ query: ArticleQuerySchema }),
      (req, res) => {
        res.json({ success: true, validated: res.locals.validated.query });
      }
    );
  });

  try {
    const res = await srv.request("/api/admin/articles?page=1");
    assert.equal(res.status, 200, `expected 200, body: ${res.text}`);
    assert.equal(res.json.success, true);
    assert.equal(res.json.validated.page, 1);
  } finally {
    await srv.close();
  }
});

test("query values are coerced to numbers and defaults applied", async () => {
  const srv = await withServer((app) => {
    app.get("/t", validateRequest({ query: ArticleQuerySchema }), (req, res) => {
      res.json(res.locals.validated.query);
    });
  });

  try {
    const res = await srv.request("/t?page=3&limit=50");
    assert.equal(res.status, 200);
    assert.equal(res.json.page, 3);
    assert.equal(res.json.limit, 50);
    assert.equal(typeof res.json.page, "number");
    // Defaults for omitted fields.
    assert.equal(res.json.status, "ALL");
    assert.equal(res.json.category, "ALL");

    const bare = await srv.request("/t");
    assert.equal(bare.json.page, 1);
    assert.equal(bare.json.limit, 20);
  } finally {
    await srv.close();
  }
});

test("req.query itself is left untouched", async () => {
  const srv = await withServer((app) => {
    app.get("/t", validateRequest({ query: ArticleQuerySchema }), (req, res) => {
      // Reading req.query must still work and still hold raw strings.
      res.json({ raw: req.query, validated: res.locals.validated.query });
    });
  });

  try {
    const res = await srv.request("/t?page=7");
    assert.equal(res.status, 200);
    assert.equal(res.json.raw.page, "7", "req.query should keep the raw string");
    assert.equal(res.json.validated.page, 7, "validated copy should be a number");
  } finally {
    await srv.close();
  }
});

test("an invalid query returns a structured 400", async () => {
  const srv = await withServer((app) => {
    app.get("/t", validateRequest({ query: ArticleQuerySchema }), (req, res) => {
      res.json({ success: true });
    });
  });

  try {
    for (const q of ["?page=0", "?page=-4", "?page=abc", "?limit=101", "?limit=0"]) {
      const res = await srv.request("/t" + q);
      assert.equal(res.status, 400, `${q} should be rejected, got ${res.status}`);
      assert.equal(res.json.success, false);
      assert.equal(res.json.message, "Validation failed");
      assert.ok(Array.isArray(res.json.errors) && res.json.errors.length > 0);
      assert.equal(res.json.errors[0].location, "query");
      assert.ok(res.json.errors[0].field);
      assert.ok(res.json.errors[0].message);
    }
  } finally {
    await srv.close();
  }
});

test("an invalid body returns a structured 400", async () => {
  const srv = await withServer((app) => {
    app.post("/t", validateRequest({ body: ArticleCreateSchema }), (req, res) => {
      res.json({ success: true });
    });
  });

  try {
    const res = await srv.request("/t", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline: "", slug: "", summary: "", category: "NOPE" }),
    });
    assert.equal(res.status, 400);
    assert.equal(res.json.success, false);
    assert.ok(res.json.errors.some((e) => e.location === "body"));
  } finally {
    await srv.close();
  }
});

test("an invalid param returns a structured 400", async () => {
  const srv = await withServer((app) => {
    app.get(
      "/t/:id",
      validateRequest({ params: UserIdParamSchema }),
      (req, res) => {
        res.json({ id: res.locals.validated.params.id });
      }
    );
  });

  try {
    const ok = await srv.request("/t/user-123");
    assert.equal(ok.status, 200);
    assert.equal(ok.json.id, "user-123");

    // A whitespace-only id trims to empty and must be rejected.
    const bad = await srv.request("/t/%20");
    assert.equal(bad.status, 400);
    assert.equal(bad.json.errors[0].location, "params");
  } finally {
    await srv.close();
  }
});

test("errors from several locations are reported together", async () => {
  const srv = await withServer((app) => {
    app.post(
      "/t/:id",
      validateRequest({
        params: UserIdParamSchema,
        query: ArticleQuerySchema,
        body: ArticleCreateSchema,
      }),
      (req, res) => res.json({ success: true })
    );
  });

  try {
    const res = await srv.request("/t/%20?page=0", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const locations = new Set(res.json.errors.map((e) => e.location));
    assert.ok(locations.has("params"));
    assert.ok(locations.has("query"));
    assert.ok(locations.has("body"));
  } finally {
    await srv.close();
  }
});

test("body transforms survive into the validated copy", async () => {
  const srv = await withServer((app) => {
    app.post("/t", validateRequest({ body: ArticleCreateSchema }), (req, res) => {
      res.json(res.locals.validated.body);
    });
  });

  try {
    const res = await srv.request("/t", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: "  Spaced Headline  ",
        slug: "  a-slug  ",
        summary: "  A summary  ",
        category: "VISA",
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.headline, "Spaced Headline", "trim() must be applied");
    assert.equal(res.json.slug, "a-slug");
    assert.equal(res.json.status, "DRAFT", "default must be applied");
    assert.deepEqual(res.json.countryIds, []);
  } finally {
    await srv.close();
  }
});

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------

test("the password policy rejects weak passwords", () => {
  const weak = [
    "short",             // too short
    "alllowercase123!",  // no uppercase
    "ALLUPPERCASE123!",  // no lowercase
    "NoDigitsHere!!!!",  // no digit
    "NoSymbols1234567",  // no symbol
    "Passw0rd!",         // under 12 characters
  ];

  for (const candidate of weak) {
    const result = StrongPasswordSchema.safeParse(candidate);
    assert.equal(result.success, false, `"${candidate}" should be rejected`);
  }
});

test("the password policy accepts a strong password", () => {
  const result = StrongPasswordSchema.safeParse("Str0ng-Passphrase!42");
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
});

test("the generated temporary password satisfies the policy", async () => {
  // The invite flow auto-generates a password; it must not be rejected by the
  // very policy the application enforces elsewhere.
  const { default: crypto } = await import("node:crypto");

  // Mirror of generateTemporaryPassword in backend/src/server.js.
  function generateTemporaryPassword(length = 12) {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghjkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%&*";
    const all = uppercase + lowercase + numbers + symbols;
    let pwd = "";
    pwd += uppercase[crypto.randomInt(uppercase.length)];
    pwd += lowercase[crypto.randomInt(lowercase.length)];
    pwd += numbers[crypto.randomInt(numbers.length)];
    pwd += symbols[crypto.randomInt(symbols.length)];
    for (let i = 4; i < length; i++) pwd += all[crypto.randomInt(all.length)];
    return pwd.split("").sort(() => crypto.randomInt(3) - 1).join("");
  }

  for (let i = 0; i < 200; i++) {
    const pwd = generateTemporaryPassword(12);
    const result = StrongPasswordSchema.safeParse(pwd);
    assert.equal(result.success, true, `generated "${pwd}" fails the policy`);
  }
});
