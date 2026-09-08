/** D3: verified server readers get a separate quota for public GETs. */
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

process.env.BFF_SHARED_SECRET =
  process.env.BFF_SHARED_SECRET ?? "test-bff-shared-secret-".padEnd(48, "y");

const { requireBffSecret, SERVICE_READER_HEADER, SERVICE_READER_VALUE } =
  await import("../../backend/src/middleware/bff.js");
const { createServiceQuotaLimiter, createGeneralApiLimiter } =
  await import("../../backend/src/middleware/rateLimiter.js");

async function withServer({ serviceMax = 1000, generalMax = 100 } = {}) {
  const app = express();
  app.use(requireBffSecret);
  app.use("/api", createServiceQuotaLimiter({ windowMs: 60_000, max: serviceMax }));
  app.use("/api", createGeneralApiLimiter({ windowMs: 60_000, max: generalMax }));
  app.get("/api/countries", (_req, res) => res.json({ success: true }));
  app.post("/api/countries", (_req, res) => res.json({ success: true }));

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    request: (init = {}) =>
      fetch(`${base}/api/countries`, {
        ...init,
        headers: {
          "x-bff-secret": process.env.BFF_SHARED_SECRET,
          ...(init.headers ?? {}),
        },
      }),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("server-reader traffic does not consume a browser client bucket", async () => {
  const srv = await withServer({ serviceMax: 2, generalMax: 2 });
  const serviceHeaders = { [SERVICE_READER_HEADER]: SERVICE_READER_VALUE };
  const browserHeaders = { "x-bff-client-address": "198.51.100.7" };
  try {
    assert.equal((await srv.request({ headers: serviceHeaders })).status, 200);
    assert.equal((await srv.request({ headers: serviceHeaders })).status, 200);
    assert.equal((await srv.request({ headers: browserHeaders })).status, 200);
    assert.equal((await srv.request({ headers: browserHeaders })).status, 200);
    assert.equal((await srv.request({ headers: serviceHeaders })).status, 429);
    assert.equal((await srv.request({ headers: browserHeaders })).status, 429);
  } finally {
    await srv.close();
  }
});

test("bad or missing BFF secret cannot reach the service-reader skip", async () => {
  const srv = await withServer({ serviceMax: 1, generalMax: 10 });
  const serviceHeaders = { [SERVICE_READER_HEADER]: SERVICE_READER_VALUE };
  try {
    assert.equal(
      (await srv.request({ headers: { ...serviceHeaders, "x-bff-secret": "bad" } })).status,
      403
    );
    assert.equal(
      (await srv.request({ headers: serviceHeaders })).status,
      200,
      "the rejected request must not consume the service quota"
    );
  } finally {
    await srv.close();
  }
});

test("verified public service-reader quota engages", async () => {
  const srv = await withServer({ serviceMax: 1, generalMax: 10 });
  const headers = { [SERVICE_READER_HEADER]: SERVICE_READER_VALUE };
  try {
    assert.equal((await srv.request({ headers })).status, 200);
    assert.equal((await srv.request({ headers })).status, 429);
  } finally {
    await srv.close();
  }
});

test("service marker never bypasses mutation limiting", async () => {
  const srv = await withServer({ serviceMax: 1, generalMax: 1 });
  const headers = { [SERVICE_READER_HEADER]: SERVICE_READER_VALUE };
  try {
    assert.equal((await srv.request({ method: "POST", headers })).status, 200);
    assert.equal((await srv.request({ method: "POST", headers })).status, 429);
  } finally {
    await srv.close();
  }
});
