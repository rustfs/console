import test from "node:test"
import assert from "node:assert/strict"
import {
  buildObjectZipDownloadPayload,
  getObjectZipDownloadFilename,
  normalizeObjectZipDownloadUrl,
} from "../../lib/object-zip-download.js"

test("buildObjectZipDownloadPayload separates object keys and prefixes", () => {
  const payload = buildObjectZipDownloadPayload({
    bucket: "photos",
    basePrefix: "2026/events/",
    rows: [
      { Key: "2026/events/a.txt", type: "object" },
      { Key: "2026/events/raw/", type: "prefix" },
    ],
  })

  assert.deepEqual(payload, {
    bucket: "photos",
    prefix: "2026/events/",
    objects: ["2026/events/a.txt"],
    prefixes: ["2026/events/raw/"],
    filename: "events.zip",
  })
})

test("getObjectZipDownloadFilename falls back to bucket name at root", () => {
  assert.equal(getObjectZipDownloadFilename("photos", ""), "photos.zip")
})

test("getObjectZipDownloadFilename uses the last prefix segment", () => {
  assert.equal(getObjectZipDownloadFilename("photos", "2026/events/"), "events.zip")
})

test("getObjectZipDownloadFilename sanitizes unsafe filename characters", () => {
  assert.equal(getObjectZipDownloadFilename("photos", '2026/bad:name*?"<>|/'), "bad-name.zip")
})

test("getObjectZipDownloadFilename falls back when sanitized names are empty", () => {
  assert.equal(getObjectZipDownloadFilename("...", ""), "download.zip")
})

test("normalizeObjectZipDownloadUrl keeps absolute URLs", () => {
  assert.equal(
    normalizeObjectZipDownloadUrl("https://example.com/download.zip", "https://console.example.com"),
    "https://example.com/download.zip",
  )
})

test("normalizeObjectZipDownloadUrl resolves relative URLs against the API base URL origin", () => {
  assert.equal(
    normalizeObjectZipDownloadUrl(
      "/rustfs/admin/v3/object-zip-downloads/abc.zip?token=abc",
      "https://api.example.com/rustfs/admin/v3",
    ),
    "https://api.example.com/rustfs/admin/v3/object-zip-downloads/abc.zip?token=abc",
  )
})
