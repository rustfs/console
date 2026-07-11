import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const read = (file) => fs.readFileSync(file, "utf8")

test("pool status reads fail closed instead of becoming idle or ready", () => {
  const hook = read("hooks/use-pool-operations.ts")
  const rebalance = read("app/(dashboard)/rebalance/page.tsx")
  const decommission = read("app/(dashboard)/pool-decommission/page.tsx")

  assert.doesNotMatch(hook, /getRebalanceStatus\(\)\.catch\(\(\) => null\)/)
  assert.doesNotMatch(decommission, /getRebalanceStatus\(\)\.catch\(\(\) => null\)/)
  assert.doesNotMatch(decommission, /getDecommissionStatuses\(\)\.catch\(\(\) => \[\]\)/)
  assert.match(rebalance, /const \[dataReady, setDataReady\] = useState\(false\)/)
  assert.match(decommission, /const \[dataReady, setDataReady\] = useState\(false\)/)
  assert.match(rebalance, /const interactionLocked =/)
  assert.match(decommission, /const interactionLocked =/)
})

test("pool operation requests reject stale responses and mutations use synchronous locks", () => {
  for (const file of ["app/(dashboard)/rebalance/page.tsx", "app/(dashboard)/pool-decommission/page.tsx"]) {
    const source = read(file)
    assert.match(source, /const requestVersionRef = useRef\(0\)/)
    assert.match(source, /const mutationRef = useRef\(false\)/)
    assert.match(source, /requestId !== requestVersionRef\.current/)
    assert.match(source, /if \(mutationRef\.current\) return/)
  }
})

test("rebalance keeps polling while active and exposes retry next to errors", () => {
  const source = read("app/(dashboard)/rebalance/page.tsx")

  assert.match(source, /const scheduleNextPoll = async/)
  assert.match(source, /pollRef\.current = window\.setTimeout/)
  assert.match(source, /await loadData\(false\)/)
  assert.match(source, /onClick=\{\(\) => void loadData\(\)\}/)
  assert.match(source, /\{t\("Refresh"\)\}/)
})

test("decommission uses responsive pool cards, confirmations, and safe row keyboard handling", () => {
  const source = read("app/(dashboard)/pool-decommission/page.tsx")

  assert.match(source, /className="space-y-3 md:hidden"/)
  assert.match(source, /className="hidden md:block"/)
  assert.match(source, /event\.target !== event\.currentTarget/)
  assert.match(source, /dialog\.warning\(/)
  assert.match(source, /dialog\.error\(/)
  assert.match(source, /setSelectedPoolId\(\(current\) =>/)
})

test("pool tables and progress indicators expose purpose to assistive technology", () => {
  const rebalance = read("app/(dashboard)/rebalance/page.tsx")
  const decommission = read("app/(dashboard)/pool-decommission/page.tsx")

  assert.match(rebalance, /<TableCaption className="sr-only">/)
  assert.match(decommission, /<TableCaption className="sr-only">/)
  assert.match(rebalance, /aria-label=/)
  assert.match(decommission, /aria-label=/)
})
