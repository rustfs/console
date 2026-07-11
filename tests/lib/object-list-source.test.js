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

test("object list lazy loads additional object batches instead of showing a paginator", () => {
  const source = fs.readFileSync("components/object/list.tsx", "utf8")

  assert.equal(source.includes("IntersectionObserver"), true)
  assert.equal(source.includes("setData((currentRows) => [...currentRows, ...rows])"), true)
  assert.equal(source.includes('t("Rows per page")'), false)
  assert.equal(source.includes('t("Previous Page")'), false)
  assert.equal(source.includes('t("Next Page")'), false)
})

test("object list shows fixed scroll shortcut buttons only when content overflows", () => {
  const source = fs.readFileSync("components/object/list.tsx", "utf8")

  assert.equal(source.includes("RiArrowUpSLine"), true)
  assert.equal(source.includes("RiArrowDownSLine"), true)
  assert.equal(
    source.includes("setShowScrollShortcuts(document.documentElement.scrollHeight > window.innerHeight)"),
    true,
  )
  assert.equal(source.includes('window.scrollTo({ top: 0, left: 0, behavior: "auto" })'), true)
  assert.equal(
    source.includes('window.scrollTo({ top: document.documentElement.scrollHeight, left: 0, behavior: "auto" })'),
    true,
  )
})

test("object download rejects non-success responses before exporting a blob", () => {
  const source = fs.readFileSync("components/object/list.tsx", "utf8")

  assert.match(source, /const response = await fetch\(url\)\s+if \(!response\.ok\) throw new Error/)
  assert.match(source, /finally \{\s+loadingMsg\.destroy\(\)/)
})
