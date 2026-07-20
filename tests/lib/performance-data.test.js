import test from "node:test"
import assert from "node:assert/strict"

import {
  formatRelativeTime,
  normalizeDataUsageInfo,
  normalizeMetricsInfo,
  normalizeStorageInfo,
  normalizeSystemInfo,
  summarizeServerStates,
} from "../../lib/performance-data.ts"

test("normalizeSystemInfo preserves legacy unwrapped info responses", () => {
  const info = normalizeSystemInfo({
    buckets: { count: 2 },
    objects: { count: 40 },
    backend: {
      backendType: "Erasure",
      onlineDisks: 8,
      offlineDisks: 1,
    },
    servers: [{ endpoint: "node-a", state: "online" }],
  })

  assert.equal(info.buckets?.count, 2)
  assert.equal(info.objects?.count, 40)
  assert.equal(info.backend?.backendType, "Erasure")
  assert.equal(info.backend?.onlineDisks, 8)
  assert.equal(info.backend?.offlineDisks, 1)
  assert.equal(info.servers?.[0]?.endpoint, "node-a")
})

test("normalizeSystemInfo unwraps RustFS admin discovery info responses", () => {
  const info = normalizeSystemInfo({
    info: {
      buckets: { count: 1, error: null },
      objects: { count: 2560, error: null },
      backend: {
        backendType: "Erasure",
        onlineDisks: 12,
        offlineDisks: 0,
      },
      servers: [
        { endpoint: "rustfs-node7", state: "online", drives: [{ state: "ok" }] },
        { endpoint: "10.0.0.9:19000", state: "offline", drives: [] },
      ],
    },
    admin_discovery: {
      runtimeCapabilities: "/rustfs/admin/v4/runtime/capabilities",
      clusterSnapshot: "/rustfs/admin/v4/cluster/snapshot",
      extensionsCatalog: "/rustfs/admin/v4/extensions/catalog",
    },
  })

  assert.equal(info.buckets?.count, 1)
  assert.equal(info.objects?.count, 2560)
  assert.equal(info.backend?.onlineDisks, 12)
  assert.equal(info.backend?.offlineDisks, 0)
  assert.equal(info.servers?.length, 2)
})

test("normalizeStorageInfo unwraps RustFS admin discovery storage responses", () => {
  const storage = normalizeStorageInfo({
    info: {
      backend: {
        BackendType: "Erasure",
        StandardSCParity: 4,
        RRSCParity: 1,
      },
    },
    admin_discovery: {
      runtimeCapabilities: "/rustfs/admin/v4/runtime/capabilities",
      clusterSnapshot: "/rustfs/admin/v4/cluster/snapshot",
      extensionsCatalog: "/rustfs/admin/v4/extensions/catalog",
    },
  })

  assert.equal(storage.backend?.BackendType, "Erasure")
  assert.equal(storage.backend?.StandardSCParity, 4)
  assert.equal(storage.backend?.RRSCParity, 1)
})

test("normalizeSystemInfo preserves unknown disks and all server health states", () => {
  const info = normalizeSystemInfo({
    info: {
      backend: { onlineDisks: 8, offlineDisks: 1, unknownDisks: 2 },
      servers: [
        { endpoint: "online", state: "ONLINE", uptime: "42" },
        { endpoint: "offline", state: "offline" },
        { endpoint: "degraded", state: "degraded" },
        { endpoint: "initializing", state: "initializing" },
        { endpoint: "unknown", state: "unexpected" },
      ],
    },
  })

  assert.equal(info.backend?.unknownDisks, 2)
  assert.equal(info.servers?.[0]?.state, "online")
  assert.equal(info.servers?.[0]?.uptime, 42)
  assert.deepEqual(summarizeServerStates(info.servers), {
    online: 1,
    offline: 1,
    degraded: 1,
    initializing: 1,
    unknown: 1,
  })
})

test("normalizeSystemInfo does not present failed inventory counts as real zeroes", () => {
  const info = normalizeSystemInfo({
    buckets: { count: 0, error: "permission denied" },
    objects: { count: 0 },
  })

  assert.equal(info.buckets, undefined)
  assert.equal(info.objects?.count, 0)
})

test("normalizeSystemInfo preserves an unavailable server list instead of inventing an empty cluster", () => {
  assert.deepEqual(normalizeSystemInfo({}), {})
  assert.deepEqual(normalizeStorageInfo({}), {})
})

test("normalizeDataUsageInfo keeps real zero values distinct from unavailable data", () => {
  assert.deepEqual(normalizeDataUsageInfo({ total_capacity: "0", total_free_capacity: 0, total_used_capacity: 0 }), {
    total_capacity: 0,
    total_free_capacity: 0,
    total_used_capacity: 0,
  })
  assert.deepEqual(normalizeDataUsageInfo(undefined), {})
  assert.deepEqual(normalizeDataUsageInfo({ total_capacity: "invalid" }), {})
  assert.deepEqual(normalizeDataUsageInfo({ total_capacity: -1, total_used_capacity: -2 }), {})
})

test("normalizeDataUsageInfo preserves backend usable capacity fields without deriving free capacity", () => {
  assert.deepEqual(
    normalizeDataUsageInfo({
      info: {
        TotalCapacity: 100,
        totalFreeCapacity: 30,
        TotalUsedCapacity: 60,
      },
    }),
    {
      total_capacity: 100,
      total_free_capacity: 30,
      total_used_capacity: 60,
    },
  )

  assert.deepEqual(normalizeDataUsageInfo({ total_capacity: 100, total_used_capacity: 60 }), {
    total_capacity: 100,
    total_used_capacity: 60,
  })
})

test("normalizeMetricsInfo rejects missing and invalid scanner timestamps", () => {
  assert.deepEqual(normalizeMetricsInfo({}), {})
  assert.deepEqual(
    normalizeMetricsInfo({
      aggregated: {
        scanner: {
          current_cycle: 0,
          current_started: "not-a-date",
          cycle_complete_times: ["not-a-date", "2026-07-10T08:00:00Z"],
        },
      },
    }),
    {
      aggregated: {
        scanner: {
          current_cycle: 0,
          cycle_complete_times: ["2026-07-10T08:00:00Z"],
        },
      },
    },
  )
})

test("normalizeMetricsInfo keeps the scanner cycle state for active and idle displays", () => {
  assert.equal(
    normalizeMetricsInfo({ aggregated: { scanner: { current_cycle: 3 } } }).aggregated?.scanner?.current_cycle,
    3,
  )
  assert.equal(
    normalizeMetricsInfo({ aggregated: { scanner: { current_cycle: 0 } } }).aggregated?.scanner?.current_cycle,
    0,
  )
})

test("formatRelativeTime follows the active locale and advances with the clock", () => {
  const timestamp = "2026-07-10T08:00:00Z"
  assert.equal(formatRelativeTime(timestamp, "en-US", Date.parse("2026-07-10T10:00:00Z")), "2 hours ago")
  assert.equal(formatRelativeTime(timestamp, "en-US", Date.parse("2026-07-10T11:00:00Z")), "3 hours ago")
  assert.equal(formatRelativeTime("invalid", "en-US"), undefined)
})
