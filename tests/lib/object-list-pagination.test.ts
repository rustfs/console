import test from "node:test"
import assert from "node:assert/strict"
import {
  OBJECT_LIST_DEFAULT_PAGE_SIZE,
  OBJECT_LIST_PAGE_SIZE_OPTIONS,
  resolveObjectListPageSize,
} from "../../lib/object-list-pagination.js"

test("object list pagination defaults to 1000 keys per request", () => {
  assert.equal(OBJECT_LIST_DEFAULT_PAGE_SIZE, 1000)
})

test("resolveObjectListPageSize keeps the supported batch sizes", () => {
  assert.deepEqual(OBJECT_LIST_PAGE_SIZE_OPTIONS, [100, 250, 500, 1000])
  assert.equal(resolveObjectListPageSize(100), 100)
  assert.equal(resolveObjectListPageSize(250), 250)
  assert.equal(resolveObjectListPageSize(500), 500)
  assert.equal(resolveObjectListPageSize(1000), 1000)
})

test("resolveObjectListPageSize falls back for invalid values", () => {
  assert.equal(resolveObjectListPageSize(0), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(resolveObjectListPageSize(1.5), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(resolveObjectListPageSize(999), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(resolveObjectListPageSize("1000"), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(resolveObjectListPageSize(undefined), OBJECT_LIST_DEFAULT_PAGE_SIZE)
})
