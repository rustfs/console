import test from "node:test"
import assert from "node:assert/strict"
import {
  bytesToBandwidth,
  remoteTargetBandwidthLimit,
  remoteTargetHealthCheckSeconds,
} from "../../lib/bucket-replication-target"

test("remoteTargetHealthCheckSeconds: converts Go nanoseconds to seconds", () => {
  assert.equal(remoteTargetHealthCheckSeconds({ healthCheckDuration: 60_000_000_000 }), 60)
  assert.equal(remoteTargetHealthCheckSeconds({ healthCheckDuration: 1_500_000_000 }), 2)
})

test("remoteTargetHealthCheckSeconds: keeps legacy second values", () => {
  assert.equal(remoteTargetHealthCheckSeconds({ healthCheckDuration: 30 }), 30)
})

test("remoteTargetHealthCheckSeconds: a stored 0 is 0, a missing field is undefined", () => {
  assert.equal(remoteTargetHealthCheckSeconds({ healthCheckDuration: 0 }), 0)
  assert.equal(remoteTargetHealthCheckSeconds({}), undefined)
  assert.equal(remoteTargetHealthCheckSeconds(null), undefined)
  assert.equal(remoteTargetHealthCheckSeconds({ healthCheckDuration: -1 }), undefined)
})

test("remoteTargetBandwidthLimit: reads the madmin key and falls back to the legacy key", () => {
  assert.equal(remoteTargetBandwidthLimit({ bandwidthlimit: 1024 }), 1024)
  assert.equal(remoteTargetBandwidthLimit({ bandwidth_limit: 2048 }), 2048)
  assert.equal(remoteTargetBandwidthLimit({ bandwidthlimit: 0, bandwidth_limit: 2048 }), 0)
})

test("remoteTargetBandwidthLimit: a missing limit is undefined", () => {
  assert.equal(remoteTargetBandwidthLimit({}), undefined)
  assert.equal(remoteTargetBandwidthLimit(undefined), undefined)
})

test("bytesToBandwidth: an unreported limit shows the new-target default", () => {
  assert.deepEqual(bytesToBandwidth(undefined), { bandwidth: 100, unit: "Gi" })
})

test("bytesToBandwidth: a stored 0 shows as 0", () => {
  assert.deepEqual(bytesToBandwidth(0), { bandwidth: 0, unit: "Gi" })
})

test("bytesToBandwidth: picks the largest exact unit", () => {
  assert.deepEqual(bytesToBandwidth(2 * 1024 ** 3), { bandwidth: 2, unit: "Gi" })
  assert.deepEqual(bytesToBandwidth(3 * 1024 ** 2), { bandwidth: 3, unit: "Mi" })
  assert.deepEqual(bytesToBandwidth(1500), { bandwidth: 1, unit: "Ki" })
})
