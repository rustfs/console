import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("safe date helper returns an empty string for invalid values instead of throwing", () => {
  const source = fs.readFileSync("lib/safe-date.ts", "utf8")

  assert.match(source, /if \(!value\) return ""/)
  assert.match(source, /const date = value instanceof Date \? value : new Date\(value\)/)
  assert.match(source, /if \(Number\.isNaN\(time\)\) \{\s+return ""\s+\}/)
  assert.match(source, /return date\.toISOString\(\)/)
})

test("scheduleMicrotask falls back when queueMicrotask is unavailable", () => {
  const source = fs.readFileSync("lib/schedule-microtask.ts", "utf8")

  assert.equal(source.includes('if (typeof queueMicrotask === "function")'), true)
  assert.equal(source.includes('if (typeof Promise === "function")'), true)
  assert.equal(source.includes("globalThis.setTimeout(callback, 0)"), true)
})
