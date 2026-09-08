import assert from "node:assert/strict";
import express from "express";
import test from "node:test";

const { createCountriesRouter } = await import(
  "../../backend/src/modules/countries/countries.routes.js"
);

async function withRouter(service) {
  const app = express();
  app.use("/api/countries/public", createCountriesRouter({ service }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    request: (path) => fetch(`${base}${path}`),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("public country listing returns the service result", async () => {
  const countries = [
    {
      id: "canada",
      name: "Canada",
      code: "CA",
      flag: "🇨🇦",
      universitiesCount: 12,
      averageTuition: "CAD 28,500 / yr",
      popularIntake: "September",
      updatesCount: 4,
      heroImage: null,
    },
  ];
  const service = {
    getPublicCountries: async () => countries,
    getPublicCountry: async () => null,
  };
  const server = await withRouter(service);

  try {
    const response = await server.request("/api/countries/public");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, countries });
  } finally {
    await server.close();
  }
});

test("public country detail forwards the slug and returns 404 when absent", async () => {
  const calls = [];
  const service = {
    getPublicCountries: async () => [],
    getPublicCountry: async (slug) => {
      calls.push(slug);
      return null;
    },
  };
  const server = await withRouter(service);

  try {
    const response = await server.request("/api/countries/public/not-a-country");
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Country not found.",
    });
    assert.deepEqual(calls, ["not-a-country"]);
  } finally {
    await server.close();
  }
});

test("public detail maps persisted relationships and computes days left", async () => {
  const { toPublicCountryDetail } = await import(
    "../../backend/src/modules/countries/countries.service.js"
  );
  const now = Date.parse("2026-08-27T00:00:00.000Z");
  const detail = toPublicCountryDetail(
    {
      id: "canada",
      name: "Canada",
      code: "CA",
      flag: "🇨🇦",
      universitiesCount: 1,
      averageTuition: "CAD 28,500 / yr",
      popularIntake: "September",
      updatesCount: 1,
      heroImage: null,
      universities: [],
      immigrationDeadlines: [],
      scholarships: [
        {
          scholarship: {
            id: "s1",
            slug: "s1",
            name: "Award",
            deadline: "2026-09-03T00:00:00.000Z",
            deadlineString: "3 September 2026",
          },
        },
      ],
      articles: [],
      consultantDestinations: [],
      consultantsHQ: [],
    },
    now
  );

  assert.equal(detail.scholarships[0].daysLeft, 7);
  assert.equal(detail.scholarships[0].destinations, undefined);
});
