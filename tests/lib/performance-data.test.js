import test from "node:test"
import assert from "node:assert/strict"

import { normalizeStorageInfo, normalizeSystemInfo } from "../../lib/performance-data.ts"

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
