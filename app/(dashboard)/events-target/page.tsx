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
import {
  applyEventDestinationsLoadResult,
  canManageEventDestinations,
  initialEventDestinationsState,
  resolveEventDestinationsNotifyState,
  type EventDestinationsLoadState,
} from "@/lib/event-destinations-state"
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

  const [loadState, setLoadState] = useState<EventDestinationsLoadState<RowData>>({
    ...initialEventDestinationsState,
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [newFormOpen, setNewFormOpen] = useState(false)
  const loadingRef = React.useRef(false)
  const requestVersionRef = React.useRef(0)

  const { data, loadFailed, notifyEnabled, notifyFailed } = loadState
  const canManageDestinations = canManageEventDestinations({
    notifyEnabled,
    loading,
    loadFailed,
    notifyFailed,
  })

  const loadData = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    try {
      const response = await getEventsTargetList()
      const nextNotifyEnabled = await resolveEventDestinationsNotifyState(response, () =>
        getModuleSwitches({ suppress403Redirect: true }),
      )

      if (requestVersion !== requestVersionRef.current) return
      const list = (response.notification_endpoints ?? []) as RowData[]
      setLoadState((current) =>
        applyEventDestinationsLoadResult(current, {
          ok: true,
          data: list,
          notifyEnabled: nextNotifyEnabled,
        }),
      )
    } catch {
      if (requestVersion !== requestVersionRef.current) return
      setLoadState((current) => applyEventDestinationsLoadResult(current, { ok: false }))
    } finally {
      if (requestVersion === requestVersionRef.current) {
        loadingRef.current = false
        setLoading(false)
      }
    }
  }, [getEventsTargetList, getModuleSwitches])

  useEffect(() => {
    loadData()
    return () => {
      requestVersionRef.current += 1
      loadingRef.current = false
    }
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
          <div className="grid w-full shrink-0 gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto] lg:w-auto">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("Search")}
              clearable
              className="h-11 w-full sm:h-8 sm:w-64"
            />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end lg:flex-nowrap">
              <Button
                variant="outline"
                className="h-11 w-full sm:h-8 sm:w-auto"
                onClick={() => setNewFormOpen(true)}
                disabled={!canManageDestinations}
              >
                <RiAddLine className="size-4" aria-hidden />
                <span>{t("Add Event Destination")}</span>
              </Button>
              <Button variant="outline" className="h-11 w-full sm:h-8 sm:w-auto" onClick={loadData} disabled={loading}>
                <RiRefreshLine className="size-4" aria-hidden />
                <span>{loading ? t("Refreshing…") : t("Refresh")}</span>
              </Button>
            </div>
          </div>
        }
      >
        <h1 className="text-2xl font-bold">{t("Event Destinations")}</h1>
      </PageHeader>

      {notifyEnabled === false ? (
        <Alert>
          <AlertTitle>{t("Notify is disabled")}</AlertTitle>
          <AlertDescription>{t("Enable notify in Settings before managing event destinations.")}</AlertDescription>
        </Alert>
      ) : null}

      {notifyFailed ? (
        <Alert variant="destructive">
          <AlertTitle>{t("Notify status unavailable")}</AlertTitle>
          <AlertDescription>
            {t("Unable to verify whether notify is enabled. Refresh before making changes.")}
          </AlertDescription>
        </Alert>
      ) : null}

      {loadFailed ? (
        <Alert variant="destructive">
          <AlertTitle>{t("Load Failed")}</AlertTitle>
          <AlertDescription>
            {data.length > 0 ? t("Previously loaded values may be stale.") : t("Refresh to try again.")}
          </AlertDescription>
        </Alert>
      ) : null}

      {data.length > 0 || !loadFailed ? (
        <DataTable
          table={table}
          isLoading={loading && data.length === 0}
          emptyTitle={t("No Destinations")}
          emptyDescription={t("Create an event destination to forward notifications.")}
          caption={t("Event Destinations")}
        />
      ) : null}

      <EventsTargetNewForm open={newFormOpen} onOpenChange={setNewFormOpen} onSuccess={loadData} />
    </Page>
  )
}
