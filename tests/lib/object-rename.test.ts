import test from "node:test"
import assert from "node:assert/strict"

const loadObjectRename = () => import(new URL("../../lib/object-rename.ts", import.meta.url).href)

test("getObjectBaseName returns the final object name segment", async () => {
  const { getObjectBaseName } = await loadObjectRename()

  assert.equal(getObjectBaseName("photos/2026/image.jpg"), "image.jpg")
  assert.equal(getObjectBaseName("image.jpg"), "image.jpg")
})

test("buildRenamedObjectKey keeps renamed objects in the same prefix", async () => {
  const { buildRenamedObjectKey } = await loadObjectRename()

  assert.equal(buildRenamedObjectKey("photos/2026/image.jpg", "renamed.jpg"), "photos/2026/renamed.jpg")
  assert.equal(buildRenamedObjectKey("image.jpg", "renamed.jpg"), "renamed.jpg")
})

test("validateObjectRename rejects empty, nested, and unchanged names", async () => {
  const { validateObjectRename } = await loadObjectRename()

  assert.equal(validateObjectRename("photos/image.jpg", ""), "empty")
  assert.equal(validateObjectRename("photos/image.jpg", "nested/image.jpg"), "containsSlash")
  assert.equal(validateObjectRename("photos/image.jpg", "image.jpg"), "sameName")
  assert.equal(validateObjectRename("photos/image.jpg", "renamed.jpg"), null)
})

test("encodeObjectCopySource URL-encodes bucket and key path segments", async () => {
  const { encodeObjectCopySource } = await loadObjectRename()

  assert.equal(encodeObjectCopySource("my.bucket", "a b/c+中文.txt"), "/my.bucket/a%20b/c%2B%E4%B8%AD%E6%96%87.txt")
})

test("encodeObjectCopySource appends an encoded source version id", async () => {
  const { encodeObjectCopySource } = await loadObjectRename()

  assert.equal(
    encodeObjectCopySource("my.bucket", "a b/c+中文.txt", "2026/07/04 version+1"),
    "/my.bucket/a%20b/c%2B%E4%B8%AD%E6%96%87.txt?versionId=2026%2F07%2F04%20version%2B1",
  )
})
