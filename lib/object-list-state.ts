export interface ObjectListScope {
  bucket: string
  prefix: string
  pageSize: number
  showDeleted: boolean
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
}

export function createObjectListScope(scope: ObjectListScope): ObjectListScope {
  return scope
}

export function isSameObjectListScope(left: ObjectListScope, right: ObjectListScope): boolean {
  return (
    left.bucket === right.bucket &&
    left.prefix === right.prefix &&
    left.pageSize === right.pageSize &&
    left.showDeleted === right.showDeleted
  )
}

export function shouldResetObjectListPagination(previousScope: ObjectListScope, nextScope: ObjectListScope): boolean {
  return !isSameObjectListScope(previousScope, nextScope)
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
}: ObjectListDisplayStateParams): ObjectListDisplayState {
  if (filteredCount > 0) return "content"

  const isFiltering = searchTerm.trim().length > 0
  if (!isFiltering) {
    return loading && loadedCount === 0 ? "loading" : "empty"
  }

  if (loading) return "filtered-loading"
  if (hasMore) return "filtered-partial"
  return "filtered-empty"
}
