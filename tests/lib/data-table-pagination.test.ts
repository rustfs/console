import test from "node:test"
import assert from "node:assert/strict"
import { resolveDataTablePagination } from "../../lib/data-table-pagination.js"

test("resolveDataTablePagination disables pagination and expands page size when requested", () => {
  assert.deepEqual(
    resolveDataTablePagination({
      disablePagination: true,
      manualPagination: false,
      pageSize: 10,
      dataLength: 27,
    }),
    {
      manualPagination: true,
      pageSize: 27,
    },
  )
})

test("resolveDataTablePagination keeps the configured page size when pagination stays enabled", () => {
  assert.deepEqual(
    resolveDataTablePagination({
      disablePagination: false,
      manualPagination: false,
      pageSize: 10,
      dataLength: 27,
    }),
    {
      manualPagination: false,
      pageSize: 10,
    },
  )
})
