import test from "node:test"
import assert from "node:assert/strict"
import { buildModuleBucketPath } from "../../lib/module-bucket-route.js"

test("buildModuleBucketPath links a bucket to a module detail route", () => {
  assert.equal(buildModuleBucketPath("/lifecycle", "photos"), "/lifecycle?bucket=photos")
})

test("buildModuleBucketPath encodes bucket names in query params", () => {
  assert.equal(buildModuleBucketPath("/events", "logs archive"), "/events?bucket=logs+archive")
})

test("buildModuleBucketPath returns module root when bucket is empty", () => {
  assert.equal(buildModuleBucketPath("/replication", ""), "/replication")
})
