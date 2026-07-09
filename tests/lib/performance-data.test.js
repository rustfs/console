import test from "node:test"
import assert from "node:assert/strict"

import { normalizeServerHealthState, normalizeStorageInfo, normalizeSystemInfo } from "../../lib/performance-data.ts"

test("normalizeServerHealthState preserves backend admin info states", () => {
  assert.equal(normalizeServerHealthState("online"), "online")
  assert.equal(normalizeServerHealthState("offline"), "offline")
  assert.equal(normalizeServerHealthState("unknown"), "unknown")
  assert.equal(normalizeServerHealthState("degraded"), "degraded")
  assert.equal(normalizeServerHealthState(" Degraded "), "degraded")
  assert.equal(normalizeServerHealthState("initializing"), "unknown")
  assert.equal(normalizeServerHealthState(undefined), "unknown")
})

test("normalizeSystemInfo preserves legacy unwrapped info responses", () => {
  const info = normalizeSystemInfo({
    buckets: { count: 2 },
    objects: { count: 40 },
    backend: {
      backendType: "Erasure",
      onlineDisks: 8,
      offlineDisks: 1,
      unknownDisks: 1,
    },
    servers: [
      { endpoint: "node-a", state: "online" },
      { endpoint: "node-b", state: "unknown" },
      { endpoint: "node-c", state: "degraded" },
    ],
  })

  assert.equal(info.buckets?.count, 2)
  assert.equal(info.objects?.count, 40)
  assert.equal(info.backend?.backendType, "Erasure")
  assert.equal(info.backend?.onlineDisks, 8)
  assert.equal(info.backend?.offlineDisks, 1)
  assert.equal(info.backend?.unknownDisks, 1)
  assert.equal(info.servers?.[0]?.endpoint, "node-a")
  assert.equal(info.servers?.[1]?.state, "unknown")
  assert.equal(info.servers?.[2]?.state, "degraded")
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
        unknownDisks: 1,
      },
      servers: [
        { endpoint: "rustfs-node7", state: "online", drives: [{ state: "ok" }] },
        { endpoint: "10.0.0.9:19000", state: "offline", drives: [] },
        { endpoint: "rustfs-node8", state: "degraded", drives: [{ state: "ok" }] },
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
  assert.equal(info.backend?.unknownDisks, 1)
  assert.equal(info.servers?.length, 3)
  assert.equal(info.servers?.[2]?.state, "degraded")
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
