import assert from "node:assert/strict"
import test from "node:test"

const loadHealth = () => import(new URL("../../lib/site-replication-health.ts", import.meta.url).href)

const LOCAL = "dep-local"
const PEER = "dep-peer"

function volume(count = 0) {
  return { count, bytes: count * 1024 }
}

function metric(deploymentId: string, overrides: Record<string, unknown> = {}) {
  return {
    deploymentId,
    endpoint: `http://${deploymentId}:9000`,
    totalDowntimeNs: 0,
    lastOnline: "2026-10-23T10:00:00Z",
    online: true,
    replicatedSize: 0,
    replicatedCount: 0,
    failed: { lastMinute: volume(), lastHour: volume(), totals: volume() },
    ...overrides,
  }
}

function info(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    name: "site-local",
    sites: [
      { deploymentId: LOCAL, name: "site-local", endpoint: "http://local:9000" },
      { deploymentId: PEER, name: "site-peer", endpoint: "http://peer:9000" },
    ],
    serviceAccountAccessKey: "site-replicator-0",
    ...overrides,
  }
}

function status(overrides: Record<string, unknown> = {}, metrics?: Record<string, unknown>) {
  return {
    enabled: true,
    peerErrors: {},
    metrics: {
      activeWorkers: { curr: 0, avg: 0, max: 0 },
      replicaSize: 0,
      replicaCount: 0,
      queued: { curr: volume(), avg: volume(), max: volume() },
      metrics: metrics ?? { [LOCAL]: metric(LOCAL), [PEER]: metric(PEER) },
    },
    bucketStats: {},
    policyStats: {},
    userSites: {},
    groupSites: {},
    ilmExpiryRuleSites: {},
    ...overrides,
  }
}

async function assess(input: { info?: unknown; status?: unknown; localDeploymentId?: string }) {
  const { assessSiteReplicationHealth } = await loadHealth()
  return assessSiteReplicationHealth({
    info: "info" in input ? input.info : info(),
    status: "status" in input ? input.status : status(),
    localDeploymentId: input.localDeploymentId ?? LOCAL,
  })
}

test("a reachable group with nothing outstanding is healthy", async () => {
  const health = await assess({})

  assert.equal(health.level, "healthy")
  assert.deepEqual(health.issues, [])
  assert.deepEqual(health.drift, [])
  assert.equal(health.connections[PEER].state, "online")
})

test("an offline peer is critical and keeps its last-online time and downtime", async () => {
  const offline = metric(PEER, { online: false, totalDowntimeNs: 90e9, lastOnline: "2026-10-23T09:58:30Z" })
  const health = await assess({ status: status({}, { [LOCAL]: metric(LOCAL), [PEER]: offline }) })

  assert.equal(health.level, "critical")
  assert.deepEqual(health.connections[PEER], {
    state: "offline",
    lastOnline: "2026-10-23T09:58:30Z",
    downtimeNs: 90e9,
    error: undefined,
  })
  assert.deepEqual(health.issues, [{ kind: "peer-offline", deploymentId: PEER, error: undefined }])
})

test("a peer whose metainfo fetch failed is offline with the reported error", async () => {
  const peerErrors = { [PEER]: { name: "site-peer", endpoint: "http://peer:9000", error: "connection refused" } }
  const health = await assess({ status: status({ peerErrors }, { [LOCAL]: metric(LOCAL) }) })

  assert.equal(health.connections[PEER].state, "offline")
  assert.equal(health.connections[PEER].error, "connection refused")
  assert.equal(health.level, "critical")
})

test("an unreachable peer suppresses the drift comparison instead of flagging everything missing", async () => {
  const bucketStats = { photos: { [LOCAL]: { hasBucket: true }, [PEER]: { hasBucket: false } } }
  const offline = metric(PEER, { online: false })
  const health = await assess({ status: status({ bucketStats }, { [LOCAL]: metric(LOCAL), [PEER]: offline }) })

  assert.equal(health.drift, null)
  assert.ok(!health.issues.some((issue: { kind: string }) => issue.kind === "drift"))
})

test("peers without a metric entry on older servers are unknown, never reported healthy", async () => {
  const health = await assess({ status: status({}, { [LOCAL]: metric(LOCAL) }) })

  assert.equal(health.connections[PEER].state, "unknown")
  assert.equal(health.level, "unknown")
  assert.equal(health.drift, null)
})

test("an unfinished lifecycle operation degrades health", async () => {
  const pendingOperation = { operation: "remove", id: "op-1", pendingPeers: [PEER], ackedPeers: [] }
  const health = await assess({ status: status({ pendingOperation }) })

  assert.equal(health.level, "degraded")
  assert.deepEqual(health.issues, [{ kind: "pending-operation", operation: pendingOperation }])
})

test("failing peer deliveries degrade health while an empty retry queue does not", async () => {
  const failing = await assess({ status: status({ retryStats: { pending: 2, failed: 1, lastError: "timeout" } }) })
  const idle = await assess({ status: status({ retryStats: { pending: 0, failed: 0, lastError: "" } }) })

  assert.equal(failing.level, "degraded")
  assert.equal(failing.issues[0].kind, "retry-backlog")
  assert.equal(idle.level, "healthy")
})

test("object replication failures in the last hour degrade health but older ones do not", async () => {
  const recent = metric(LOCAL, { failed: { lastMinute: volume(), lastHour: volume(3), totals: volume(3) } })
  const old = metric(LOCAL, { failed: { lastMinute: volume(), lastHour: volume(), totals: volume(7) } })

  const recentHealth = await assess({ status: status({}, { [LOCAL]: recent, [PEER]: metric(PEER) }) })
  const oldHealth = await assess({ status: status({}, { [LOCAL]: old, [PEER]: metric(PEER) }) })

  assert.deepEqual(recentHealth.issues, [{ kind: "recent-failures", count: 3 }])
  assert.equal(oldHealth.level, "healthy")
})

test("drift lists missing and mismatched buckets, policies, and users per site", async () => {
  const bucketStats = {
    photos: {
      [LOCAL]: { hasBucket: true, policyMismatch: true, tagMismatch: false },
      [PEER]: { hasBucket: true, policyMismatch: true, tagMismatch: false },
    },
    logs: { [LOCAL]: { hasBucket: true } },
  }
  const policyStats = { readonly: { [LOCAL]: { hasPolicy: true, policyMismatch: true }, [PEER]: { hasPolicy: true } } }
  const userSites = { alice: [LOCAL, PEER], bob: [LOCAL] }

  const health = await assess({ status: status({ bucketStats, policyStats, userSites }) })

  assert.equal(health.level, "degraded")
  assert.deepEqual(health.drift, [
    { entity: "bucket", name: "photos", missingOn: [], mismatches: ["policy"] },
    { entity: "bucket", name: "logs", missingOn: [PEER], mismatches: [] },
    { entity: "policy", name: "readonly", missingOn: [], mismatches: ["content"] },
    { entity: "user", name: "bob", missingOn: [PEER], mismatches: [] },
  ])
  assert.deepEqual(health.issues, [{ kind: "drift", count: 4 }])
})

test("without the status endpoint the info payload still surfaces outstanding work", async () => {
  const pendingOperation = { operation: "remove", id: "op-1", pendingPeers: [PEER], ackedPeers: [] }
  const withoutWork = await assess({ status: null })
  const withWork = await assess({ status: null, info: info({ pendingOperation }) })

  assert.equal(withoutWork.level, "unknown")
  assert.equal(withWork.level, "degraded")
})

test("the local site is online even when its own metric entry is missing", async () => {
  const health = await assess({ status: status({}, { [PEER]: metric(PEER) }) })

  assert.equal(health.connections[LOCAL].state, "online")
  assert.equal(health.level, "healthy")
})
