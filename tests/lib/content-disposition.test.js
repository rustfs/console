import test from "node:test"
import assert from "node:assert/strict"
import { getAttachmentContentDisposition } from "../../lib/content-disposition.js"

test("getAttachmentContentDisposition preserves ASCII filenames", () => {
  assert.equal(
    getAttachmentContentDisposition("release.tar.xz"),
    "attachment; filename=\"release.tar.xz\"; filename*=UTF-8''release.tar.xz",
  )
})

test("getAttachmentContentDisposition encodes Unicode and unsafe fallback characters", () => {
  assert.equal(
    getAttachmentContentDisposition('报告 "final".zip'),
    "attachment; filename=\"__ _final_.zip\"; filename*=UTF-8''%E6%8A%A5%E5%91%8A%20%22final%22.zip",
  )
})

test("getAttachmentContentDisposition percent-encodes RFC 8187 delimiters", () => {
  assert.equal(
    getAttachmentContentDisposition("报告(O'Reilly)*.zip"),
    "attachment; filename=\"__(O'Reilly)*.zip\"; filename*=UTF-8''%E6%8A%A5%E5%91%8A%28O%27Reilly%29%2A.zip",
  )
})
