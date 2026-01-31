"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  RiAddLine,
  RiRefreshLine,
  RiDeleteBin5Line,
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useEventTarget } from "@/hooks/use-event-target"
import { useDialog } from "@/lib/ui/dialog"
import { useMessage } from "@/lib/ui/message"
import type { ColumnDef } from "@tanstack/react-table"

interface RowData {
  account_id: string
  service: string
  status: string
}

export default function EventsTargetPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { getEventsTargetList, deleteEventTarget } = useEventTarget()

  const [data, setData] = useState<RowData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getEventsTargetList()
      const list = (response?.notification_endpoints ?? []) as RowData[]
      setData(list)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [getEventsTargetList])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter(
      (row) =>
        row.account_id?.toLowerCase().includes(term) ||
        row.service?.toLowerCase().includes(term)
    )
  }, [data, searchTerm])

  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        accessorKey: "account_id",
        header: () => t("Event Destinations"),
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.account_id}
          </span>
        ),
      },
      {
        accessorKey: "service",
        header: () => t("Type"),
        cell: ({ row }) => (
          <span>{row.original.service}</span>
        ),
      },
      {
        accessorKey: "status",
        header: () => t("Status"),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "enable" ? "secondary" : "outline"
            }
          >
            {row.original.status === "enable"
              ? t("Enabled")
              : row.original.status || "-"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        enableHiding: false,
        meta: { width: 90 },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => confirmDelete(row.original)}
            >
              <RiDeleteBin5Line className="size-4" aria-hidden />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        ),
      },
    ],
    [t]
  )

  const { table } = useDataTable<RowData>({
    data: filteredData,
    columns,
    getRowId: (row) => `${row.service}-${row.account_id}`,
  })

  const confirmDelete = (row: RowData) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this destination?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => deleteItem(row),
    })
  }

  const deleteItem = async (row: RowData) => {
    try {
      await deleteEventTarget(`notify_${row.service}`, row.account_id)
      message.success(t("Delete Success"))
      loadData()
    } catch (error) {
      console.error(error)
      message.error(t("Delete Failed"))
    }
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t("Search")}
                clearable
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => message.info(t("Coming soon"))}
            >
              <RiAddLine className="size-4" aria-hidden />
              <span>{t("Add Event Destination")}</span>
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">
          {t("Event Destinations")}
        </h1>
      </PageHeader>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Destinations")}
        emptyDescription={t(
          "Create an event destination to forward notifications."
        )}
      />
    </Page>
  )
}
