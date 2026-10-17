import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { getLicenseSections } from "../../lib/license-sections.js"

test("license navigation preserves every character of the published legal text", () => {
  const content = readFileSync("public/legal/LICENSE", "utf8")
  const sections = getLicenseSections(content)
  assert.equal(sections.map((section) => section.content).join(""), content)
  assert.equal(new Set(sections.map((section) => section.id)).size, sections.length)
  assert.equal(sections.length, 10)
  assert.match(sections[1].title, /^1\. Definitions\./)
  assert.match(sections[9].title, /^9\. Accepting Warranty or Additional Liability\./)
})

test("license reader retains content that has no numbered sections", () => {
  const text = "License\n\nAn unchanged unnumbered document.\n"
  assert.deepEqual(getLicenseSections(text), [{ id: "license-section-0", title: "Apache License", content: text }])
})
