"use client"

import * as React from "react"
import { flexRender, type Column, type Table } from "@tanstack/react-table"
import { RiArrowUpDownLine, RiArrowUpSLine, RiArrowDownSLine } from "@remixicon/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UiTable,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"

interface DataTableProps<TData> {
  table: Table<TData>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
  tableClass?: string
  stickyHeader?: boolean
  bodyHeight?: string
}

function getColumnStyles<TData>(column: Column<TData, unknown>) {
  const meta = column.columnDef.meta as { width?: number | string; minWidth?: number | string; maxWidth?: number | string } | undefined
  if (!meta) return undefined

  const styles: React.CSSProperties = {}
  if (meta.width != null) {
    styles.width = typeof meta.width === "number" ? `${meta.width}px` : meta.width
  }
  if (meta.minWidth != null) {
    styles.minWidth = typeof meta.minWidth === "number" ? `${meta.minWidth}px` : meta.minWidth
  }
  if (meta.maxWidth != null) {
    styles.maxWidth = typeof meta.maxWidth === "number" ? `${meta.maxWidth}px` : meta.maxWidth
  }
  return Object.keys(styles).length > 0 ? styles : undefined
}

function canSort<TData>(column: Column<TData, unknown>) {
  const def = column.columnDef
  if (def.enableSorting === false) return false

  const hasAccessorKey =
    Object.prototype.hasOwnProperty.call(def, "accessorKey") &&
    typeof (def as { accessorKey?: unknown }).accessorKey === "string" &&
    ((def as { accessorKey: string }).accessorKey?.length ?? 0) > 0

  const hasAccessorFn =
    Object.prototype.hasOwnProperty.call(def, "accessorFn") &&
    typeof (def as { accessorFn?: unknown }).accessorFn === "function"

  return hasAccessorKey || hasAccessorFn
}

export function DataTable<TData>({
  table,
  isLoading = false,
  emptyTitle = "No data",
  emptyDescription = "There is nothing to display yet.",
  className,
  tableClass,
  stickyHeader = false,
  bodyHeight,
}: DataTableProps<TData>) {
  const visibleColumnCount = table.getVisibleLeafColumns().length
  const hasRows = table.getRowModel().rows.length > 0

  const tableContent = (
    <UiTable className={cn(bodyHeight ? tableClass : "border rounded-md", tableClass)}>
      <TableHeader className={stickyHeader ? "sticky top-0 z-10 bg-muted/40 backdrop-blur" : ""}>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            className={stickyHeader ? "bg-muted/40 backdrop-blur" : undefined}
          >
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={bodyHeight ? undefined : "py-2"}
                style={getColumnStyles(header.column)}
              >
                {!header.isPlaceholder && (
                  <>
                    {canSort(header.column) ? (
                      <button
                        type="button"
                        className="flex items-center gap-2 cursor-pointer select-none hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? (
                          <RiArrowUpSLine className="size-4" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <RiArrowDownSLine className="size-4" />
                        ) : (
                          <RiArrowUpDownLine className="size-4 text-muted-foreground opacity-50" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </>
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={visibleColumnCount} className="h-48 text-center align-middle">
              <div className="flex flex-col items-center gap-2">
                <Spinner className="size-6" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : hasRows ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className="transition-colors hover:bg-muted/40"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={bodyHeight ? undefined : "py-2"}
                  style={getColumnStyles(cell.column)}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={visibleColumnCount} className="h-48">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </UiTable>
  )

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {bodyHeight ? (
        <ScrollArea className={cn("rounded-md border", bodyHeight)}>
          {tableContent}
        </ScrollArea>
      ) : (
        tableContent
      )}
    </div>
  )
}
