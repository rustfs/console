import test from "node:test"
import assert from "node:assert/strict"
import { getAccountBucketUsage } from "../../lib/account-bucket-usage.js"

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
