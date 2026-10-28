import test from "node:test"
import assert from "node:assert/strict"
import {
  canRetryTierDeletion,
  isTierDeletionBlocked,
  isTierDeletionUnsupported,
  parseTierCleanupRetry,
  parseTierDeletionCheck,
} from "../../lib/tier-deletion"

const clear = {
  tierName: "ARCHIVE",
  proofComplete: true,
  scanStatus: "complete",
  reasons: [],
  remote: { state: "not_checked" },
}

test("a complete advisory check allows a new authoritative deletion request", () => {
  assert.equal(canRetryTierDeletion(parseTierDeletionCheck({ ...clear, futureField: 123 }, "ARCHIVE")), true)
})

test("only a matching, complete proof with no blockers enables repeat deletion", () => {
  for (const data of [
    null,
    {},
    { ...clear, tierName: "OTHER" },
    { ...clear, proofComplete: "true" },
    { ...clear, proofComplete: false },
    { ...clear, scanStatus: "future" },
    { ...clear, scanStatus: "incomplete" },
    { ...clear, scanStatus: "stopped_after_blocker" },
    { ...clear, reasons: null },
    { ...clear, reasons: [null] },
    { ...clear, reasons: [{ kind: "FUTURE_REASON" }] },
  ]) {
    assert.equal(canRetryTierDeletion(parseTierDeletionCheck(data, "ARCHIVE")), false, JSON.stringify(data))
  }
})

test("diagnosis tolerates extra fields and retains unknown or malformed reasons as blockers", () => {
  const parsed = parseTierDeletionCheck(
    { ...clear, reasons: [{ kind: "CLEANUP_PENDING", count: 99 }, { kind: "NEW_REASON" }, {}, null] },
    "ARCHIVE",
  )
  assert.deepEqual(parsed?.reasons, ["CLEANUP_PENDING", "NEW_REASON", "UNKNOWN", "UNKNOWN"])
})

test("only explicit in-use or blocked codes automatically trigger diagnostics", () => {
  for (const code of [
    "XMinioAdminTierBackendInUse",
    "XRustFSAdminTierBackendInUse",
    "TierNameBackendInUse",
    "TierDeletionBlocked",
    "TierBackendInUse",
  ]) {
    assert.equal(isTierDeletionBlocked(Object.assign(new Error("blocked"), { code, status: 409 })), true)
  }
  for (const error of [
    new Error("tier is in use"),
    { status: 409 },
    { code: "AccessDenied" },
    { code: "TierRemoveFailed" },
    { code: "XMinioAdminTierBackendInUse", status: 403 },
    { code: "XMinioAdminTierBackendInUse", status: 401 },
  ]) {
    assert.equal(isTierDeletionBlocked(error), false)
  }
})

test("old server endpoints are identified without concealing unrelated failures", () => {
  for (const error of [{ status: 404 }, { status: 405 }, { status: 501 }, { code: "NotImplemented" }])
    assert.equal(isTierDeletionUnsupported(error), true)
  for (const error of [{ status: 403 }, { status: 500 }, new Error("network")])
    assert.equal(isTierDeletionUnsupported(error), false)
})

test("cleanup parsing separates accepted, busy and unknown responses, accepting zero enqueued", () => {
  for (const status of ["accepted", "busy", "future"]) {
    assert.deepEqual(
      parseTierCleanupRetry(
        { tierName: "ARCHIVE", status, scanned: 0, enqueued: 0, failed: 0, scanTruncated: true, extra: 123 },
        "ARCHIVE",
      ),
      { status, scanTruncated: true },
    )
  }
  for (const data of [null, {}, { tierName: "OTHER", status: "accepted" }, { tierName: "ARCHIVE", status: 202 }]) {
    assert.equal(parseTierCleanupRetry(data, "ARCHIVE").status, "unknown")
  }
})
