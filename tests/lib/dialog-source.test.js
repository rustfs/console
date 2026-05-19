import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("dialog overlay and content remain clickable above modal parents", () => {
  const source = fs.readFileSync("components/ui/dialog.tsx", "utf8")

  assert.equal(source.includes("pointer-events-auto"), true)
})
