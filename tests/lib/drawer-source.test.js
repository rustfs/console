import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("horizontal Base UI drawers fill the viewport height", () => {
  const source = fs.readFileSync("components/ui/drawer.tsx", "utf8")

  assert.equal(source.includes("data-[swipe-axis=x]:inset-y-0"), true)
  assert.equal(source.includes('swipeDirection = "down"'), true)
})
