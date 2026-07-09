import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("status page passes unknown and degraded admin info states into infrastructure health", () => {
  const source = fs.readFileSync("app/(dashboard)/status/page.tsx", "utf8")

  assert.match(source, /normalizeServerHealthState\(server\.state\)/)
  assert.match(source, /unknownServers=\{serverCounts\.unknown\}/)
  assert.match(source, /degradedServers=\{serverCounts\.degraded\}/)
  assert.match(source, /unknownDisks=\{systemInfo\?\.backend\?\.unknownDisks \?\? 0\}/)
})

test("performance infrastructure card renders unknown and degraded buckets", () => {
  const source = fs.readFileSync("app/(dashboard)/_components/performance-infrastructure-card.tsx", "utf8")

  assert.match(source, /unknownServers: number/)
  assert.match(source, /degradedServers: number/)
  assert.match(source, /unknownDisks: number/)
  assert.match(source, /\{t\("Unknown"\)\}/)
  assert.match(source, /\{t\("Degraded"\)\}/)
})

test("performance server list treats unknown and degraded as first-class filters", () => {
  const source = fs.readFileSync("app/(dashboard)/_components/performance-server-list.tsx", "utf8")

  assert.match(source, /const serverStates: ServerHealthState\[\] = \["online", "offline", "unknown", "degraded"\]/)
  assert.match(source, /getServerState\(server\) === filterBy/)
  assert.match(source, /status-unknown/)
  assert.match(source, /status-degraded/)
  assert.match(source, /getServerStateTone\(getServerState\(server\)\)/)
  assert.doesNotMatch(source, /!isOnlineServer\(server\)/)
})
