"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine, RiDeleteBin5Line } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useEventTarget } from "@/hooks/use-event-target"
import { useModuleSwitches } from "@/hooks/use-module-switches"
import { EventsTargetNewForm } from "@/components/events-target/new-form"
import { canManageEventDestinations } from "@/lib/event-destinations-access"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

interface RowData {
  account_id: string
  service: string
  status: string
  source?: string
}

function isConfigSource(source: string | undefined) {
  return source === "config"
}

export default function EventsTargetPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { getEventsTargetList, deleteEventTarget } = useEventTarget()
  const { getModuleSwitches } = useModuleSwitches()

  const [data, setData] = useState<RowData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState<boolean | undefined>(undefined)

  const canManageDestinations = canManageEventDestinations(notifyEnabled)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [response, switches] = await Promise.allSettled([
        getEventsTargetList(),
        getModuleSwitches({ suppress403Redirect: true }),
      ])

      if (switches.status === "fulfilled" && switches.value) {
        setNotifyEnabled(switches.value.notify_enabled)
      }

      if (response.status === "rejected") {
        throw response.reason
      }

      const list = (response.value?.notification_endpoints ?? []) as RowData[]
      setData(list)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [getEventsTargetList, getModuleSwitches])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter(
      (row) =>
        row.account_id?.toLowerCase().includes(term) ||
        row.service?.toLowerCase().includes(term) ||
        row.source?.toLowerCase().includes(term),
    )
  }, [data, searchTerm])

  const deleteItem = useCallback(
    async (row: RowData) => {
      if (!canManageDestinations) {
        message.warning(t("Notify is disabled. Enable notify before managing event destinations."))
        return
      }

      try {
        await deleteEventTarget(`notify_${row.service}`, row.account_id)
        message.success(t("Delete Success"))
        loadData()
      } catch (error) {
        console.error(error)
        const msg = (error as Error)?.message || t("Delete Failed")
        message.error(msg)
      }
    },
    [canManageDestinations, deleteEventTarget, loadData, message, t],
  )

  const confirmDelete = useCallback(
    (row: RowData) => {
      if (!canManageDestinations) return
      if (!isConfigSource(row.source)) return

      dialog.error({
        title: t("Warning"),
        content: t("Are you sure you want to delete this destination?"),
        positiveText: t("Confirm"),
        negativeText: t("Cancel"),
        onPositiveClick: () => deleteItem(row),
      })
    },
    [canManageDestinations, deleteItem, dialog, t],
  )

  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        accessorKey: "account_id",
        header: () => t("Event Destinations"),
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.account_id}</span>,
      },
      {
        accessorKey: "service",
        header: () => t("Type"),
        cell: ({ row }) => <span>{row.original.service}</span>,
      },
      {
        accessorKey: "status",
        header: () => t("Status"),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "enable" ? "secondary" : "outline"}>
            {row.original.status === "enable" ? t("Enabled") : row.original.status || "-"}
          </Badge>
        ),
      },
      {
        accessorKey: "source",
        header: () => t("Source"),
        cell: ({ row }) => {
          const source = row.original.source

          if (!source) return <span>-</span>

          return <Badge variant={isConfigSource(source) ? "secondary" : "outline"}>{source}</Badge>
        },
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        enableHiding: false,
        meta: { width: 90 },
        cell: ({ row }) =>
          isConfigSource(row.original.source) ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmDelete(row.original)}
                disabled={!canManageDestinations}
              >
                <RiDeleteBin5Line className="size-4" aria-hidden />
                <span>{t("Delete")}</span>
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
    ],
    [canManageDestinations, confirmDelete, t],
  )

  const { table } = useDataTable<RowData>({
    data: filteredData,
    columns,
    getRowId: (row) => `${row.service}-${row.account_id}`,
  })

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
            <Button variant="outline" onClick={() => setNewFormOpen(true)} disabled={!canManageDestinations}>
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
        <h1 className="text-2xl font-bold">{t("Event Destinations")}</h1>
      </PageHeader>

      {!canManageDestinations ? (
        <Alert>
          <AlertTitle>{t("Notify is disabled")}</AlertTitle>
          <AlertDescription>{t("Enable notify in Settings before managing event destinations.")}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Destinations")}
        emptyDescription={t("Create an event destination to forward notifications.")}
      />

      <EventsTargetNewForm open={newFormOpen} onOpenChange={setNewFormOpen} onSuccess={loadData} />
    </Page>
  )
}
