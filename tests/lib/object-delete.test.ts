import test from "node:test"
import assert from "node:assert/strict"
import {
  resolveBucketVersioningState,
  shouldForceDeleteObjects,
  shouldShowDeleteAllVersions,
} from "../../lib/object-delete"

test("resolveBucketVersioningState maps enabled status correctly", () => {
  assert.equal(resolveBucketVersioningState("Enabled"), "enabled")
  assert.equal(resolveBucketVersioningState("Suspended"), "disabled")
  assert.equal(resolveBucketVersioningState(undefined), "disabled")
})

test("shouldShowDeleteAllVersions only shows the option for enabled buckets", () => {
  assert.equal(shouldShowDeleteAllVersions("enabled"), true)
  assert.equal(shouldShowDeleteAllVersions("disabled"), false)
  assert.equal(shouldShowDeleteAllVersions("unknown"), false)
})

test("shouldForceDeleteObjects keeps existing delete behavior outside enabled buckets", () => {
  assert.equal(shouldForceDeleteObjects("enabled", true), true)
  assert.equal(shouldForceDeleteObjects("enabled", false), false)
  assert.equal(shouldForceDeleteObjects("disabled", false), true)
  assert.equal(shouldForceDeleteObjects("unknown", false), true)
})
