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

test("normalizePoolsOverview reads pool list decommissionInfo capacities", () => {
  const overview = normalizePoolsOverview([
    {
      id: 0,
      cmdline: "http://172.30.0.{11...14}:9000/data/disk{1...2}",
      lastUpdate: "2026-05-09T01:06:58.577822385Z",
      decommissionInfo: {
        startTime: null,
        startSize: 0,
        totalSize: 980428783616,
        currentSize: 55435714560,
        complete: false,
        failed: false,
        canceled: false,
        objectsDecommissioned: 0,
        objectsDecommissionedFailed: 0,
        bytesDecommissioned: 0,
        bytesDecommissionedFailed: 0,
      },
    },
    {
      id: 1,
      cmdline: "http://172.30.0.{15...18}:9000/data/disk{1...2}",
      lastUpdate: "2026-05-09T01:06:58.577822801Z",
      decommissionInfo: {
        startTime: null,
        startSize: 0,
        totalSize: 980428783616,
        currentSize: 55434608640,
        complete: false,
        failed: false,
        canceled: false,
        objectsDecommissioned: 0,
        objectsDecommissionedFailed: 0,
        bytesDecommissioned: 0,
        bytesDecommissionedFailed: 0,
      },
    },
  ])

  assert.equal(overview.poolCount, 2)
  assert.equal(overview.totalCapacity, 1960857567232)
  assert.equal(overview.totalUsedCapacity, 110870323200)
  assert.equal(overview.pools[0]?.name, "http://172.30.0.{11...14}:9000/data/disk{1...2}")
  assert.equal(overview.pools[0]?.used, 55435714560)
})

test("normalizePoolsOverview preserves detailed pool list fields", () => {
  const overview = normalizePoolsOverview([
    {
      id: 0,
      cmdline: "http://rustfs-node{1...32}:9000/data/rustfs{1...4}/mnmd",
      lastUpdate: "2026-05-09T04:29:55.213860104Z",
      totalSize: 5147518304256,
      currentSize: 5014093479936,
      usedSize: 133424824320,
      used: 0.02592022338408851,
      status: "active",
      decommissionInfo: {
        startTime: null,
        startSize: 0,
        totalSize: 5147518304256,
        currentSize: 5014093479936,
        complete: false,
        failed: false,
        canceled: false,
        objectsDecommissioned: 3,
        objectsDecommissionedFailed: 1,
        bytesDecommissioned: 2048,
        bytesDecommissionedFailed: 512,
      },
    },
  ])

  const pool = overview.pools[0]

  assert.equal(overview.totalUsedCapacity, 133424824320)
  assert.equal(pool?.used, 133424824320)
  assert.equal(pool?.currentSize, 5014093479936)
  assert.equal(pool?.usagePercent, 2.592022338408851)
  assert.equal(pool?.lastUpdate, "2026-05-09T04:29:55.213860104Z")
  assert.equal(pool?.decommission.complete, false)
  assert.equal(pool?.decommission.objects, 3)
  assert.equal(pool?.decommission.objectsFailed, 1)
  assert.equal(pool?.decommission.bytes, 2048)
  assert.equal(pool?.decommission.bytesFailed, 512)
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

test("normalizeRebalanceStatus derives status from pool-only response", () => {
  const status = normalizeRebalanceStatus({
    id: "3be0831f-4315-4adb-9904-3bb0609b3bfc",
    pools: [
      {
        id: 0,
        status: "Completed",
        used: 0.9357573544019193,
        lastError: null,
        progress: {
          objects: 0,
          versions: 0,
          bytes: 0,
          remainingBuckets: 0,
          bucket: "",
          object: "",
          elapsed: 0,
          eta: 0,
        },
      },
      {
        id: 1,
        status: "None",
        used: 0.9357573544019193,
        lastError: null,
        progress: null,
      },
    ],
    stoppedAt: null,
  })

  assert.equal(status.status, "completed")
  assert.equal(status.progressPercent, 100)
  assert.equal(status.pools[0]?.status, "Completed")
  assert.equal(status.pools[1]?.status, "None")
  assert.equal(deriveRebalanceDisplayState(status, "supported"), "completed")
})

test("normalizeRebalanceStatus aggregates pool progress when totals are missing", () => {
  const status = normalizeRebalanceStatus({
    id: "reb-2",
    pools: [
      {
        id: 0,
        status: "Running",
        progress: {
          objects: 4,
          versions: 2,
          bytes: 128,
          elapsed: 10,
          eta: 40,
        },
      },
      {
        id: 1,
        status: "Running",
        progress: {
          objects: 6,
          versions: 3,
          bytes: 256,
          elapsed: 15,
          eta: 20,
        },
      },
    ],
  })

  assert.equal(status.totals.bytes, 384)
  assert.equal(status.totals.objects, 10)
  assert.equal(status.totals.versions, 5)
  assert.equal(status.totals.elapsed, 15)
  assert.equal(status.totals.eta, 40)
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
