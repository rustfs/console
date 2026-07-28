import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("DataTable renders request failures as an announced error state before empty content", () => {
  const source = fs.readFileSync("components/data-table/data-table.tsx", "utf8")

  assert.match(source, /errorTitle\?: string/)
  assert.match(source, /\) : errorTitle \? \(/)
  assert.match(source, /<div role="alert">/)
  assert.match(source, /<EmptyState title=\{errorTitle\} description=\{errorDescription\}/)
})
