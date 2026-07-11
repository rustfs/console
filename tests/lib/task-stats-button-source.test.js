import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("task stats drawer trigger renders the Base UI button trigger", () => {
  const source = fs.readFileSync("components/tasks/stats-button.tsx", "utf8")

  assert.match(source, /<DrawerTrigger\s+render={<Button variant="outline" \/>}>/)
})
