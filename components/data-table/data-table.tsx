"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { flexRender, type Column, type Table } from "@tanstack/react-table"
import { RiArrowUpDownLine, RiArrowUpSLine, RiArrowDownSLine } from "@remixicon/react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table as UiTable } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"

interface DataTableProps<TData> {
  table: Table<TData>
  isLoading?: boolean
  keepPreviousData?: boolean
  errorTitle?: string
  errorDescription?: string
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  caption?: string
  toolbar?: React.ReactNode
  className?: string
  tableClass?: string
  stickyHeader?: boolean
  bodyHeight?: string
  expandedRowId?: string
  renderExpandedRow?: (row: import("@tanstack/react-table").Row<TData>) => React.ReactNode
}

function getColumnStyles<TData>(column: Column<TData, unknown>) {
  const meta = column.columnDef.meta as
    | {
        width?: number | string
        minWidth?: number | string
        maxWidth?: number | string
        align?: "start" | "end" | "center"
      }
    | undefined
  if (!meta) return undefined

  const styles: React.CSSProperties = {}
  if (meta.align) styles.textAlign = meta.align
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

function getAriaSort<TData>(column: Column<TData, unknown>): React.AriaAttributes["aria-sort"] {
  if (!canSort(column)) return undefined
  const direction = column.getIsSorted()
  if (direction === "asc") return "ascending"
  if (direction === "desc") return "descending"
  return "none"
}

export function DataTable<TData>({
  table,
  isLoading = false,
  keepPreviousData = false,
  errorTitle,
  errorDescription,
  onRetry,
  emptyTitle = "No data",
  emptyDescription = "There is nothing to display yet.",
  caption,
  toolbar,
  className,
  tableClass,
  stickyHeader = false,
  bodyHeight,
  expandedRowId,
  renderExpandedRow,
}: DataTableProps<TData>) {
  const { t } = useTranslation()
  const hasRows = table.getRowModel().rows.length > 0
  const showRows = hasRows && ((!isLoading && !errorTitle) || keepPreviousData)

  const tableContent = (
    <>
      {toolbar ? (
        <div className="table-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3 border-b p-4">
          {toolbar}
        </div>
      ) : null}
      <UiTable className={cn("min-w-full tabular-nums", tableClass)} aria-busy={isLoading}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader className={stickyHeader ? "sticky top-0 z-10 bg-muted" : "bg-muted"}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  scope="col"
                  aria-sort={getAriaSort(header.column)}
                  className={cn(
                    "font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground",
                    !bodyHeight && "py-3",
                  )}
                  style={getColumnStyles(header.column)}
                >
                  {!header.isPlaceholder && (
                    <>
                      {canSort(header.column) ? (
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-2 select-none rounded-none outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
                          style={{
                            justifyContent:
                              getColumnStyles(header.column)?.textAlign === "end" ? "flex-end" : undefined,
                          }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" ? (
                            <RiArrowUpSLine className="size-4" aria-hidden />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <RiArrowDownSLine className="size-4" aria-hidden />
                          ) : (
                            <RiArrowUpDownLine className="size-4 text-muted-foreground opacity-50" aria-hidden />
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
          {showRows
            ? table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="transition-colors hover:bg-muted/60"
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
                  {expandedRowId === row.id && renderExpandedRow ? renderExpandedRow(row) : null}
                </React.Fragment>
              ))
            : null}
        </TableBody>
      </UiTable>
      {!showRows ? (
        <div className="flex min-h-48 w-full flex-col justify-center">
          {isLoading ? (
            <div role="status" className="flex flex-col items-center gap-2 py-10">
              <Spinner className="size-6" />
              <span className="text-sm text-muted-foreground">{t("Loading…")}</span>
            </div>
          ) : errorTitle ? (
            <div role="alert">
              <EmptyState title={errorTitle} description={errorDescription}>
                {onRetry ? (
                  <Button type="button" variant="outline" onClick={onRetry}>
                    {t("Retry")}
                  </Button>
                ) : null}
              </EmptyState>
            </div>
          ) : (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          )}
        </div>
      ) : null}
    </>
  )

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {showRows && errorTitle ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-destructive">{errorTitle}</p>
            {errorDescription ? <p className="text-muted-foreground">{errorDescription}</p> : null}
          </div>
          {onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry} disabled={isLoading}>
              {t("Retry")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {showRows && isLoading ? (
        <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {t("Loading…")}
        </div>
      ) : null}
      {bodyHeight ? (
        <ScrollArea className={cn("workspace-table border bg-card", bodyHeight)}>{tableContent}</ScrollArea>
      ) : (
        <div className="workspace-table w-full border bg-card">{tableContent}</div>
      )}
    </div>
  )
}
