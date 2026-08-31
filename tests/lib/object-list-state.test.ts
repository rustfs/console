import test from "node:test"
import assert from "node:assert/strict"
import {
  createObjectListScope,
  resolveObjectListAutoSearchState,
  resolveObjectListDisplayState,
  resolveObjectListLoadButtonMode,
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
    }),
    "filtered-loading",
  )
})

test("resolveObjectListDisplayState keeps searching while unsearched objects remain", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "backup",
      filteredCount: 0,
      loadedCount: 25,
      hasMore: true,
      loading: false,
    }),
    "filtered-loading",
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
    }),
    "empty",
  )
})

test("resolveObjectListAutoSearchState auto-searches while a term is set, more remains, and it isn't stopped", () => {
  assert.deepEqual(resolveObjectListAutoSearchState(true, true, false), {
    isAutoSearching: true,
    canResumeSearch: false,
  })
})

test("resolveObjectListAutoSearchState offers resume once auto-search is stopped with more remaining", () => {
  assert.deepEqual(resolveObjectListAutoSearchState(true, true, true), {
    isAutoSearching: false,
    canResumeSearch: true,
  })
})

test("resolveObjectListAutoSearchState does nothing once everything has been loaded", () => {
  assert.deepEqual(resolveObjectListAutoSearchState(true, false, false), {
    isAutoSearching: false,
    canResumeSearch: false,
  })
})

test("resolveObjectListAutoSearchState does nothing without an active search term", () => {
  assert.deepEqual(resolveObjectListAutoSearchState(false, true, false), {
    isAutoSearching: false,
    canResumeSearch: false,
  })
})

test("resolveObjectListLoadButtonMode prioritizes stopping an active auto-search", () => {
  assert.equal(
    resolveObjectListLoadButtonMode({ isAutoSearching: true, canResumeSearch: false, loading: true, hasMore: true }),
    "stop",
  )
})

test("resolveObjectListLoadButtonMode offers resume over a plain manual load when search was stopped", () => {
  assert.equal(
    resolveObjectListLoadButtonMode({
      isAutoSearching: false,
      canResumeSearch: true,
      loading: false,
      hasMore: true,
    }),
    "resume",
  )
})

test("resolveObjectListLoadButtonMode reports loading for a plain in-flight fetch", () => {
  assert.equal(
    resolveObjectListLoadButtonMode({ isAutoSearching: false, canResumeSearch: false, loading: true, hasMore: true }),
    "loading",
  )
})

test("resolveObjectListLoadButtonMode offers a manual load when more remains and nothing is in flight", () => {
  assert.equal(
    resolveObjectListLoadButtonMode({
      isAutoSearching: false,
      canResumeSearch: false,
      loading: false,
      hasMore: true,
    }),
    "load",
  )
})

test("resolveObjectListLoadButtonMode reports done once nothing remains", () => {
  assert.equal(
    resolveObjectListLoadButtonMode({
      isAutoSearching: false,
      canResumeSearch: false,
      loading: false,
      hasMore: false,
    }),
    "done",
  )
})
