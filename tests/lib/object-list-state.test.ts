import test from "node:test"
import assert from "node:assert/strict"
import {
  createObjectListScope,
  resolveObjectListDisplayState,
  shouldApplyObjectListResponse,
  shouldResetObjectListPagination,
} from "../../lib/object-list-state"

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

test("resolveObjectListDisplayState treats an unfiltered empty response as an empty bucket", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "",
      filteredCount: 0,
      loadedCount: 0,
      hasMore: false,
      loading: false,
      error: null,
    }),
    "empty",
  )
})

test("resolveObjectListDisplayState keeps a filtered append request in loading state", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "backup",
      filteredCount: 0,
      loadedCount: 25,
      hasMore: true,
      loading: true,
      error: null,
    }),
    "filtered-loading",
  )
})

test("resolveObjectListDisplayState reports when unsearched objects remain", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "backup",
      filteredCount: 0,
      loadedCount: 25,
      hasMore: true,
      loading: false,
      error: null,
    }),
    "filtered-partial",
  )
})

test("resolveObjectListDisplayState reports a final filtered-empty state after all objects load", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "missing",
      filteredCount: 0,
      loadedCount: 50,
      hasMore: false,
      loading: false,
      error: null,
    }),
    "filtered-empty",
  )
})

test("resolveObjectListDisplayState shows matching rows while more objects load", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "backup",
      filteredCount: 1,
      loadedCount: 25,
      hasMore: true,
      loading: true,
      error: null,
    }),
    "content",
  )
})

test("resolveObjectListDisplayState ignores whitespace around the filter term", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "   ",
      filteredCount: 0,
      loadedCount: 0,
      hasMore: false,
      loading: false,
      error: null,
    }),
    "empty",
  )
})

test("resolveObjectListDisplayState prioritizes access denied over previously loaded rows", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "",
      filteredCount: 25,
      loadedCount: 25,
      hasMore: false,
      loading: false,
      error: "access-denied",
    }),
    "access-denied",
  )
})

test("resolveObjectListDisplayState keeps read failures distinct from an empty bucket", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "",
      filteredCount: 0,
      loadedCount: 0,
      hasMore: false,
      loading: false,
      error: "error",
    }),
    "error",
  )
})
