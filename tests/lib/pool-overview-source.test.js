import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("rebalance page keeps the overview compact and renders operation detail once", () => {
  const source = fs.readFileSync("app/(dashboard)/rebalance/page.tsx", "utf8")
  const overview = fs.readFileSync("components/pools/overview.tsx", "utf8")

  assert.match(source, /<PoolsOverviewCard overview=\{overview\} operationLabel=\{t\("Rebalance"\)\} \/>/)
  assert.doesNotMatch(overview, /<Table/)
  assert.match(source, /className="space-y-3 md:hidden"/)
  assert.match(source, /className="hidden md:block"/)
})

test("rebalance page highlights failed pool rows", () => {
  const source = fs.readFileSync("app/(dashboard)/rebalance/page.tsx", "utf8")

  assert.match(source, /function isFailedRebalancePool\(pool: PoolSummary\)/)
  assert.match(source, /\["failed", "error"\]\.includes\(pool\.rebalanceStatus\.trim\(\)\.toLowerCase\(\)\)/)
  assert.match(source, /bg-destructive\/15 hover:bg-destructive\/20/)
})

test("rebalance page renders explicit cleanup warning counts", () => {
  const source = fs.readFileSync("app/(dashboard)/rebalance/page.tsx", "utf8")

  assert.match(source, /function formatCleanupWarnings\(pool: PoolSummary\)/)
  assert.match(source, /!warnings\.present && !warnings\.count/)
  assert.match(source, /formatCleanupWarnings\(pool\)/)
})

test("decommission page owns pool operation columns", () => {
  const source = fs.readFileSync("app/(dashboard)/pool-decommission/page.tsx", "utf8")

  assert.doesNotMatch(source, /<PoolsOverviewCard/)
  assert.match(source, /<TableHead scope="col">\{t\("Usage"\)\}<\/TableHead>/)
  assert.match(source, /<TableHead scope="col">\{t\("Progress"\)\}<\/TableHead>/)
  assert.match(source, /<TableHead scope="col" className="text-end">/)
})

test("pool overview card is a compact summary without a duplicate pool table", () => {
  const source = fs.readFileSync("components/pools/overview.tsx", "utf8")

  assert.doesNotMatch(source, /showDecommissionColumns/)
  assert.doesNotMatch(source, /<Table/)
  assert.match(source, /grid-cols-2/)
})
