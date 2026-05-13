import test from "node:test"
import assert from "node:assert/strict"
import {
  OBJECT_LIST_DEFAULT_PAGE_SIZE,
  OBJECT_LIST_PAGE_SIZE_OPTIONS,
  normalizeObjectListPageSize,
} from "../../lib/object-list-pagination.js"

test("object list pagination defaults to 100 keys per page", () => {
  assert.equal(OBJECT_LIST_DEFAULT_PAGE_SIZE, 100)
})

test("object list pagination supports S3-safe page size options", () => {
  assert.deepEqual([...OBJECT_LIST_PAGE_SIZE_OPTIONS], [25, 50, 100, 500, 1000])
})

test("normalizeObjectListPageSize keeps supported values", () => {
  assert.equal(normalizeObjectListPageSize(25), 25)
  assert.equal(normalizeObjectListPageSize(1000), 1000)
})

test("normalizeObjectListPageSize falls back for unsupported values", () => {
  assert.equal(normalizeObjectListPageSize(10), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(normalizeObjectListPageSize("100"), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(normalizeObjectListPageSize(undefined), OBJECT_LIST_DEFAULT_PAGE_SIZE)
})
