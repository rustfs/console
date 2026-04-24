interface ResolveDataTablePaginationOptions {
  disablePagination?: boolean
  manualPagination?: boolean
  pageSize?: number
  dataLength?: number
}

export function resolveDataTablePagination({
  disablePagination = false,
  manualPagination = false,
  pageSize,
  dataLength = 0,
}: ResolveDataTablePaginationOptions) {
  return {
    manualPagination: disablePagination || manualPagination,
    pageSize: disablePagination ? Math.max(dataLength, 1) : (pageSize ?? 10),
  }
}
