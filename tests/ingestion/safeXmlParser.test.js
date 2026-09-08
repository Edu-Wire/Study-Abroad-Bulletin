import test from "node:test";
import assert from "node:assert/strict";
import { parseSafeXml } from "../../backend/src/modules/ingestion/utils/safeXmlParser.js";

test("Safe XML Parser: parses valid RSS feed XML safely", () => {
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>IRCC News Updates</title>
      <link>https://www.canada.ca/en/immigration-refugees-citizenship.html</link>
      <item>
        <title>New Study Permit Cap Rules</title>
        <link>https://www.canada.ca/en/news/study-cap.html</link>
        <guid>ircc-item-2027-01</guid>
        <pubDate>Mon, 01 Sep 2026 12:00:00 GMT</pubDate>
      </item>
    </channel>
  </rss>`;

  const parsed = parseSafeXml(rssXml);
  assert.ok(parsed.rss);
  assert.equal(parsed.rss.channel.title, "IRCC News Updates");
  assert.equal(parsed.rss.channel.item.title, "New Study Permit Cap Rules");
  assert.equal(parsed.rss.channel.item.guid, "ircc-item-2027-01");
});

test("Safe XML Parser: rejects malformed XML syntax", () => {
  const brokenXml = `<rss><channel><title>Broken Feed</rss>`;
  assert.throws(() => parseSafeXml(brokenXml), /XML syntax error|Malformed XML/);
});

test("Safe XML Parser: rejects DOCTYPE / XXE entity expansion attempts", () => {
  const xxeXml = `<?xml version="1.0"?>
  <!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
  <rss><channel><title>&xxe;</title></channel></rss>`;

  assert.throws(() => parseSafeXml(xxeXml), /Security violation|DOCTYPE external entity/);
});

test("Safe XML Parser: enforces maximum payload size limit", () => {
  const hugeXml = `<root>${"a".repeat(1000)}</root>`;
  assert.throws(
    () => parseSafeXml(hugeXml, { maxSizeBytes: 500 }),
    /XML payload size .* exceeds the maximum allowed limit/
  );
});
