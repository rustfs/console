import test from "node:test"
import assert from "node:assert/strict"

import { isMissingBucketError } from "../../lib/bucket-access"

test("isMissingBucketError redirects only for a definitive missing bucket response", () => {
  assert.equal(isMissingBucketError({ $metadata: { httpStatusCode: 404 } }), true)
  assert.equal(isMissingBucketError({ Code: "NoSuchBucket" }), true)
})

test("isMissingBucketError does not treat access denied as a missing bucket", () => {
  assert.equal(isMissingBucketError({ $metadata: { httpStatusCode: 403 }, Code: "AccessDenied" }), false)
})

test("isMissingBucketError keeps the current bucket when availability is uncertain", () => {
  assert.equal(isMissingBucketError(new Error("Network request failed")), false)
})
