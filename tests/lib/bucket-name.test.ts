import test from "node:test"
import assert from "node:assert/strict"
import { getBucketNameError, getOptionalBucketNameError, isBucketNameValid } from "../../lib/bucket-name"

test("isBucketNameValid accepts lowercase bucket names", () => {
  assert.equal(isBucketNameValid("bucket-demo"), true)
})

test("getBucketNameError rejects uppercase letters", () => {
  assert.equal(getBucketNameError("Bucket-Demo"), "Bucket names must not contain uppercase letters")
})

test("getBucketNameError rejects names shorter than 3 characters", () => {
  assert.equal(getBucketNameError("ab"), "Bucket names must be 3-63 characters long")
})

test("getOptionalBucketNameError ignores empty input", () => {
  assert.equal(getOptionalBucketNameError("   "), null)
})
