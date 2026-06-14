import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("object list normalizes LastModified through the safe date helper", () => {
  const source = fs.readFileSync("components/object/list.tsx", "utf8")

  assert.equal(source.includes('import { normalizeDateToIso } from "@/lib/safe-date"'), true)
  assert.equal(source.includes("LastModified: normalizeDateToIso(item.LastModified)"), true)
  assert.equal(source.includes('item.LastModified ? item.LastModified.toISOString() : ""'), false)
})

test("object list falls back to an empty table instead of crashing the page on fetch errors", () => {
  const source = fs.readFileSync("components/object/list.tsx", "utf8")

  assert.equal(source.includes('console.error("Failed to fetch objects:", error)'), true)
  assert.equal(source.includes('message.error((error as Error)?.message ?? t("Failed to load objects"))'), true)
  assert.equal(source.includes("setData([])"), true)
})
