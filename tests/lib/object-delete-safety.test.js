import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  resolveBucketVersioningState,
  shouldForceDeleteObjects,
  shouldShowDeleteAllVersions,
} from "../../lib/object-delete.ts"

const objectListSource = await readFile(new URL("../../components/object/list.tsx", import.meta.url), "utf8")

test("unknown bucket versioning state never enables force delete", () => {
  assert.equal(resolveBucketVersioningState("Enabled"), "enabled")
  assert.equal(shouldShowDeleteAllVersions("unknown"), false)
  assert.equal(shouldForceDeleteObjects("unknown", false), false)
  assert.equal(shouldForceDeleteObjects("disabled", false), true)
})

test("object deletion stays blocked until versioning state is known", () => {
  assert.match(objectListSource, /setBucketVersioningState\("unknown"\)/)
  assert.match(objectListSource, /versioningError/)
  assert.match(objectListSource, /bucketVersioningState === "unknown"/)
  assert.match(objectListSource, /role=\{versioningError \? "alert" : "status"\}/)
  assert.doesNotMatch(objectListSource, /catch\s*\{[\s\S]{0,120}setBucketVersioningState\("disabled"\)/)
})
