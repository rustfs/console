export const OBJECT_LIST_DEFAULT_PAGE_SIZE = 100

export const OBJECT_LIST_PAGE_SIZE_OPTIONS = [25, 50, 100, 500, 1000] as const

export type ObjectListPageSize = (typeof OBJECT_LIST_PAGE_SIZE_OPTIONS)[number]

export function normalizeObjectListPageSize(value: unknown): ObjectListPageSize {
  if (typeof value === "number" && OBJECT_LIST_PAGE_SIZE_OPTIONS.includes(value as ObjectListPageSize)) {
    return value as ObjectListPageSize
  }

  return OBJECT_LIST_DEFAULT_PAGE_SIZE
}
