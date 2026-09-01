import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml, stripAllHtml } from "../../backend/src/modules/ingestion/utils/htmlSanitizer.js";

test("HTML Sanitizer: removes malicious scripts, event handlers, and javascript protocols", () => {
  const dirty = `
    <div>
      <h1>Breaking Policy Update</h1>
      <script>alert('xss');</script>
      <p onclick="stealCookies()">New student rules announced.</p>
      <a href="javascript:alert(1)">Click here</a>
      <img src="valid.jpg" onerror="alert(2)" />
      <iframe src="https://evil.com"></iframe>
    </div>
  `;

  const clean = sanitizeHtml(dirty);
  assert.ok(!clean.includes("<script>"));
  assert.ok(!clean.includes("alert('xss')"));
  assert.ok(!clean.includes("onclick="));
  assert.ok(!clean.includes("onerror="));
  assert.ok(!clean.includes("javascript:"));
  assert.ok(!clean.includes("<iframe"));
  assert.ok(clean.includes("<h1>Breaking Policy Update</h1>"));
  assert.ok(clean.includes("New student rules announced."));
});

test("HTML Sanitizer: strips all HTML tags and extracts formatted plain text", () => {
  const html = `
    <div>
      <h1>Immigration Notice</h1>
      <p>Study permits for <strong>2027</strong> intake have opened.</p>
      <ul>
        <li>Requirement A</li>
        <li>Requirement B</li>
      </ul>
    </div>
  `;

  const plain = stripAllHtml(html);
  assert.ok(!plain.includes("<"));
  assert.ok(!plain.includes(">"));
  assert.ok(plain.includes("Immigration Notice"));
  assert.ok(plain.includes("Study permits for 2027 intake have opened."));
  assert.ok(plain.includes("Requirement A"));
});
