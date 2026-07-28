import test from "node:test"
import assert from "node:assert/strict"

import { loadBucketPolicyStatuses } from "../../lib/bucket-policy-status"

test("loadBucketPolicyStatuses preserves public and private responses", async () => {
  const statuses = await loadBucketPolicyStatuses(["public", "private"], async (bucketName) => ({
    PolicyStatus: { IsPublic: bucketName === "public" },
  }))

  assert.deepEqual(statuses, {
    public: true,
    private: false,
  })
})

test("loadBucketPolicyStatuses leaves access-denied responses unknown", async () => {
  const statuses = await loadBucketPolicyStatuses(["allowed", "denied"], async (bucketName) => {
    if (bucketName === "denied") throw new Error("AccessDenied")
    return { PolicyStatus: { IsPublic: false } }
  })

  assert.deepEqual(statuses, {
    allowed: false,
    denied: undefined,
  })
})
