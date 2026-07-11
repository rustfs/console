import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("status page passes every normalized admin info state into infrastructure health", () => {
  const source = fs.readFileSync("app/(dashboard)/status/page.tsx", "utf8")

  assert.match(source, /summarizeServerStates\(systemInfo\.servers\)/)
  assert.match(source, /unknownServers=\{serverSummary\?\.unknown\}/)
  assert.match(source, /degradedServers=\{serverSummary\?\.degraded\}/)
  assert.match(source, /initializingServers=\{serverSummary\?\.initializing\}/)
  assert.match(source, /unknownDisks=\{systemInfo\.backend\?\.unknownDisks\}/)
  assert.doesNotMatch(source, /unknownDisks=.*\?\? 0/)
})

test("performance infrastructure card renders unknown, degraded, and initializing buckets without invented zeroes", () => {
  const source = fs.readFileSync("app/(dashboard)/_components/performance-infrastructure-card.tsx", "utf8")

  assert.match(source, /unknownServers\?: number/)
  assert.match(source, /degradedServers\?: number/)
  assert.match(source, /initializingServers\?: number/)
  assert.match(source, /unknownDisks\?: number/)
  assert.match(source, /\{t\("Unknown"\)\}/)
  assert.match(source, /\{t\("Degraded"\)\}/)
  assert.match(source, /\{t\("Initializing"\)\}/)
  assert.match(source, /value \?\? unavailableLabel/)
})

test("performance server list treats every health state as a first-class filter", () => {
  const source = fs.readFileSync("app/(dashboard)/_components/performance-server-list.tsx", "utf8")

  assert.match(
    source,
    /const filterOrder: ServerHealthState\[\] = \["offline", "degraded", "initializing", "unknown", "online"\]/,
  )
  assert.match(source, /normalizeServerHealthState\(server\.state\) === filterBy/)
  assert.match(source, /getStatePriority\(normalizeServerHealthState\(left\.server\.state\)\)/)
  assert.match(source, /<Badge variant=\{getStateVariant\(state\)\}>\{getStateLabel\(state, t\)\}<\/Badge>/)
  assert.match(source, /aria-pressed=\{selected\}/)
  assert.doesNotMatch(source, /!isOnlineServer\(server\)/)
})
