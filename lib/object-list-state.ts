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

export type ObjectListDisplayState = "loading" | "empty" | "filtered-loading" | "filtered-empty" | "content"

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

  if (loading || hasMore) return "filtered-loading"
  return "filtered-empty"
}

export interface ObjectListAutoSearchState {
  isAutoSearching: boolean
  canResumeSearch: boolean
}

export function resolveObjectListAutoSearchState(
  hasSearchTerm: boolean,
  hasMore: boolean,
  stopped: boolean,
): ObjectListAutoSearchState {
  const isSearchable = hasSearchTerm && hasMore
  return {
    isAutoSearching: isSearchable && !stopped,
    canResumeSearch: isSearchable && stopped,
  }
}

export type ObjectListLoadButtonMode = "stop" | "resume" | "loading" | "load" | "done"

interface ObjectListLoadButtonModeParams {
  isAutoSearching: boolean
  canResumeSearch: boolean
  loading: boolean
  hasMore: boolean
}

export function resolveObjectListLoadButtonMode({
  isAutoSearching,
  canResumeSearch,
  loading,
  hasMore,
}: ObjectListLoadButtonModeParams): ObjectListLoadButtonMode {
  if (isAutoSearching) return "stop"
  if (canResumeSearch) return "resume"
  if (loading) return "loading"
  if (hasMore) return "load"
  return "done"
}
