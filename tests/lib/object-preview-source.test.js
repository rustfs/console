import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("object preview modal falls back when standard fullscreen APIs are unavailable", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.equal(source.includes("webkitExitFullscreen"), true)
  assert.equal(source.includes("webkitRequestFullscreen"), true)
  assert.equal(source.includes("getFullscreenElement(document as FullscreenDocument)"), true)
  assert.equal(source.includes("void exitFullscreen(fullscreenDocument).catch(() => {})"), true)
  assert.equal(source.includes("void requestFullscreen(container).catch(() => {})"), true)
  assert.equal(source.includes("void document.exitFullscreen().catch(() => {})"), false)
  assert.equal(source.includes("void container.requestFullscreen().catch(() => {})"), false)
})

test("object preview modal only uses the PDF viewer for application/pdf content", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(
    source,
    /function isPdfPreview\(contentType: string\) \{\s+return contentType === "application\/pdf"\s+\}/,
  )
  assert.match(source, /isPdfPreview\(normalizedContentType\)/)
  assert.doesNotMatch(source, /keyLower\.endsWith\("\.pdf"\)/)
})

test("object text preview aborts stale requests and rejects non-success responses", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(source, /const controller = new AbortController\(\)/)
  assert.match(source, /fetch\(previewUrl, \{ signal: controller\.signal \}\)/)
  assert.match(source, /if \(!response\.ok\) throw new Error/)
  assert.match(source, /return \(\) => controller\.abort\(\)/)
})
