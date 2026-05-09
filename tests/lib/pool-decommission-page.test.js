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
