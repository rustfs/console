import test from "node:test"
import assert from "node:assert/strict"
import {
  getObjectPreviewMode,
  createObjectPreviewInfo,
  isSafeTextPreview,
  MAX_TEXT_PREVIEW_BYTES,
  readObjectPreviewText,
} from "../../lib/object-preview"

const previewOptions = {
  hasPreviewUrl: true,
  contentType: "application/octet-stream",
  objectSize: 20,
  canRenderText: false,
  canRenderImage: false,
  canRenderPdf: false,
  canRenderParquet: false,
  canRenderTiff: false,
}

test("preview metadata keeps the selected key when a HEAD response has no object key", () => {
  assert.equal(createObjectPreviewInfo("folder/fred", { ContentLength: 20 }).Key, "folder/fred")
})

test("version preview keeps the selected version when response headers do not expose it", () => {
  assert.equal(createObjectPreviewInfo("fred", { SignedUrl: "/fred?versionId=old" }, "old").SelectedVersionId, "old")
})

test("ordinary previews do not select the version returned by HEAD for download", () => {
  assert.equal(createObjectPreviewInfo("fred", { VersionId: "current" }).SelectedVersionId, undefined)
})

test("an explicitly selected version stays separate from HEAD metadata", () => {
  assert.deepEqual(createObjectPreviewInfo("fred", { VersionId: "head-version" }, "selected-version"), {
    Key: "fred",
    VersionId: "head-version",
    SelectedVersionId: "selected-version",
  })
})

test("passing version preview metadata to the browser preserves the explicit selection", () => {
  const data = createObjectPreviewInfo("fred", { SignedUrl: "/fred?versionId=old" }, "old")
  assert.equal(createObjectPreviewInfo("fred", data).SelectedVersionId, "old")
})

test("a normalized zero version does not inherit the version returned by HEAD", () => {
  assert.equal(createObjectPreviewInfo("fred", { VersionId: "head-version" }, undefined).SelectedVersionId, undefined)
})

for (const contentType of [
  "",
  "application/octet-stream",
  "binary/octet-stream",
  " Application/Octet-Stream; foo=bar ",
]) {
  test(`small objects with ${contentType || "missing MIME metadata"} are checked for text`, () => {
    assert.equal(getObjectPreviewMode({ ...previewOptions, contentType }), "detect-text")
  })
}

test("generic objects above the preview limit offer download without probing", () => {
  assert.equal(getObjectPreviewMode({ ...previewOptions, objectSize: MAX_TEXT_PREVIEW_BYTES + 1 }), "download")
})

test("generic objects with invalid sizes are not probed", () => {
  for (const objectSize of [NaN, Infinity, -1]) {
    assert.equal(getObjectPreviewMode({ ...previewOptions, objectSize }), "download")
  }
})

test("recognized renderers take priority over generic MIME detection", () => {
  assert.equal(getObjectPreviewMode({ ...previewOptions, canRenderImage: true }), "image")
  assert.equal(getObjectPreviewMode({ ...previewOptions, canRenderParquet: true }), "parquet")
  assert.equal(getObjectPreviewMode({ ...previewOptions, canRenderTiff: true }), "tiff")
})

test("explicit content types retain the sandbox renderer", () => {
  assert.equal(getObjectPreviewMode({ ...previewOptions, contentType: "text/html" }), "sandbox")
})

test("existing text MIME and extension previews retain their size limit", () => {
  assert.equal(isSafeTextPreview("text/plain", "fred", 20), true)
  assert.equal(isSafeTextPreview("application/octet-stream", "fred.TXT", 20), true)
  assert.equal(isSafeTextPreview("application/octet-stream", "fred", 20), false)
  assert.equal(isSafeTextPreview("text/plain", "fred", MAX_TEXT_PREVIEW_BYTES + 1), false)
})

test("extensionless UTF-8 text is decoded completely, including non-ASCII content", async () => {
  const text = "this is a text file\n中文日志\t🙂\r\n"
  assert.equal(await readObjectPreviewText(new Response(text)), text)
})

test("UTF-8 sequences split across network chunks are preserved", async () => {
  const bytes = new TextEncoder().encode("日志🙂")
  const body = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      controller.close()
    },
  })
  assert.equal(await readObjectPreviewText(new Response(body)), "日志🙂")
})

test("HTML-looking content stays literal text", async () => {
  const text = '<script>alert("preview")</script>'
  assert.equal(await readObjectPreviewText(new Response(text)), text)
})

test("binary control characters anywhere in the file reject text preview", async () => {
  assert.equal(await readObjectPreviewText(new Response("a".repeat(10000) + "\u0000binary")), null)
})

test("invalid and incomplete UTF-8 reject text preview", async () => {
  for (const bytes of [Uint8Array.of(0xff, 0xfe), Uint8Array.of(0xe4, 0xb8)]) {
    assert.equal(await readObjectPreviewText(new Response(bytes)), null)
  }
})

test("an empty object offers download instead of a blank text area", async () => {
  assert.equal(await readObjectPreviewText(new Response("")), null)
})

test("a BOM-only object is empty, while BOM-prefixed text is previewed", async () => {
  assert.equal(await readObjectPreviewText(new Response(Uint8Array.of(0xef, 0xbb, 0xbf))), null)
  assert.equal(await readObjectPreviewText(new Response("\uFEFF日志")), "日志")
})

test("text exactly at the limit can be previewed", async () => {
  const text = "a".repeat(MAX_TEXT_PREVIEW_BYTES)
  assert.equal(await readObjectPreviewText(new Response(text)), text)
})

test("oversized response headers cancel the body before reading", async () => {
  let cancelled = false
  const body = new ReadableStream({
    cancel: () => {
      cancelled = true
    },
  })
  const response = new Response(body, { headers: { "Content-Length": String(MAX_TEXT_PREVIEW_BYTES + 1) } })
  assert.equal(await readObjectPreviewText(response), null)
  assert.equal(cancelled, true)
})

test("actual response bytes enforce the limit when length metadata is wrong", async () => {
  let cancelled = false
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_TEXT_PREVIEW_BYTES + 1))
    },
    cancel: () => {
      cancelled = true
    },
  })
  assert.equal(await readObjectPreviewText(new Response(body, { headers: { "Content-Length": "20" } })), null)
  assert.equal(cancelled, true)
})

test("network stream failures remain errors rather than unsupported content", async () => {
  const failure = new Error("Connection lost")
  const body = new ReadableStream({
    start(controller) {
      controller.error(failure)
    },
  })
  await assert.rejects(readObjectPreviewText(new Response(body)), failure)
})
