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
import { useWindowVirtualizer } from "@tanstack/react-virtual"

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
  virtualizeRows?: boolean
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
  virtualizeRows = false,
  expandedRowId,
  renderExpandedRow,
}: DataTableProps<TData>) {
  const { t } = useTranslation()
  const rows = table.getRowModel().rows
  const hasRows = rows.length > 0
  const showRows = hasRows && ((!isLoading && !errorTitle) || keepPreviousData)
  const tableRootRef = React.useRef<HTMLDivElement>(null)
  const tableBodyRef = React.useRef<HTMLTableSectionElement>(null)
  const [scrollMargin, setScrollMargin] = React.useState(0)

  React.useLayoutEffect(() => {
    if (!virtualizeRows) return

    const updateScrollMargin = () => {
      const bodyTop = tableBodyRef.current?.getBoundingClientRect().top
      if (bodyTop == null) return

      const nextScrollMargin = Math.max(0, bodyTop + window.scrollY)
      setScrollMargin((current) => (current === nextScrollMargin ? current : nextScrollMargin))
    }

    updateScrollMargin()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollMargin)
    if (tableRootRef.current) observer?.observe(tableRootRef.current)
    window.addEventListener("resize", updateScrollMargin)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", updateScrollMargin)
    }
  }, [virtualizeRows])

  const getItemKey = React.useCallback((index: number) => rows[index]?.id ?? index, [rows])
  const virtualizer = useWindowVirtualizer({
    count: virtualizeRows && showRows ? rows.length : 0,
    estimateSize: () => 40,
    getItemKey,
    overscan: 12,
    scrollMargin,
    enabled: virtualizeRows,
  })
  const virtualRows = virtualizeRows ? virtualizer.getVirtualItems() : null
  const visibleRows = virtualRows ? virtualRows.map((item) => rows[item.index]!) : rows
  const topPadding = virtualRows?.length ? Math.max(0, virtualRows[0].start - scrollMargin) : 0
  const bottomPadding =
    virtualRows?.length && virtualRows.length < rows.length
      ? Math.max(0, virtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1].end - scrollMargin))
      : 0

  const tableContent = (
    <>
      {toolbar ? (
        <div className="table-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3 border-b p-4">
          {toolbar}
        </div>
      ) : null}
      <UiTable
        className={cn("min-w-full tabular-nums", tableClass)}
        aria-busy={isLoading}
        aria-rowcount={virtualizeRows ? rows.length + 1 : undefined}
      >
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
        <TableBody ref={tableBodyRef}>
          {showRows ? (
            <>
              {topPadding > 0 ? (
                <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={table.getVisibleFlatColumns().length}
                    className="border-0 p-0"
                    style={{ height: topPadding }}
                  />
                </TableRow>
              ) : null}
              {visibleRows.map((row, index) => {
                const virtualRow = virtualRows?.[index]
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      ref={virtualizeRows ? virtualizer.measureElement : undefined}
                      data-index={virtualRow?.index}
                      aria-rowindex={virtualizeRows && virtualRow ? virtualRow.index + 2 : undefined}
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
                )
              })}
              {bottomPadding > 0 ? (
                <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={table.getVisibleFlatColumns().length}
                    className="border-0 p-0"
                    style={{ height: bottomPadding }}
                  />
                </TableRow>
              ) : null}
            </>
          ) : null}
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
    <div ref={tableRootRef} className={cn("flex min-w-0 flex-col gap-4", className)}>
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
