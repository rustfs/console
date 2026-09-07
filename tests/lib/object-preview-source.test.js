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

test("object preview dialog is desktop-resizable and remains bounded by the dynamic viewport", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(source, /resize-none \[@media\(min-width:40rem\)_and_\(hover:hover\)_and_\(pointer:fine\)\]:resize/)
  assert.match(source, /max-h-\[calc\(100dvh_-_var\(--preview-dialog-block-start\)_-_1rem\)\]/)
  assert.match(source, /max-w-\[calc\(100vw_-_var\(--preview-dialog-inline-start\)_-_1rem\)\]/)
  assert.match(source, /sm:max-w-\[calc\(100vw_-_var\(--preview-dialog-inline-start\)_-_1rem\)\]/)
  assert.match(source, /start-\[var\(--preview-dialog-inline-start\)\]/)
  assert.match(source, /translate-x-0 translate-y-0/)
  assert.match(source, /sm:min-h-\[min\(20rem,calc\(100dvh-var\(--preview-dialog-block-start\)-1rem\)\)\]/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)\]/)
})

test("object preview dialog provides a keyboard-operable expand and collapse alternative", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(source, /aria-label=\{isDialogExpanded \? t\("Collapse"\) : t\("Expand"\)\}/)
  assert.match(source, /onClick=\{\(\) => setIsDialogExpanded\(\(expanded\) => !expanded\)\}/)
  assert.match(
    source,
    /!start-4 !top-4 !h-\[calc\(100dvh-2rem\)\] !max-h-\[calc\(100dvh-2rem\)\] !w-\[calc\(100vw-2rem\)\] !max-w-\[calc\(100vw-2rem\)\] !resize-none/,
  )
  assert.match(source, /"--preview-dialog-width": "min\(56rem, calc\(100vw - 2rem\)\)"/)
})

test("object preview dialog keeps compact preview modes at a compact default height", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(source, /previewMode === "audio" \|\| previewMode === "download"/)
  assert.match(source, /\? "min\(24rem, calc\(100dvh - 2rem\)\)"/)
  assert.match(source, /: "min\(85dvh, 48rem\)"/)
})

test("object preview renderers fill the resizable dialog body", () => {
  const previewSource = fs.readFileSync("components/object/preview-modal.tsx", "utf8")
  const pdfSource = fs.readFileSync("components/object/pdf-viewer.tsx", "utf8")
  const parquetSource = fs.readFileSync("components/object/parquet-viewer.tsx", "utf8")

  assert.match(previewSource, /<iframe[^>]*className="min-h-0 w-full flex-1"/)
  assert.doesNotMatch(previewSource, /h-\[70vh\]/)
  assert.match(pdfSource, /relative flex min-h-0 w-full flex-1/)
  assert.doesNotMatch(pdfSource, /h-\[70vh\]/)
  assert.match(parquetSource, /min-h-0 w-full min-w-0 flex-1/)
  assert.doesNotMatch(parquetSource, /max-h-\[70vh\]/)
})

test("image preview recomputes its fit when the dialog viewport is resized", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(source, /new ResizeObserver\(\(\) => \{\s+updateImageFitScale\(\)\s+centerImageViewport\(\)/)
  assert.match(source, /resizeObserver\.observe\(imageViewport\)/)
  assert.match(source, /return \(\) => resizeObserver\.disconnect\(\)/)
})

test("resized preview scroll regions remain keyboard accessible", () => {
  const previewSource = fs.readFileSync("components/object/preview-modal.tsx", "utf8")
  const parquetSource = fs.readFileSync("components/object/parquet-viewer.tsx", "utf8")
  const tiffSource = fs.readFileSync("components/object/tiff-viewer.tsx", "utf8")

  assert.match(previewSource, /role="region"[\s\S]*tabIndex=\{0\}[\s\S]*aria-label=/)
  assert.match(parquetSource, /role="region"[\s\S]*tabIndex=\{0\}[\s\S]*aria-label=/)
  assert.match(tiffSource, /role="region"[\s\S]*tabIndex=\{0\}[\s\S]*aria-label=/)
})

test("object preview localizes its sandbox and close control labels", () => {
  const source = fs.readFileSync("components/object/preview-modal.tsx", "utf8")

  assert.match(source, /showCloseButton=\{false\}/)
  assert.match(source, /aria-label=\{t\("Close"\)\}/)
  assert.match(source, /title=\{t\("Preview"\)\}/)
})
