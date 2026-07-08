import test from "node:test"
import assert from "node:assert/strict"
import { OBJECT_LIST_DEFAULT_PAGE_SIZE, resolveObjectListPageSize } from "../../lib/object-list-pagination.js"

test("object list pagination defaults to 1000 keys per request", () => {
  assert.equal(OBJECT_LIST_DEFAULT_PAGE_SIZE, 1000)
})

test("resolveObjectListPageSize keeps valid positive integer values", () => {
  assert.equal(resolveObjectListPageSize(500), 500)
  assert.equal(resolveObjectListPageSize(1000), 1000)
})

test("resolveObjectListPageSize falls back for invalid values", () => {
  assert.equal(resolveObjectListPageSize(0), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(resolveObjectListPageSize(1.5), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(resolveObjectListPageSize("1000"), OBJECT_LIST_DEFAULT_PAGE_SIZE)
  assert.equal(resolveObjectListPageSize(undefined), OBJECT_LIST_DEFAULT_PAGE_SIZE)
})
