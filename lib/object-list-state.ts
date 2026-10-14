export interface ObjectListScope {
  bucket: string
  prefix: string
  pageSize: number
  /** Wire-level flag: whether the listing request asks for delete markers. */
  includeDeleted: boolean
}

export type ObjectListDeletedView = "hide" | "show" | "only"

export const OBJECT_LIST_DELETED_VIEW_STORAGE_KEY = "object-list-deleted-view"
const LEGACY_OBJECT_LIST_SHOW_DELETED_STORAGE_KEY = "object-list-show-deleted"

/**
 * Deleted-object visibility is a single three-state choice; only the known
 * views survive so corrupted storage values cannot reach the wire flag.
 */
export function resolveObjectListDeletedView(value: unknown): ObjectListDeletedView {
  return value === "show" || value === "only" ? value : "hide"
}

/**
 * Default for the deleted-view setting, honoring the boolean
 * "object-list-show-deleted" flag stored by earlier console versions.
 */
export function readObjectListDeletedViewDefault(storage?: {
  getItem(key: string): string | null
}): ObjectListDeletedView {
  try {
    const store = storage ?? (typeof window === "undefined" ? undefined : window.localStorage)
    if (!store) return "hide"
    if (store.getItem(OBJECT_LIST_DELETED_VIEW_STORAGE_KEY) !== null) return "hide"
    return store.getItem(LEGACY_OBJECT_LIST_SHOW_DELETED_STORAGE_KEY) === "true" ? "show" : "hide"
  } catch {
    return "hide"
  }
}

/**
 * RustFS serializes delete-marker rows in an include-deleted ListObjectsV2
 * response without an ETag element, while live objects always carry one.
 */
export function isDeletedObjectListEntry(entry: { ETag?: string }, includeDeleted: boolean): boolean {
  return includeDeleted && entry.ETag == null
}

/**
 * Screen readers do not announce <del> styling, so a deleted row must carry
 * the state as text. Returns the i18n key for the accessible suffix, or null
 * when the accessible name is just the filename.
 */
export function deletedObjectAccessibleLabelKey(deleted: boolean): "Deleted" | null {
  return deleted ? "Deleted" : null
}

/**
 * "Show only deleted objects" is a client-side narrowing over an
 * include-deleted listing: prefix rows stay visible so users can still
 * navigate into folders holding deleted objects.
 */
export function shouldShowObjectListRow(
  row: { type: "prefix" | "object"; deleted: boolean },
  onlyDeleted: boolean,
): boolean {
  return !onlyDeleted || row.type === "prefix" || row.deleted
}

interface ObjectListResponseGuardParams {
  requestId: number
  activeRequestId: number
  requestScope: ObjectListScope
  activeScope: ObjectListScope
}

export type ObjectListDisplayState =
  | "loading"
  | "empty"
  | "partial"
  | "filtered-loading"
  | "filtered-partial"
  | "filtered-empty"
  | "content"

interface ObjectListDisplayStateParams {
  searchTerm: string
  filteredCount: number
  loadedCount: number
  hasMore: boolean
  loading: boolean
  onlyDeleted?: boolean
}

export function createObjectListScope(scope: ObjectListScope): ObjectListScope {
  return scope
}

export function isSameObjectListScope(left: ObjectListScope, right: ObjectListScope): boolean {
  return (
    left.bucket === right.bucket &&
    left.prefix === right.prefix &&
    left.pageSize === right.pageSize &&
    left.includeDeleted === right.includeDeleted
  )
}

export function shouldResetObjectListPagination(previousScope: ObjectListScope, nextScope: ObjectListScope): boolean {
  return !isSameObjectListScope(previousScope, nextScope)
}

export function shouldResetObjectListSearch(previousScope: ObjectListScope, nextScope: ObjectListScope): boolean {
  return previousScope.bucket !== nextScope.bucket || previousScope.prefix !== nextScope.prefix
}

export function shouldApplyObjectListResponse({
  requestId,
  activeRequestId,
  requestScope,
  activeScope,
}: ObjectListResponseGuardParams): boolean {
  return requestId === activeRequestId && isSameObjectListScope(requestScope, activeScope)
}

export function resolveObjectListDisplayState({
  searchTerm,
  filteredCount,
  loadedCount,
  hasMore,
  loading,
  onlyDeleted = false,
}: ObjectListDisplayStateParams): ObjectListDisplayState {
  if (filteredCount > 0) return "content"

  const isFiltering = searchTerm.trim().length > 0 || onlyDeleted
  if (!isFiltering) {
    if (loading && loadedCount === 0) return "loading"
    return hasMore ? "partial" : "empty"
  }

  if (loading) return "filtered-loading"
  if (hasMore) return "filtered-partial"
  return "filtered-empty"
}
