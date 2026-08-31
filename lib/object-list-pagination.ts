export const OBJECT_LIST_DEFAULT_PAGE_SIZE = 1000
export const OBJECT_LIST_AUTO_SEARCH_DEBOUNCE_MS = 250

export function resolveObjectListPageSize(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value
  }

  return OBJECT_LIST_DEFAULT_PAGE_SIZE
}
