import test from "node:test"
import assert from "node:assert/strict"
import {
  resolveBucketVersioningState,
  shouldDeleteAllVersions,
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

test("shouldDeleteAllVersions stays disabled while versioning state is unknown", () => {
  assert.equal(shouldDeleteAllVersions("unknown", false), false)
  assert.equal(shouldDeleteAllVersions("unknown", true), false)
})

test("ordinary object deletion never requests recursive force delete", () => {
  for (const status of [undefined, "Suspended", "Enabled"]) {
    assert.equal(shouldDeleteAllVersions(resolveBucketVersioningState(status), false), false)
  }
})

test("all-version deletion requires an explicit selection in an enabled bucket", () => {
  assert.equal(shouldDeleteAllVersions("enabled", true), true)
  assert.equal(shouldDeleteAllVersions("disabled", true), false)
})
