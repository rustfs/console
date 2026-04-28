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
import { useAuditTarget } from "@/hooks/use-audit-target"
import { useModuleSwitches } from "@/hooks/use-module-switches"
import { AuditTargetNewForm } from "@/components/audit-target/new-form"
import { canManageAuditTargets } from "@/lib/audit-target-access"
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

export default function AuditTargetPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { getAuditTargetList, deleteAuditTarget } = useAuditTarget()
  const { getModuleSwitches } = useModuleSwitches()

  const [data, setData] = useState<RowData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [auditEnabled, setAuditEnabled] = useState<boolean | undefined>(undefined)

  const canManageTargets = canManageAuditTargets(auditEnabled)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [response, switches] = await Promise.allSettled([
        getAuditTargetList(),
        getModuleSwitches({ suppress403Redirect: true }),
      ])

      if (switches.status === "fulfilled" && switches.value) {
        setAuditEnabled(switches.value.audit_enabled)
      }

      if (response.status === "rejected") {
        throw response.reason
      }

      const list = (response.value?.audit_endpoints ?? []) as RowData[]
      setData(list)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [getAuditTargetList, getModuleSwitches])

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
      if (!canManageTargets) {
        message.warning(t("Audit is disabled. Enable audit before managing audit targets."))
        return
      }

      try {
        await deleteAuditTarget(`audit_${row.service}`, row.account_id)
        message.success(t("Delete Success"))
        loadData()
      } catch (error) {
        console.error(error)
        const msg = (error as Error)?.message || t("Delete Failed")
        message.error(msg)
      }
    },
    [canManageTargets, deleteAuditTarget, loadData, message, t],
  )

  const confirmDelete = useCallback(
    (row: RowData) => {
      if (!canManageTargets) return
      if (!isConfigSource(row.source)) return

      dialog.error({
        title: t("Warning"),
        content: t("Are you sure you want to delete this audit target?"),
        positiveText: t("Confirm"),
        negativeText: t("Cancel"),
        onPositiveClick: () => deleteItem(row),
      })
    },
    [canManageTargets, deleteItem, dialog, t],
  )

  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        accessorKey: "account_id",
        header: () => t("Audit Targets"),
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
          <Badge variant={row.original.status === "online" ? "secondary" : "outline"}>
            {row.original.status === "online" ? t("Online") : row.original.status || "-"}
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
                disabled={!canManageTargets}
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
    [canManageTargets, confirmDelete, t],
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
            <Button variant="outline" onClick={() => setNewFormOpen(true)} disabled={!canManageTargets}>
              <RiAddLine className="size-4" aria-hidden />
              <span>{t("Add Audit Target")}</span>
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Audit Targets")}</h1>
      </PageHeader>

      {!canManageTargets ? (
        <Alert>
          <AlertTitle>{t("Audit is disabled")}</AlertTitle>
          <AlertDescription>{t("Enable audit in Settings before managing audit targets.")}</AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Audit Targets")}
        emptyDescription={t("Create an audit target to forward audit logs.")}
      />

      <AuditTargetNewForm open={newFormOpen} onOpenChange={setNewFormOpen} onSuccess={loadData} />
    </Page>
  )
}
