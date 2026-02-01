"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
  className?: string
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation()
  const pagination = table.getState().pagination
  const currentPage = pagination.pageIndex + 1
  const pageCount = table.getPageCount()
  const canPrevious = table.getCanPreviousPage()
  const canNext = table.getCanNextPage()

  const handlePageSizeChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isNaN(parsed)) {
      table.setPageSize(parsed)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{t("Rows per page")}</span>
        <Select
          value={String(pagination.pageSize)}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("Page {current} of {total}", {
            current: pageCount === 0 ? 0 : currentPage,
            total: pageCount,
          })}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrevious}
            onClick={() => table.setPageIndex(0)}
          >
            {t("First")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrevious}
            onClick={() => table.previousPage()}
          >
            {t("Prev")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => table.nextPage()}
          >
            {t("Next")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => table.setPageIndex(Math.max(pageCount - 1, 0))}
          >
            {t("Last")}
          </Button>
        </div>
      </div>
    </div>
  )
}
