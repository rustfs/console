import test from "node:test"
import assert from "node:assert/strict"
import { getAccountBucketUsage, summarizeBucketUsage } from "../../lib/account-bucket-usage.js"

test("getAccountBucketUsage reads authoritative bucket statistics from accountinfo", () => {
  const usage = getAccountBucketUsage({
    buckets: [
      { name: "agent", objects: 1600, size: 209715200 },
      { name: "cccc", objects: 1, size: 57344 },
    ],
  })

  assert.deepEqual(usage.get("agent"), { objectsCount: 1600, sizeBytes: 209715200 })
  assert.deepEqual(usage.get("cccc"), { objectsCount: 1, sizeBytes: 57344 })
})

test("getAccountBucketUsage preserves valid empty bucket statistics", () => {
  const usage = getAccountBucketUsage({ buckets: [{ name: "empty", objects: 0, size: 0 }] })

  assert.deepEqual(usage.get("empty"), { objectsCount: 0, sizeBytes: 0 })
})

test("getAccountBucketUsage does not turn missing or malformed statistics into zero", () => {
  const usage = getAccountBucketUsage({
    buckets: [
      { name: "missing-size", objects: 3 },
      { name: "negative", objects: -1, size: 10 },
      { name: "not-finite", objects: 1, size: Number.NaN },
      { name: "wrong-types", objects: "4", size: "12" },
      { objects: 1, size: 12 },
    ],
  })

  assert.equal(usage.size, 0)
})

test("bucket overview includes only the buckets visible to the current account", () => {
  const usage = getAccountBucketUsage({
    buckets: [
      { name: "visible", objects: 3, size: 20 },
      { name: "outside-scope", objects: 40, size: 800 },
    ],
  })
  assert.deepEqual(summarizeBucketUsage(["visible"], usage), { objectsCount: 3, sizeBytes: 20 })
})

test("partial bucket usage stays unknown instead of reporting a misleading total", () => {
  const usage = getAccountBucketUsage({ buckets: [{ name: "known", objects: 0, size: 0 }] })
  assert.equal(summarizeBucketUsage(["known", "missing"], usage), undefined)
})

test("a confirmed empty bucket list has zero usage", () => {
  assert.deepEqual(summarizeBucketUsage([], new Map()), { objectsCount: 0, sizeBytes: 0 })
})

test("overflowing usage totals stay unknown", () => {
  const usage = new Map(["first", "second"].map((name) => [name, { objectsCount: 1, sizeBytes: Number.MAX_VALUE }]))
  assert.equal(summarizeBucketUsage(["first", "second"], usage), undefined)
})
