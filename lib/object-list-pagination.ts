export const OBJECT_LIST_DEFAULT_PAGE_SIZE = 1000
export const OBJECT_LIST_PAGE_SIZE_OPTIONS = [100, 250, 500, OBJECT_LIST_DEFAULT_PAGE_SIZE] as const

export function resolveObjectListPageSize(value: unknown): number {
  return OBJECT_LIST_PAGE_SIZE_OPTIONS.find((pageSize) => pageSize === value) ?? OBJECT_LIST_DEFAULT_PAGE_SIZE
}
