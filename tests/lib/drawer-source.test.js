import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("right and left drawers fill the viewport height", () => {
  const source = fs.readFileSync("components/ui/drawer.tsx", "utf8")

  assert.equal(source.includes("data-[vaul-drawer-direction=right]:h-dvh"), true)
  assert.equal(source.includes("data-[vaul-drawer-direction=left]:h-dvh"), true)
})
