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
