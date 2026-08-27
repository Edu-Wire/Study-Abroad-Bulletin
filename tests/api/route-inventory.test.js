import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP_SOURCE = fs.readFileSync(path.join(ROOT, "backend/src/app.js"), "utf8");

const EXPECTED_ROUTES = [
  "POST /api/signup",
  "POST /api/login",
  "POST /api/logout",
  "POST /api/logout-all",
  "POST /api/password/change",
  "GET /api/me",
  "GET /api/student/profile",
  "PUT /api/student/profile",
  "GET /api/student/feed",
  "GET /api/admin/users",
  "POST /api/admin/users/invite",
  "PATCH /api/admin/users/:id",
  "DELETE /api/admin/users/:id",
  "GET /api/countries",
  "GET /api/admin/articles",
  "POST /api/admin/articles",
  "PUT /api/admin/articles/:id",
  "PATCH /api/admin/articles/:id/status",
  "DELETE /api/admin/articles/:id",
  "GET /api/admin/rss/preview",
  "POST /api/admin/articles/import-rss",
  "GET /api/health",
];

function readRouteInventory(source) {
  const routes = [];
  const routePattern = /app\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g;
  let match;

  while ((match = routePattern.exec(source)) !== null) {
    routes.push(`${match[1].toUpperCase()} ${match[2]}`);
  }

  return routes;
}

test("Express route inventory remains unchanged during app extraction", () => {
  assert.deepEqual(readRouteInventory(APP_SOURCE), EXPECTED_ROUTES);
});
