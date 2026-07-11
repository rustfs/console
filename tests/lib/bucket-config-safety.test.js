import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { isMissingBucketConfiguration } from "../../lib/bucket-configuration.ts"

const lifecycleSource = await readFile(new URL("../../components/lifecycle/new-form.tsx", import.meta.url), "utf8")
const replicationSource = await readFile(new URL("../../components/replication/new-form.tsx", import.meta.url), "utf8")
const eventsSource = await readFile(new URL("../../components/events/new-form.tsx", import.meta.url), "utf8")

test("only explicit missing-configuration errors may be treated as empty", () => {
  assert.equal(isMissingBucketConfiguration({ name: "NoSuchLifecycleConfiguration" }, "lifecycle"), true)
  assert.equal(isMissingBucketConfiguration({ Code: "ReplicationConfigurationNotFoundError" }, "replication"), true)
  assert.equal(isMissingBucketConfiguration(new Error("network unavailable"), "lifecycle"), false)
  assert.equal(
    isMissingBucketConfiguration({ name: "AccessDenied", $metadata: { httpStatusCode: 403 } }, "replication"),
    false,
  )
})

test("lifecycle creation aborts on unknown reads and keeps actions visible", () => {
  assert.match(lifecycleSource, /isMissingBucketConfiguration\(error, "lifecycle"\)/)
  assert.match(lifecycleSource, /role="alert"/)
  assert.match(lifecycleSource, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(lifecycleSource, /<form[\s\S]{0,120}onSubmit=/)
})

test("replication reads existing rules before creating a remote target", () => {
  const readIndex = replicationSource.indexOf("await getBucketReplication(bucketName)")
  const targetIndex = replicationSource.indexOf("await setRemoteReplicationTarget(bucketName, config)")
  assert.notEqual(readIndex, -1)
  assert.notEqual(targetIndex, -1)
  assert.ok(readIndex < targetIndex)
  assert.match(replicationSource, /isMissingBucketConfiguration\(error, "replication"\)/)
  assert.match(replicationSource, /role="alert"/)
})

test("event subscription never replaces unread configuration and cannot double-submit", () => {
  assert.doesNotMatch(eventsSource, /catch\s*\{[\s\S]{0,100}currentNotifications\s*=\s*\{\}/)
  assert.match(eventsSource, /if \(disabled \|\| submitting \|\| arnLoading \|\| arnError\)/)
  assert.match(eventsSource, /disabled=\{disabled \|\| submitting\}/)
  assert.match(eventsSource, /disabled=\{disabled \|\| submitting \|\| arnLoading \|\| Boolean\(arnError\)\}/)
  assert.match(eventsSource, /role="alert"/)
  assert.match(eventsSource, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
})
