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
  assert.match(source, /className=\{cn\(isFailedRebalancePool\(pool\) && "bg-destructive\/10"\)\}/)
})

test("decommission page keeps decommission detail columns", () => {
  const source = fs.readFileSync("app/(dashboard)/pool-decommission/page.tsx", "utf8")

  assert.match(
    source,
    /<PoolsOverviewCard overview=\{overview\} operationLabel=\{t\("Pool Decommission"\)\} showDecommissionColumns \/>/,
  )
})

test("pool overview card gates decommission-specific columns", () => {
  const source = fs.readFileSync("components/pools/overview.tsx", "utf8")

  assert.match(source, /showDecommissionColumns = false/)
  assert.match(source, /showDecommissionColumns \? 18 : 9/)
  assert.match(source, /showDecommissionColumns \? \(/)
})
