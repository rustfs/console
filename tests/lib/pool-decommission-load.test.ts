import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { loadPoolDecommissionData } from "../../lib/pool-decommission-load"
import { normalizePoolsOverview } from "../../lib/pool-operations"

const singlePoolOverview = normalizePoolsOverview({ pools: [{ id: 1, status: "active" }] })
const multiPoolOverview = normalizePoolsOverview({
  pools: [
    { id: 1, status: "active" },
    { id: 2, status: "active" },
  ],
})

test("unsupported single-pool topology skips decommission status and loads as unsupported", async () => {
  let statusRequests = 0

  const result = await loadPoolDecommissionData({
    getPoolsOverview: async () => singlePoolOverview,
    getRebalanceStatus: async () => null,
    getDecommissionStatuses: async () => {
      statusRequests += 1
      throw new Error("501 Not Implemented")
    },
  })

  assert.equal(statusRequests, 0)
  assert.equal(result.overview.supportState, "unsupported")
  assert.deepEqual(result.decommissionStatuses, [])
})

test("supported multi-pool topology requests decommission status", async () => {
  let statusRequests = 0

  await loadPoolDecommissionData({
    getPoolsOverview: async () => multiPoolOverview,
    getRebalanceStatus: async () => null,
    getDecommissionStatuses: async () => {
      statusRequests += 1
      return []
    },
  })

  assert.equal(statusRequests, 1)
})

test("overview failure rejects before dependent status reads", async () => {
  let rebalanceRequests = 0
  let statusRequests = 0

  await assert.rejects(
    loadPoolDecommissionData({
      getPoolsOverview: async () => {
        throw new Error("overview unavailable")
      },
      getRebalanceStatus: async () => {
        rebalanceRequests += 1
        return null
      },
      getDecommissionStatuses: async () => {
        statusRequests += 1
        return []
      },
    }),
    /overview unavailable/,
  )
  assert.equal(rebalanceRequests, 0)
  assert.equal(statusRequests, 0)
})

test("supported topology rejects a decommission status failure", async () => {
  await assert.rejects(
    loadPoolDecommissionData({
      getPoolsOverview: async () => multiPoolOverview,
      getRebalanceStatus: async () => null,
      getDecommissionStatuses: async () => {
        throw new Error("status unavailable")
      },
    }),
    /status unavailable/,
  )
})

test("page source keeps unsupported data separate from locked load failures", () => {
  const source = fs.readFileSync("app/(dashboard)/pool-decommission/page.tsx", "utf8")

  assert.match(source, /\{error \? \([\s\S]*?<AlertTitle>\{t\("Load Failed"\)\}<\/AlertTitle>/)
  assert.match(
    source,
    /\{dataReady && overview\.supportState === "unsupported" \? \([\s\S]*?<AlertTitle>\{t\("Single pool decommission is not supported"\)\}<\/AlertTitle>/,
  )
  assert.match(source, /catch \(loadError\)[\s\S]*?setError\([\s\S]*?setDataReady\(false\)/)
  assert.match(
    source,
    /const interactionLocked =[\s\S]*?Boolean\(error\)[\s\S]*?Boolean\(rebalanceError\)[\s\S]*?!dataReady/,
  )
  assert.match(source, /overview\.supportState === "unsupported"[\s\S]*?t\("Unsupported"\)/)
})
