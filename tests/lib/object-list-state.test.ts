import test from "node:test"
import assert from "node:assert/strict"
import {
  createObjectListScope,
  shouldApplyObjectListResponse,
  shouldResetObjectListPagination,
} from "../../lib/object-list-state.js"

test("shouldResetObjectListPagination returns false for the same listing scope", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    showDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    showDeleted: false,
  })

  assert.equal(shouldResetObjectListPagination(previousScope, nextScope), false)
})

test("shouldResetObjectListPagination returns true when prefix changes", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    showDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "",
    pageSize: 25,
    showDeleted: false,
  })

  assert.equal(shouldResetObjectListPagination(previousScope, nextScope), true)
})

test("shouldResetObjectListPagination returns true when the bucket changes", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "",
    pageSize: 25,
    showDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-b",
    prefix: "",
    pageSize: 25,
    showDeleted: false,
  })

  assert.equal(shouldResetObjectListPagination(previousScope, nextScope), true)
})

test("shouldApplyObjectListResponse rejects stale requests", () => {
  assert.equal(
    shouldApplyObjectListResponse({
      requestId: 2,
      activeRequestId: 3,
      requestScope: createObjectListScope({
        bucket: "bucket-a",
        prefix: "",
        pageSize: 25,
        showDeleted: false,
      }),
      activeScope: createObjectListScope({
        bucket: "bucket-a",
        prefix: "",
        pageSize: 25,
        showDeleted: false,
      }),
    }),
    false,
  )
})

test("shouldApplyObjectListResponse rejects responses from an old scope", () => {
  assert.equal(
    shouldApplyObjectListResponse({
      requestId: 3,
      activeRequestId: 3,
      requestScope: createObjectListScope({
        bucket: "bucket-a",
        prefix: "folder-a/",
        pageSize: 25,
        showDeleted: false,
      }),
      activeScope: createObjectListScope({
        bucket: "bucket-a",
        prefix: "",
        pageSize: 25,
        showDeleted: false,
      }),
    }),
    false,
  )
})

test("shouldApplyObjectListResponse accepts the latest response for the current scope", () => {
  const scope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "",
    pageSize: 25,
    showDeleted: false,
  })

  assert.equal(
    shouldApplyObjectListResponse({
      requestId: 4,
      activeRequestId: 4,
      requestScope: scope,
      activeScope: scope,
    }),
    true,
  )
})
