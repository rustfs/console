import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("operation status badges do not use count-based translation keys", () => {
  const files = ["app/(dashboard)/rebalance/page.tsx", "app/(dashboard)/pool-decommission/page.tsx"]
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n")

  assert.equal(source.includes('t("Completed")'), false)
  assert.equal(source.includes('t("Failed")'), false)
  assert.equal(source.includes('t("Completed Status")'), true)
  assert.equal(source.includes('t("Failed Status")'), true)
})
