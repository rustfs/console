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
  assert.deepEqual(summarizeBucketUsage(["visible"], usage), { objectsCount: 3, sizeBytes: 20, measuredBuckets: 1 })
})

test("partial usage counts only measured visible buckets", () => {
  const usage = getAccountBucketUsage({ buckets: [{ name: "known", objects: 0, size: 0 }] })
  assert.deepEqual(summarizeBucketUsage(["known", "missing"], usage), {
    objectsCount: 0,
    sizeBytes: 0,
    measuredBuckets: 1,
  })
})

test("a confirmed empty bucket list has zero usage", () => {
  assert.deepEqual(summarizeBucketUsage([], new Map()), { objectsCount: 0, sizeBytes: 0, measuredBuckets: 0 })
})

test("overflowing usage totals stay unknown", () => {
  const usage = new Map(["first", "second"].map((name) => [name, { objectsCount: 1, sizeBytes: Number.MAX_VALUE }]))
  assert.deepEqual(summarizeBucketUsage(["first", "second"], usage), {
    measuredBuckets: 2,
    objectsCount: 2,
    sizeBytes: undefined,
  })
})

test("only an explicitly reported bucket without either statistic is unmeasured", () => {
  const usage = getAccountBucketUsage({
    buckets: [
      { name: "measured", objects: 300000, size: 307200000 },
      { name: "unmeasured" },
      { name: "malformed", size: 1 },
    ],
  })
  assert.equal(usage.get("unmeasured"), null)
  assert.equal(usage.get("restricted"), undefined)
  assert.equal(usage.get("malformed"), undefined)
  assert.deepEqual(summarizeBucketUsage(["measured", "unmeasured"], usage), {
    measuredBuckets: 1,
    objectsCount: 300000,
    sizeBytes: 307200000,
  })
})

test("account usage accepts only exact object counts and preserves byte totals on count overflow", () => {
  for (const objects of [1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(getAccountBucketUsage({ buckets: [{ name: "invalid", objects, size: 100 }] }).has("invalid"), false)
  }
  const usage = getAccountBucketUsage({
    buckets: [
      { name: "a", objects: Number.MAX_SAFE_INTEGER, size: 10 },
      { name: "b", objects: 2, size: 20 },
    ],
  })
  assert.deepEqual(summarizeBucketUsage(["a", "b"], usage), {
    measuredBuckets: 2,
    objectsCount: undefined,
    sizeBytes: 30,
  })
})
