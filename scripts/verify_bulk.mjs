const secret = process.env.BFF_SHARED_SECRET;

async function testBulk() {
  console.log("Testing GET /api/admin/articles...");
  const getRes = await fetch("http://localhost:8000/api/admin/articles?page=1&limit=5", {
    headers: {
      "x-bff-secret": secret,
      "x-bff-client-address": "127.0.0.1",
    }
  });
  console.log("GET Status:", getRes.status);
  const getData = await getRes.json();
  console.log("GET Success:", getData.success);
  console.log("Status counts:", getData.statusCounts);

  if (getData.articles && getData.articles.length > 0) {
    const testId = getData.articles[0].id;
    console.log(`Testing PATCH /api/admin/articles/bulk-status with article ID: ${testId}...`);
    const patchRes = await fetch("http://localhost:8000/api/admin/articles/bulk-status", {
      method: "PATCH",
      headers: {
        "x-bff-secret": secret,
        "x-bff-client-address": "127.0.0.1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: [testId],
        status: "ARCHIVED",
      }),
    });
    console.log("PATCH Status:", patchRes.status);
    const patchData = await patchRes.json();
    console.log("PATCH Response:", patchData);
  }
}

testBulk().catch(console.error);
