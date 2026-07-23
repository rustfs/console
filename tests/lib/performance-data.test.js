import test from "node:test"
import assert from "node:assert/strict"

import {
  buildRunningStatusView,
  formatRelativeTime,
  normalizeClusterDiagnostics,
  normalizeDataUsageInfo,
  normalizeMetricsInfo,
  normalizeStorageInfo,
  normalizeSystemInfo,
  resolveServerHealth,
  resolveUsageFreshness,
  summarizeServerStates,
} from "../../lib/performance-data.ts"

const reporterV3Payload = {
  info: {
    backend: {
      backendType: "Erasure",
      onlineDisks: 3,
      offlineDisks: 0,
      unknownDisks: 0,
      totalDrivesPerSet: [4],
    },
    servers: [1, 2, 3].map((index) => ({
      endpoint: `rustfs-${index}.storage.swarm.private`,
      state: "online",
      drives: [{ state: "ok" }],
    })),
  },
  admin_discovery: {
    clusterSnapshot: "/rustfs/admin/v4/cluster/snapshot",
  },
}

const reporterV4Payload = {
  snapshot: {
    membership: {
      nodes: [1, 2, 3, 4].map((index) => ({
        node_id: `rustfs-${index}.storage.swarm.private:9000`,
        grid_host: `http://rustfs-${index}.storage.swarm.private:9000`,
      })),
      drives: [1, 2, 3, 4].map((index) => ({
        pool_index: 0,
        set_index: 0,
        disk_index: index - 1,
        node_id: `rustfs-${index}.storage.swarm.private:9000`,
      })),
    },
    pool_state: {
      pools: [{ pool_index: 0, set_count: 1, drives_per_set: 4, endpoint_count: 4 }],
    },
    peer_health: {
      peers: [1, 2, 3, 4].map((index) => ({
        node_id: `rustfs-${index}.storage.swarm.private:9000`,
        status: { state: "unknown", reason: "peer health not reported by endpoints" },
      })),
    },
  },
}

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
  assert.equal(info.adminDiscovery?.clusterSnapshot, "/rustfs/admin/v4/cluster/snapshot")
})

test("normalizeSystemInfo rejects unsafe cluster snapshot discovery paths", () => {
  assert.equal(
    normalizeSystemInfo({ info: { servers: [] }, admin_discovery: { clusterSnapshot: "https://example.com/snapshot" } })
      .adminDiscovery,
    undefined,
  )
  assert.equal(
    normalizeSystemInfo({ info: { servers: [] }, admin_discovery: { clusterSnapshot: "//example.com/snapshot" } })
      .adminDiscovery,
    undefined,
  )
  assert.equal(
    normalizeSystemInfo({ info: { servers: [] }, admin_discovery: { clusterSnapshot: "/\\evil.example/snapshot" } })
      .adminDiscovery,
    undefined,
  )
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

test("normalizeClusterDiagnostics separates peer, storage, usage, and listing status", () => {
  const diagnostics = normalizeClusterDiagnostics({
    snapshot: {
      membership: {
        nodes: [
          { node_id: "node-a", grid_host: "10.0.0.1:9000" },
          { node_id: "node-b", grid_host: "10.0.0.2:9000" },
        ],
      },
      peer_health: {
        peers: [
          { node_id: "node-a", status: { state: "supported" } },
          { node_id: "node-b", status: { state: "unknown", reason: "peer health not reported" } },
        ],
      },
      runtime_status: {
        state: "degraded",
        storage_ready: true,
        degraded_reasons: ["peer_health_unavailable"],
      },
      usage_freshness: {
        state: "stale",
        reason: "refresh timed out",
        last_successful_update: "2026-07-21T08:00:00Z",
      },
      listing: {
        state: "degraded",
        reason: "metacache quorum timeout",
        last_error: "timeout",
        scope: { bucket: "archive", prefix: "2026/", set: 2, timeout_ms: 5000 },
      },
    },
  })

  assert.equal(diagnostics?.peerHealth.state, "unknown")
  assert.equal(diagnostics?.storageReadiness.state, "healthy")
  assert.equal(diagnostics?.usageFreshness.state, "stale")
  assert.equal(diagnostics?.usageFreshness.lastSuccessfulUpdate, "2026-07-21T08:00:00Z")
  assert.equal(diagnostics?.listingHealth.state, "degraded")
  assert.deepEqual(diagnostics?.listingHealth.scope, {
    bucket: "archive",
    prefix: "2026/",
    set: "2",
    timeout: "5000 ms",
  })
})

test("normalizeClusterDiagnostics follows the backend component condition contract", () => {
  const diagnostics = normalizeClusterDiagnostics({
    snapshot: {
      components: {
        storage: {
          source: "runtime",
          condition: "degraded",
          status: { state: "unknown", reason: "one storage set is unavailable" },
        },
        peer_health: {
          source: "peer-health",
          condition: "not_reported",
          status: { state: "disabled", reason: "peer telemetry is disabled" },
        },
        listing: {
          source: "metacache",
          condition: "healthy",
          status: { state: "supported", reason: "foreground read admission is open" },
          internode_stall_timeouts_total: 2,
          hint: "inspect operation-labelled walk_dir metrics",
        },
        usage: {
          source: "usage-cache",
          condition: "stale",
          status: { state: "unknown", reason: "usage refresh is overdue" },
          last_success_unix_secs: 1_700_000_000,
          last_error: "refresh timed out",
        },
        workload_admission: {
          source: "admission",
          condition: "unknown",
          status: { state: "unknown", reason: "admission telemetry unavailable" },
        },
      },
    },
  })

  assert.equal(diagnostics?.storageReadiness.state, "degraded")
  assert.equal(diagnostics?.peerHealth.state, "not_reported")
  assert.equal(diagnostics?.listingHealth.state, "healthy")
  assert.equal(diagnostics?.listingHealth.historicalStallTimeouts, 2)
  assert.equal(diagnostics?.listingHealth.hint, "inspect operation-labelled walk_dir metrics")
  assert.equal(diagnostics?.usageFreshness.state, "stale")
  assert.equal(diagnostics?.usageFreshness.lastSuccessfulUpdate, "2023-11-14T22:13:20.000Z")
  assert.equal(diagnostics?.usageFreshness.lastError, "refresh timed out")
  assert.equal(diagnostics?.workloadAdmission.state, "unknown")
})

test("old snapshots report omitted diagnostic components as not reported", () => {
  const diagnostics = normalizeClusterDiagnostics({ snapshot: { runtime_status: {} } })

  assert.equal(diagnostics?.peerHealth.state, "not_reported")
  assert.equal(diagnostics?.storageReadiness.state, "not_reported")
  assert.equal(diagnostics?.usageFreshness.state, "not_reported")
  assert.equal(diagnostics?.listingHealth.state, "not_reported")
  assert.equal(diagnostics?.workloadAdmission.state, "not_reported")
})

test("normalizeClusterDiagnostics preserves a fully healthy component combination", () => {
  const diagnostics = normalizeClusterDiagnostics({
    snapshot: {
      peer_health: { peers: [{ node_id: "node-a", status: { state: "online" } }] },
      runtime_status: { storage_ready: true },
      usage_cache: { state: "fresh" },
      metacache: { state: "healthy" },
    },
  })

  assert.equal(diagnostics?.peerHealth.state, "healthy")
  assert.equal(diagnostics?.storageReadiness.state, "healthy")
  assert.equal(diagnostics?.usageFreshness.state, "healthy")
  assert.equal(diagnostics?.listingHealth.state, "healthy")
})

test("peer health unknown replaces only a false legacy degraded node", () => {
  const diagnostics = normalizeClusterDiagnostics({
    snapshot: {
      membership: {
        nodes: [
          { node_id: "node-a", grid_host: "10.0.0.1:9000" },
          { node_id: "node-b", grid_host: "10.0.0.2:9000" },
        ],
      },
      peer_health: {
        peers: [
          { node_id: "node-a", status: { state: "unknown", reason: "not reported" } },
          { node_id: "node-b", status: { state: "unknown", reason: "not reported" } },
        ],
      },
      runtime_status: { storage_ready: true },
    },
  })

  const healthyLegacyNode = {
    endpoint: "10.0.0.1:9000",
    state: "online",
    drives: [{ state: "ok" }],
  }
  const falseDegradedNode = {
    endpoint: "http://10.0.0.2:9000",
    state: "degraded",
    drives: [{ state: "ok" }],
  }

  assert.equal(resolveServerHealth(healthyLegacyNode, diagnostics).state, "online")
  assert.equal(resolveServerHealth(falseDegradedNode, diagnostics).state, "unknown")
  assert.equal(resolveServerHealth(falseDegradedNode, diagnostics).reason, "not reported")
  assert.deepEqual(summarizeServerStates([healthyLegacyNode, falseDegradedNode], diagnostics), {
    online: 1,
    offline: 0,
    degraded: 0,
    initializing: 0,
    unknown: 1,
  })
})

test("a real peer failure remains an exact degraded node while usage timeout stays separate", () => {
  const diagnostics = normalizeClusterDiagnostics({
    snapshot: {
      membership: { nodes: [{ node_id: "node-b", grid_host: "10.0.0.2:9000" }] },
      peer_health: {
        peers: [{ node_id: "node-b", status: { state: "failed", reason: "peer unreachable" } }],
      },
      runtime_status: { storage_ready: true },
      usage_cache: { state: "stale", reason: "refresh timeout" },
    },
  })

  const node = { endpoint: "10.0.0.2:9000", state: "online", drives: [{ state: "ok" }] }
  assert.deepEqual(resolveServerHealth(node, diagnostics), {
    state: "degraded",
    reason: "peer unreachable",
    source: "peer",
  })
  assert.equal(diagnostics?.usageFreshness.state, "stale")
})

test("usage refresh failures mark retained data stale without changing cluster diagnostics", () => {
  const lastUpdatedAt = new Date("2026-07-21T08:00:00Z")
  assert.deepEqual(
    resolveUsageFreshness(undefined, {
      hasData: true,
      error: "request timeout",
      lastUpdatedAt,
    }),
    {
      state: "stale",
      reason: "request timeout",
      lastSuccessfulUpdate: "2026-07-21T08:00:00.000Z",
    },
  )
  assert.equal(resolveUsageFreshness(undefined, { hasData: true }).state, "unknown")
})

test("the #5070 compatibility shape preserves 3 online servers and 48 online disks without a false degraded node", () => {
  const system = normalizeSystemInfo({
    info: {
      backend: { onlineDisks: 48, offlineDisks: 0 },
      servers: [
        { endpoint: "node-1:9000", state: "online", drives: [{ state: "ok" }] },
        { endpoint: "node-2:9000", state: "online", drives: [{ state: "ok" }] },
        { endpoint: "node-3:9000", state: "online", drives: [{ state: "ok" }] },
        { endpoint: "node-4:9000", state: "degraded", drives: [{ state: "ok" }] },
      ],
    },
  })
  const diagnostics = normalizeClusterDiagnostics({
    snapshot: {
      membership: { nodes: [{ node_id: "node-4", grid_host: "node-4:9000" }] },
      peer_health: {
        peers: [{ node_id: "node-4", status: { state: "unknown", reason: "peer health not reported" } }],
      },
      runtime_status: { storage_ready: true },
    },
  })

  assert.equal(system.backend?.onlineDisks, 48)
  assert.equal(system.backend?.offlineDisks, 0)
  assert.deepEqual(summarizeServerStates(system.servers, diagnostics), {
    online: 3,
    offline: 0,
    degraded: 0,
    initializing: 0,
    unknown: 1,
  })
  assert.equal(
    resolveUsageFreshness(diagnostics?.usageFreshness, { hasData: false, error: "usage unavailable" }).state,
    "not_reported",
  )
})

test("the #1429 reporter payload uses v4 membership without duplicating v3 rows", () => {
  const system = normalizeSystemInfo(reporterV3Payload)
  const diagnostics = normalizeClusterDiagnostics(reporterV4Payload)
  const view = buildRunningStatusView(system, diagnostics)

  assert.equal(system.backend?.totalDrivesPerSet?.[0], 4)
  assert.equal(diagnostics?.topologyDrives.length, 4)
  assert.equal(view.servers?.length, 4)
  assert.deepEqual(
    view.servers?.map((server) => server.endpoint),
    [
      "rustfs-1.storage.swarm.private",
      "rustfs-2.storage.swarm.private",
      "rustfs-3.storage.swarm.private",
      "http://rustfs-4.storage.swarm.private:9000",
    ],
  )
  assert.deepEqual(view.serverSummary, {
    online: 3,
    offline: 0,
    degraded: 0,
    initializing: 0,
    unknown: 1,
  })
  assert.deepEqual(view.topology, {
    source: "v4",
    expectedServers: 4,
    reportedServers: 3,
    expectedDrives: 4,
    reportedDrives: 3,
    unreportedServers: 1,
    unreportedDrives: 1,
    incomplete: true,
  })
})

test("a v3-only incomplete drive denominator is unknown without inventing a server denominator", () => {
  const view = buildRunningStatusView(normalizeSystemInfo(reporterV3Payload))

  assert.equal(view.servers?.length, 3)
  assert.equal(view.topology.source, "v3")
  assert.equal(view.topology.expectedServers, undefined)
  assert.equal(view.topology.reportedServers, 3)
  assert.equal(view.topology.expectedDrives, 4)
  assert.equal(view.topology.reportedDrives, 3)
  assert.equal(view.topology.unreportedDrives, 1)
  assert.equal(view.topology.incomplete, true)
})

test("a fixed v3 unknown row remains visible without uptime, version, drives, or network", () => {
  const payload = structuredClone(reporterV3Payload)
  payload.info.servers.push({ endpoint: "rustfs-4.storage.swarm.private", state: "unknown" })
  payload.info.backend.unknownDisks = 1

  const view = buildRunningStatusView(normalizeSystemInfo(payload))

  assert.equal(view.servers?.length, 4)
  assert.deepEqual(view.serverSummary, {
    online: 3,
    offline: 0,
    degraded: 0,
    initializing: 0,
    unknown: 1,
  })
  assert.equal(view.topology.reportedDrives, 4)
  assert.equal(view.topology.unreportedDrives, 0)
  assert.equal(view.topology.incomplete, false)
})

test("older v3 responses without topology or unknown disks keep an indeterminate denominator", () => {
  const view = buildRunningStatusView(
    normalizeSystemInfo({
      backend: { onlineDisks: 2, offlineDisks: 0 },
      servers: [{ endpoint: "node-a", state: "online" }],
    }),
  )

  assert.equal(view.topology.source, "reported")
  assert.equal(view.topology.expectedDrives, undefined)
  assert.equal(view.topology.reportedDrives, 2)
  assert.equal(view.topology.incomplete, false)
})
