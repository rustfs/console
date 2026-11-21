import test from "node:test"
import assert from "node:assert/strict"
import {
  getAccountBucketScanStatus,
  getAccountBucketUsage,
  summarizeBucketUsage,
} from "../../lib/account-bucket-usage.js"

const progress = {
  stage: "scanning",
  updated_at: 1800000000000,
  objects: 7,
  size: 71,
  sources_observed: 1,
  sources_total: 2,
}

test("partial scanner usage is visible separately and cannot enter bucket or overview totals", () => {
  const response = {
    buckets: [
      { name: "new", scan_progress: progress },
      { name: "old", objects: 90, size: 900 },
    ],
  }
  const usage = getAccountBucketUsage(response)
  assert.equal(usage.get("new"), null)
  assert.deepEqual(summarizeBucketUsage(["new", "old"], usage), {
    measuredBuckets: 1,
    objectsCount: 90,
    sizeBytes: 900,
  })
  assert.deepEqual(getAccountBucketScanStatus(response).get("new")?.progress, {
    stage: "scanning",
    updatedAt: progress.updated_at,
    objectsCount: 7,
    sizeBytes: 71,
    sourcesObserved: 1,
    sourcesTotal: 2,
  })
})

test("an existing full statistic keeps its original timestamp alongside new progress", () => {
  const response = {
    buckets: [
      {
        name: "old",
        objects: 90,
        size: 900,
        usage_value_state: "carried",
        usage_updated_at: 1700000000000,
        scan_progress: progress,
      },
    ],
  }
  assert.deepEqual(getAccountBucketUsage(response).get("old"), { objectsCount: 90, sizeBytes: 900 })
  const status = getAccountBucketScanStatus(response).get("old")
  assert.equal(status?.updatedAt, 1700000000000)
  assert.equal(status?.progress?.updatedAt, progress.updated_at)
  assert.equal(status?.state, "carried")
})

test("enumeration alone remains unknown, and legacy servers need no progress fields", () => {
  const response = {
    buckets: [
      { name: "listing", scan_progress: { ...progress, stage: "enumerating", objects: null, size: null } },
      { name: "legacy", objects: 0, size: 0 },
    ],
  }
  const status = getAccountBucketScanStatus(response)
  assert.equal(status.get("listing")?.progress?.objectsCount, undefined)
  assert.equal(status.get("listing")?.progress?.sizeBytes, undefined)
  assert.equal(status.get("legacy")?.progress, undefined)
  assert.deepEqual(getAccountBucketUsage(response).get("legacy"), { objectsCount: 0, sizeBytes: 0 })
})

test("malformed and unsupported progress never fabricates values or hides valid full usage", () => {
  for (const invalid of [
    { stage: "future" },
    { objects: -1 },
    { size: "71" },
    { size: null },
    { objects: Number.MAX_SAFE_INTEGER + 1 },
    { updated_at: 0 },
    { updated_at: Infinity },
    { sources_observed: 3 },
    { sources_total: 0 },
    { stage: "completed" },
  ]) {
    const response = { buckets: [{ name: "bucket", objects: 5, size: 50, scan_progress: { ...progress, ...invalid } }] }
    assert.equal(getAccountBucketScanStatus(response).get("bucket")?.progress, undefined)
    assert.deepEqual(getAccountBucketUsage(response).get("bucket"), { objectsCount: 5, sizeBytes: 50 })
  }
})

test("restart, leader changes and repeated responses replace a sample without accumulation", () => {
  const first = { buckets: [{ name: "bucket", scan_progress: progress }] }
  const next = { buckets: [{ name: "bucket", scan_progress: { ...progress, objects: 9, size: 91 } }] }
  for (const response of [first, first, next, next]) {
    const status = getAccountBucketScanStatus(JSON.parse(JSON.stringify(response))).get("bucket")
    assert.equal(status?.progress?.objectsCount, response.buckets[0].scan_progress.objects)
    assert.equal(status?.progress?.sizeBytes, response.buckets[0].scan_progress.size)
  }
})
