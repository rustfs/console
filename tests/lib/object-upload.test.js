import test from "node:test"
import assert from "node:assert/strict"
import { buildUploadObjectKey, normalizeUploadPrefix } from "../../lib/object-upload.js"

test("normalizeUploadPrefix removes leading and trailing slashes", () => {
  assert.equal(normalizeUploadPrefix("/Normal/"), "Normal")
  assert.equal(normalizeUploadPrefix("//Normal//"), "Normal")
})

test("buildUploadObjectKey avoids leading slash when prefix starts with slash", () => {
  assert.equal(buildUploadObjectKey("/Normal/", "file.txt"), "Normal/file.txt")
})

test("buildUploadObjectKey keeps nested relative paths under the normalized prefix", () => {
  assert.equal(buildUploadObjectKey("Normal/", "folder/file.txt"), "Normal/folder/file.txt")
})

test("buildUploadObjectKey uses relative path when prefix is empty or slash only", () => {
  assert.equal(buildUploadObjectKey("", "file.txt"), "file.txt")
  assert.equal(buildUploadObjectKey("/", "file.txt"), "file.txt")
})
