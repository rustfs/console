import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("pool decommission page renders pool selection as a table instead of a select", () => {
  const source = fs.readFileSync("app/(dashboard)/pool-decommission/page.tsx", "utf8")

  assert.equal(source.includes('from "@/components/ui/table"'), true)
  assert.equal(source.includes('from "@/components/ui/select"'), false)
  assert.doesNotMatch(source, /<Select\b/)
  assert.match(source, /<Table\b/)
  assert.match(source, /poolRows\.map/)
})

test("pool decommission page keeps status panel independent from list clicks and hides idle progress", () => {
  const source = fs.readFileSync("app/(dashboard)/pool-decommission/page.tsx", "utf8")

  assert.doesNotMatch(source, /{t\("Rebalance Status"\)}/)
  assert.match(source, /if \(selectionLocked\) return/)
  assert.match(source, /setSelectedPoolId\(pool\.id\)/)
  assert.doesNotMatch(source, /onClick=\{\(\) => setActivePoolId\(pool\.id\)\}/)
  assert.match(source, /function hasDecommissionProgress\(state: DecommissionDisplayState\)/)
  assert.match(source, /const showProgress = Boolean\(rowStatus\) && hasDecommissionProgress\(rowState\)/)
  assert.match(source, /showProgress \?/)
  assert.match(source, /\{t\("Available"\)\}: \{formatBytesValue\(pool\.available\)\}/)
  assert.match(source, /className="space-y-3 md:hidden"/)
  assert.match(source, /return row\.displayState === "ready" && !selectionLocked/)
  assert.doesNotMatch(source, /\["ready", "failed", "canceled", "completed"\]\.includes\(rowState\)/)
})

test("pool decommission page gates start, cancel, and clear by decommission state", () => {
  const source = fs.readFileSync("app/(dashboard)/pool-decommission/page.tsx", "utf8")

  assert.match(
    source,
    /function canStartDecommission\(row: PoolRow, selectionLocked: boolean, activePoolCount: number\)/,
  )
  assert.match(
    source,
    /return row\.displayState === "ready" && !selectionLocked && isActivePool\(row\.pool\) && activePoolCount > 1/,
  )
  assert.match(source, /function canClearDecommission\(row: PoolRow\)/)
  assert.match(source, /return row\.displayState === "failed" \|\| row\.displayState === "canceled"/)
  assert.match(source, /if \(row\.displayState === "running"\)/)
  assert.match(source, /disabled=\{interactionLocked\}/)
  assert.match(source, /clearDecommission/)
  assert.match(source, /t\("Clear Decommission"\)/)
  assert.match(source, /dialog\.warning\(/)
  assert.match(source, /dialog\.error\(/)
})
