import test from "node:test"
import assert from "node:assert/strict"
import {
  createObjectListScope,
  deletedObjectAccessibleLabelKey,
  isDeletedObjectListEntry,
  readObjectListDeletedViewDefault,
  resolveObjectListDeletedView,
  shouldShowObjectListRow,
  shouldResetObjectListSearch,
  resolveObjectListDisplayState,
  shouldApplyObjectListResponse,
  shouldResetObjectListPagination,
} from "../../lib/object-list-state"

test("isDeletedObjectListEntry flags an entry without an ETag when deleted objects are shown", () => {
  assert.equal(isDeletedObjectListEntry({}, true), true)
})

test("isDeletedObjectListEntry ignores entries that carry an ETag", () => {
  assert.equal(isDeletedObjectListEntry({ ETag: '"d41d8cd98f00b204e9800998ecf8427e"' }, true), false)
})

test("isDeletedObjectListEntry never flags entries when deleted objects are hidden", () => {
  assert.equal(isDeletedObjectListEntry({}, false), false)
})

test("shouldShowObjectListRow keeps every row when only-deleted is off", () => {
  assert.equal(shouldShowObjectListRow({ type: "object", deleted: false }, false), true)
  assert.equal(shouldShowObjectListRow({ type: "object", deleted: true }, false), true)
})

test("shouldShowObjectListRow narrows to deleted objects when only-deleted is on", () => {
  assert.equal(shouldShowObjectListRow({ type: "object", deleted: true }, true), true)
  assert.equal(shouldShowObjectListRow({ type: "object", deleted: false }, true), false)
})

test("shouldShowObjectListRow keeps prefix rows navigable when only-deleted is on", () => {
  assert.equal(shouldShowObjectListRow({ type: "prefix", deleted: false }, true), true)
})

test("resolveObjectListDisplayState treats only-deleted narrowing as filtering", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "",
      filteredCount: 0,
      loadedCount: 10,
      hasMore: false,
      loading: false,
      onlyDeleted: true,
    }),
    "filtered-empty",
  )
})

test("resolveObjectListDisplayState keeps loading more rows visible under only-deleted", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "",
      filteredCount: 0,
      loadedCount: 10,
      hasMore: true,
      loading: false,
      onlyDeleted: true,
    }),
    "filtered-partial",
  )
})

test("shouldResetObjectListSearch returns true when the prefix changes", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "",
    pageSize: 25,
    includeDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    includeDeleted: false,
  })

  assert.equal(shouldResetObjectListSearch(previousScope, nextScope), true)
})

test("shouldResetObjectListSearch returns true when the bucket changes", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "",
    pageSize: 25,
    includeDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-b",
    prefix: "",
    pageSize: 25,
    includeDeleted: false,
  })

  assert.equal(shouldResetObjectListSearch(previousScope, nextScope), true)
})

test("shouldResetObjectListSearch ignores non-location scope changes", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    includeDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 50,
    includeDeleted: true,
  })

  assert.equal(shouldResetObjectListSearch(previousScope, nextScope), false)
})

test("shouldResetObjectListPagination returns false for the same listing scope", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    includeDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    includeDeleted: false,
  })

  assert.equal(shouldResetObjectListPagination(previousScope, nextScope), false)
})

test("shouldResetObjectListPagination returns true when prefix changes", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "folder-a/",
    pageSize: 25,
    includeDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "",
    pageSize: 25,
    includeDeleted: false,
  })

  assert.equal(shouldResetObjectListPagination(previousScope, nextScope), true)
})

test("shouldResetObjectListPagination returns true when the bucket changes", () => {
  const previousScope = createObjectListScope({
    bucket: "bucket-a",
    prefix: "",
    pageSize: 25,
    includeDeleted: false,
  })
  const nextScope = createObjectListScope({
    bucket: "bucket-b",
    prefix: "",
    pageSize: 25,
    includeDeleted: false,
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
        includeDeleted: false,
      }),
      activeScope: createObjectListScope({
        bucket: "bucket-a",
        prefix: "",
        pageSize: 25,
        includeDeleted: false,
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
        includeDeleted: false,
      }),
      activeScope: createObjectListScope({
        bucket: "bucket-a",
        prefix: "",
        pageSize: 25,
        includeDeleted: false,
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
    includeDeleted: false,
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

test("resolveObjectListDisplayState reports when unsearched objects remain", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "backup",
      filteredCount: 0,
      loadedCount: 25,
      hasMore: true,
      loading: false,
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

test("an empty protected-list page with a continuation token is partial", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "",
      filteredCount: 0,
      loadedCount: 0,
      hasMore: true,
      loading: false,
    }),
    "partial",
  )
})

test("continuing an empty protected-list page displays loading", () => {
  assert.equal(
    resolveObjectListDisplayState({
      searchTerm: "",
      filteredCount: 0,
      loadedCount: 0,
      hasMore: true,
      loading: true,
    }),
    "loading",
  )
})

test("resolveObjectListDeletedView passes through the three known views", () => {
  assert.equal(resolveObjectListDeletedView("hide"), "hide")
  assert.equal(resolveObjectListDeletedView("show"), "show")
  assert.equal(resolveObjectListDeletedView("only"), "only")
})

test("resolveObjectListDeletedView falls back to hide for unknown values", () => {
  assert.equal(resolveObjectListDeletedView("everything"), "hide")
  assert.equal(resolveObjectListDeletedView(true), "hide")
  assert.equal(resolveObjectListDeletedView(null), "hide")
  assert.equal(resolveObjectListDeletedView(undefined), "hide")
})

test("readObjectListDeletedViewDefault hides deleted objects without storage", () => {
  assert.equal(readObjectListDeletedViewDefault(), "hide")
  assert.equal(readObjectListDeletedViewDefault({ getItem: () => null }), "hide")
})

test("readObjectListDeletedViewDefault migrates a legacy show-deleted flag", () => {
  const values = new Map([["object-list-show-deleted", "true"]])
  const storage = { getItem: (key: string) => values.get(key) ?? null }

  assert.equal(readObjectListDeletedViewDefault(storage), "show")
})

test("readObjectListDeletedViewDefault ignores the legacy flag once the view key exists", () => {
  const values = new Map([
    ["object-list-show-deleted", "true"],
    ["object-list-deleted-view", '"only"'],
  ])
  const storage = { getItem: (key: string) => values.get(key) ?? null }

  assert.equal(readObjectListDeletedViewDefault(storage), "hide")
})

test("readObjectListDeletedViewDefault treats a legacy false flag as hidden", () => {
  const values = new Map([["object-list-show-deleted", "false"]])
  const storage = { getItem: (key: string) => values.get(key) ?? null }

  assert.equal(readObjectListDeletedViewDefault(storage), "hide")
})

test("readObjectListDeletedViewDefault survives storage failures", () => {
  const storage = {
    getItem: () => {
      throw new Error("denied")
    },
  }

  assert.equal(readObjectListDeletedViewDefault(storage), "hide")
})

test("deletedObjectAccessibleLabelKey marks deleted rows with a state label", () => {
  assert.equal(deletedObjectAccessibleLabelKey(true), "Deleted")
})

test("deletedObjectAccessibleLabelKey keeps live rows at the bare filename", () => {
  assert.equal(deletedObjectAccessibleLabelKey(false), null)
})
