import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { getObjectPreviewMode } from "../../lib/object-preview.ts"

const previewOptions = {
  hasPreviewUrl: true,
  contentType: "application/octet-stream",
  canRenderText: false,
  canRenderImage: false,
  canRenderPdf: false,
  canRenderParquet: false,
  canRenderTiff: false,
}

test("object preview dispatches normalized audio MIME types to the native audio mode", () => {
  assert.equal(getObjectPreviewMode({ ...previewOptions, contentType: "audio/wav" }), "audio")
  assert.equal(getObjectPreviewMode({ ...previewOptions, contentType: "audio/mpeg" }), "audio")
  assert.equal(getObjectPreviewMode({ ...previewOptions, contentType: " Audio/WAV; codecs=1 " }), "audio")
  assert.equal(
    getObjectPreviewMode({ ...previewOptions, contentType: "audio/wav", canRenderParquet: true, canRenderTiff: true }),
    "audio",
  )
})

test("object preview preserves non-audio dispatch behavior", () => {
  assert.equal(getObjectPreviewMode(previewOptions), "sandbox")
  assert.equal(getObjectPreviewMode({ ...previewOptions, canRenderPdf: true }), "pdf")
  assert.equal(getObjectPreviewMode({ ...previewOptions, canRenderImage: true }), "image")
  assert.equal(getObjectPreviewMode({ ...previewOptions, canRenderText: true }), "text")
})

test("object preview renders native audio controls without relaxing the fallback sandbox", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(source, /const previewMode = getObjectPreviewMode\(\{/)
  assert.match(source, /switch \(previewMode\)/)
  assert.match(source, /case "audio":[\s\S]*<audio[\s\S]*controls[\s\S]*src=\{previewUrl\}/)
  assert.match(source, /onError=\{\(\) => setAudioLoadError\(true\)\}/)
  assert.match(source, /role="alert"[\s\S]*\{t\("Preview unavailable"\)\}/)
  assert.match(source, /<iframe[^>]*sandbox=""/)
  assert.doesNotMatch(source, /allow-same-origin/)
})

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
