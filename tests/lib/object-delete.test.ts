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

test("shouldForceDeleteObjects never force deletes while versioning state is unknown", () => {
  assert.equal(shouldForceDeleteObjects("unknown", false), false)
  assert.equal(shouldForceDeleteObjects("unknown", true), false)
})

test("ordinary object deletion never requests recursive force delete", () => {
  for (const status of [undefined, "Suspended", "Enabled"]) {
    assert.equal(shouldForceDeleteObjects(resolveBucketVersioningState(status), false), false)
  }
})

test("force delete requires an explicit all-versions selection in an enabled bucket", () => {
  assert.equal(shouldForceDeleteObjects("enabled", true), true)
  assert.equal(shouldForceDeleteObjects("disabled", true), false)
})
