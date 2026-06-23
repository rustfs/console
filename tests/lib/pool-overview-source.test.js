import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("rebalance page uses basic pool overview columns", () => {
  const source = fs.readFileSync("app/(dashboard)/rebalance/page.tsx", "utf8")

  assert.match(
    source,
    /<PoolsOverviewCard overview=\{overview\} operationLabel=\{t\("Rebalance"\)\} showDecommissionColumns=\{false\} \/>/,
  )
})

test("rebalance page highlights failed pool rows", () => {
  const source = fs.readFileSync("app/(dashboard)/rebalance/page.tsx", "utf8")

  assert.match(source, /function isFailedRebalancePool\(pool: PoolSummary\)/)
  assert.match(source, /\["failed", "error"\]\.includes\(pool\.status\.trim\(\)\.toLowerCase\(\)\)/)
  assert.match(source, /bg-destructive\/15 hover:bg-destructive\/20/)
})

test("decommission page owns pool operation columns", () => {
  const source = fs.readFileSync("app/(dashboard)/pool-decommission/page.tsx", "utf8")

  assert.doesNotMatch(source, /<PoolsOverviewCard/)
  assert.match(source, /<TableHead>\{t\("Usage"\)\}<\/TableHead>/)
  assert.match(source, /<TableHead>\{t\("Progress"\)\}<\/TableHead>/)
  assert.match(source, /<TableHead>\{t\("Bytes Moved"\)\}<\/TableHead>/)
})

test("pool overview card gates decommission-specific columns", () => {
  const source = fs.readFileSync("components/pools/overview.tsx", "utf8")

  assert.match(source, /showDecommissionColumns = false/)
  assert.match(source, /showDecommissionColumns \? 18 : 9/)
  assert.match(source, /showDecommissionColumns \? \(/)
})
