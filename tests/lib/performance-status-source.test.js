import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("status page passes every normalized admin info state into infrastructure health", () => {
  const source = fs.readFileSync("app/(dashboard)/status/page.tsx", "utf8")

  assert.match(source, /buildRunningStatusView\(systemInfo, diagnosticsInfo\)/)
  assert.match(source, /unknownServers=\{serverSummary\?\.unknown\}/)
  assert.match(source, /degradedServers=\{serverSummary\?\.degraded\}/)
  assert.match(source, /initializingServers=\{serverSummary\?\.initializing\}/)
  assert.match(source, /unknownDisks=\{systemInfo\.backend\?\.unknownDisks\}/)
  assert.match(source, /topology=\{runningStatus\.topology\}/)
  assert.doesNotMatch(source, /unknownDisks=.*\?\? 0/)
})

test("performance infrastructure card renders unknown, degraded, and initializing buckets without invented zeroes", () => {
  const source = fs.readFileSync("app/(dashboard)/_components/performance-infrastructure-card.tsx", "utf8")

  assert.match(source, /unknownServers\?: number/)
  assert.match(source, /degradedServers\?: number/)
  assert.match(source, /initializingServers\?: number/)
  assert.match(source, /unknownDisks\?: number/)
  assert.match(source, /topology: RunningStatusTopology/)
  assert.match(source, /peerHealth\?: StatusDiagnostic/)
  assert.match(source, /storageReadiness\?: StatusDiagnostic/)
  assert.match(source, /diagnosticNeedsAttention/)
  assert.match(source, /diagnosticUncertain/)
  assert.match(source, /hasIncompleteTopology/)
  assert.match(source, /t\("Unreported"\)/)
  assert.match(source, /\{t\("Unknown"\)\}/)
  assert.match(source, /\{t\("Degraded"\)\}/)
  assert.match(source, /\{t\("Initializing"\)\}/)
  assert.match(source, /value \?\? unavailableLabel/)
})

test("status page routes diagnostics into the relevant operational surfaces", () => {
  const source = fs.readFileSync("app/(dashboard)/status/page.tsx", "utf8")
  const usageSource = fs.readFileSync("app/(dashboard)/_components/performance-usage-card.tsx", "utf8")

  assert.match(source, /peerHealth=\{diagnosticsInfo\?\.peerHealth\}/)
  assert.match(source, /storageReadiness=\{diagnosticsInfo\?\.storageReadiness\}/)
  assert.match(source, /usageFreshness=\{diagnosticsInfo \? usageFreshness : undefined\}/)
  assert.match(usageSource, /usageFreshness\?: StatusDiagnostic/)
  assert.match(usageSource, /usageFreshness\?\.state === "degraded"/)
  assert.match(usageSource, /usageFreshness\?\.state === "stale"/)
})

test("performance server list treats every health state as a first-class filter", () => {
  const source = fs.readFileSync("app/(dashboard)/_components/performance-server-list.tsx", "utf8")

  assert.match(
    source,
    /const filterOrder: ServerHealthState\[\] = \["offline", "degraded", "initializing", "unknown", "online"\]/,
  )
  assert.match(source, /resolveServerHealth\(server, diagnostics\)/)
  assert.match(source, /health\.state === filterBy/)
  assert.match(source, /getStatePriority\(left\.health\.state\)/)
  assert.match(source, /<Badge variant=\{getStateVariant\(state\)\}>\{getStateLabel\(state, t\)\}<\/Badge>/)
  assert.match(source, /health\.reason/)
  assert.match(source, /aria-pressed=\{selected\}/)
  assert.doesNotMatch(source, /!isOnlineServer\(server\)/)
})
