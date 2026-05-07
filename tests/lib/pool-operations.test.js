import test from "node:test"
import assert from "node:assert/strict"
import {
  deriveDecommissionDisplayState,
  deriveRebalanceDisplayState,
  normalizeDecommissionInfo,
  normalizePoolsOverview,
  normalizeRebalanceStatus,
} from "../../lib/pool-operations.ts"

test("normalizePoolsOverview computes support and capacities", () => {
  const overview = normalizePoolsOverview({
    pools: [
      { id: 1, capacity: "100", used: "40", status: "online" },
      { id: 2, capacity: 200, used: 50, status: "online" },
    ],
  })

  assert.equal(overview.poolCount, 2)
  assert.equal(overview.totalCapacity, 300)
  assert.equal(overview.totalUsedCapacity, 90)
  assert.equal(overview.supportState, "supported")
})

test("normalizeRebalanceStatus reads progress and pool details", () => {
  const status = normalizeRebalanceStatus({
    id: "reb-1",
    status: "running",
    progress: { bytes: "1000", objects: "10", versions: "3", eta: "12", elapsed: "6" },
    pools: [{ id: 1, used: "20", progress: { bytes: "400" } }],
  })

  assert.equal(status.id, "reb-1")
  assert.equal(status.progressPercent, 40)
  assert.equal(status.pools[0]?.progress.bytes, 400)
})

test("normalizeDecommissionInfo reads nested response", () => {
  const info = normalizeDecommissionInfo({
    decommissionInfo: {
      pool: "2",
      complete: false,
      failed: false,
      canceled: false,
      bytes: "128",
      objects: "8",
      currentSize: "1024",
      status: "running",
    },
  })

  assert.equal(info.poolId, "2")
  assert.equal(info.bytes, 128)
  assert.equal(info.status, "running")
})

test("derive states enforce rebalance before decommission", () => {
  const rebalanceState = deriveRebalanceDisplayState(normalizeRebalanceStatus({ status: "failed" }), "supported")
  const decommissionState = deriveDecommissionDisplayState(null, "supported", rebalanceState, false)

  assert.equal(rebalanceState, "failed")
  assert.equal(decommissionState, "blocked-by-rebalance")
})
