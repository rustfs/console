import test from "node:test"
import assert from "node:assert/strict"
import { getUploadContentType } from "../../lib/upload-content-type.js"

function uploadBlob(parts, name, type = "") {
  const blob = new Blob(parts, { type })
  Object.defineProperty(blob, "name", { value: name })
  return blob
}

test("getUploadContentType adds utf-8 charset for valid UTF-8 text uploads", async () => {
  const file = uploadBlob(["中文内容"], "notes.txt", "text/plain")

  assert.equal(await getUploadContentType(file, "notes.txt"), "text/plain; charset=utf-8")
})

test("getUploadContentType does not mark non-UTF-8 text as UTF-8", async () => {
  const gbkChineseBytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4])
  const file = uploadBlob([gbkChineseBytes], "gbk.txt", "text/plain")

  assert.equal(await getUploadContentType(file, "gbk.txt"), "text/plain")
})

test("getUploadContentType validates the full file before adding UTF-8 charset", async () => {
  const asciiPrefix = "a".repeat(70 * 1024)
  const invalidUtf8Suffix = new Uint8Array([0xd6, 0xd0])
  const file = uploadBlob([asciiPrefix, invalidUtf8Suffix], "mixed.txt", "text/plain")

  assert.equal(await getUploadContentType(file, "mixed.txt"), "text/plain")
})

test("getUploadContentType preserves an existing charset", async () => {
  const file = uploadBlob(["中文内容"], "gbk.txt", "text/plain; charset=gbk")

  assert.equal(await getUploadContentType(file, "gbk.txt"), "text/plain; charset=gbk")
})

test("getUploadContentType keeps binary content types unchanged", async () => {
  const file = uploadBlob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "image.png", "image/png")

  assert.equal(await getUploadContentType(file, "image.png"), "image/png")
})

test("getUploadContentType infers markdown MIME type and charset when browser type is empty", async () => {
  const file = uploadBlob(["# 标题"], "readme.md")

  assert.equal(await getUploadContentType(file, "readme.md"), "text/markdown; charset=utf-8")
})

test("getUploadContentType falls back to octet-stream for unknown empty MIME types", async () => {
  const file = uploadBlob(["content"], "archive.unknownext")

  assert.equal(await getUploadContentType(file, "archive.unknownext"), "application/octet-stream")
})
