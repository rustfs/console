"use client"

import { Checkbox } from "@/components/ui/checkbox"
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
  TableOptions,
} from "@tanstack/react-table"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"

export interface UseDataTableOptions<TData extends RowData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  pageSize?: number
  manualPagination?: boolean
  manualSorting?: boolean
  getRowId?: TableOptions<TData>["getRowId"]
  enableRowSelection?: boolean
  initialSorting?: SortingState
}

export interface UseDataTableReturn<TData extends RowData> {
  table: ReturnType<typeof useReactTable<TData>>
  selectedRows: TData[]
  selectedRowIds: string[]
}

function createSelectColumn<TData extends RowData>(): ColumnDef<TData> {
  return {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    size: 48,
  }
}

export function useDataTable<TData extends RowData>(options: UseDataTableOptions<TData>): UseDataTableReturn<TData> {
  const [sorting, setSorting] = useState<SortingState>(options.initialSorting ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: options.pageSize ?? 10,
  })

  const columns = useMemo(() => {
    const base = options.columns
    if (options.enableRowSelection) {
      return [createSelectColumn<TData>(), ...base]
    }
    return base
  }, [options.columns, options.enableRowSelection])

  // eslint-disable-next-line react-hooks/incompatible-library -- tanstack table hook is required for table state
  const table = useReactTable({
    data: options.data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
    },
    enableSorting: !options.manualSorting,
    enableRowSelection: options.enableRowSelection ?? false,
    manualSorting: options.manualSorting ?? false,
    manualPagination: options.manualPagination ?? false,
    getRowId: options.getRowId,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: options.manualPagination ? undefined : getPaginationRowModel(),
    // Library resets pageIndex during render when data changes, which can trigger setState
    // before commit (e.g. on route change). We do the reset in useEffect instead.
    autoResetPageIndex: false,
  })

  // Reset to first page when data changes (after commit). Replaces autoResetPageIndex
  // so we don't update state during render.
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
  }, [options.data])

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
  const selectedRowIds = table.getSelectedRowModel().rows.map((row) => row.id)

  return {
    table,
    selectedRows,
    selectedRowIds,
  }
}
