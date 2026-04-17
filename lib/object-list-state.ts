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
