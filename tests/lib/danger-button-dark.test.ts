import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

import { DANGER_BUTTON_CLASS } from "../../components/danger-button"
import { cn } from "../../lib/utils"

// Confirmation buttons combine the soft destructive Button variant with DANGER_BUTTON_CLASS.
// The test runner cannot import .tsx, so read the variant classes from the source.
const buttonSource = fs.readFileSync("components/ui/button.tsx", "utf8")
const destructiveVariant = buttonSource.match(/destructive:\s*"([^"]+)"/)?.[1] ?? ""
const merged = cn(destructiveVariant, DANGER_BUTTON_CLASS).split(" ")

test("the soft destructive variant tints its fill in the dark theme", () => {
  assert.ok(destructiveVariant.split(" ").includes("dark:bg-destructive/20"))
})

test("filled danger button keeps a solid fill in the dark theme", () => {
  assert.ok(merged.includes("dark:bg-destructive"))
  assert.ok(!merged.includes("dark:bg-destructive/20"))
})

test("filled danger button keeps a solid hover fill in the dark theme", () => {
  assert.ok(merged.includes("dark:hover:bg-destructive/95"))
  assert.ok(!merged.includes("dark:hover:bg-destructive/30"))
})
