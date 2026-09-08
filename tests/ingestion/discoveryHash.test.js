import test from "node:test";
import assert from "node:assert/strict";
import {
  computeDiscoveryHash,
  shouldSkipDetail,
} from "../../backend/src/modules/ingestion/services/discovery.service.js";

test("Discovery hash: identical title/summary/publishedAt hash the same", () => {
  const publishedAt = new Date("2026-03-01T00:00:00Z");
  const a = computeDiscoveryHash("Study permit rules updated", "New attestation letter required.", publishedAt);
  const b = computeDiscoveryHash("Study permit rules updated", "New attestation letter required.", publishedAt);
  assert.equal(a, b);
});

test("Discovery hash: a changed summary hashes differently", () => {
  const publishedAt = new Date("2026-03-01T00:00:00Z");
  const a = computeDiscoveryHash("Study permit rules updated", "New attestation letter required.", publishedAt);
  const b = computeDiscoveryHash("Study permit rules updated", "Attestation letter no longer required.", publishedAt);
  assert.notEqual(a, b);
});

test("shouldSkipDetail: skips a feed item whose fingerprint is unchanged and already past discovery", () => {
  const skip = shouldSkipDetail({
    isWatchSource: false,
    existingHash: "same-hash",
    newHash: "same-hash",
    existingStatus: "CLASSIFIED",
  });
  assert.equal(skip, true);
});

test("shouldSkipDetail: never skips a CHANGE_WATCH source, even with a matching fingerprint", () => {
  const skip = shouldSkipDetail({
    isWatchSource: true,
    existingHash: "same-hash",
    newHash: "same-hash",
    existingStatus: "CLASSIFIED",
  });
  assert.equal(skip, false, "a watch page's discovery payload is static config, not content - it must always be re-checked");
});

test("shouldSkipDetail: re-fetches when the fingerprint actually changed", () => {
  const skip = shouldSkipDetail({
    isWatchSource: false,
    existingHash: "old-hash",
    newHash: "new-hash",
    existingStatus: "CLASSIFIED",
  });
  assert.equal(skip, false);
});

test("shouldSkipDetail: never skips an item that never made it past discovery/detail-pending", () => {
  const skip = shouldSkipDetail({
    isWatchSource: false,
    existingHash: "same-hash",
    newHash: "same-hash",
    existingStatus: "DETAIL_PENDING",
  });
  assert.equal(skip, false, "a prior attempt that never produced a version must still be retried");
});
