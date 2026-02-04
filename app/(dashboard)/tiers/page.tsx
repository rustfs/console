"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine, RiKey2Line, RiDeleteBin5Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useTiers, type TierRow, type TierConfig } from "@/hooks/use-tiers"
import { TiersNewForm } from "@/components/tiers/new-form"
import { TiersChangeKey } from "@/components/tiers/change-key"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

function getConfig(row: TierRow): TierConfig | undefined {
  switch (row.type) {
    case "rustfs":
      return row.rustfs
    case "minio":
      return row.minio
    case "s3":
      return row.s3
    case "aliyun":
      return row.aliyun
    case "tencent":
      return row.tencent
    case "huaweicloud":
      return row.huaweicloud
    case "azure":
      return row.azure
    case "gcs":
      return row.gcs
    case "r2":
      return row.r2
    default:
      return undefined
  }
}

export default function TiersPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { listTiers, removeTiers } = useTiers()

  const [data, setData] = useState<TierRow[]>([])
  const [loading, setLoading] = useState(false)
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [changeKeyOpen, setChangeKeyOpen] = useState(false)
  const [selectedTierName, setSelectedTierName] = useState("")

  const loadTiers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await listTiers()
      setData(response ?? [])
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [listTiers])

  useEffect(() => {
    loadTiers()
  }, [loadTiers])

  const columns: ColumnDef<TierRow>[] = useMemo(
    () => [
      {
        header: () => t("Tier Type"),
        accessorKey: "type",
        cell: ({ row }) => <span className="capitalize">{row.original.type || "-"}</span>,
      },
      {
        id: "name",
        header: () => t("Name"),
        accessorFn: (row) => getConfig(row)?.name || "-",
      },
      {
        id: "endpoint",
        header: () => t("Endpoint"),
        accessorFn: (row) => getConfig(row)?.endpoint || "-",
      },
      {
        id: "bucket",
        header: () => t("Bucket"),
        accessorFn: (row) => getConfig(row)?.bucket || "-",
      },
      {
        id: "prefix",
        header: () => t("Prefix"),
        accessorFn: (row) => getConfig(row)?.prefix || "-",
      },
      {
        id: "region",
        header: () => t("Region"),
        accessorFn: (row) => getConfig(row)?.region || "-",
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const cfg = getConfig(row.original)
                setSelectedTierName(cfg?.name || "")
                setChangeKeyOpen(true)
              }}
            >
              <RiKey2Line className="size-4" aria-hidden />
              <span>{t("Update Key")}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => confirmDelete(row.original)}>
              <RiDeleteBin5Line className="size-4" aria-hidden />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        ),
      },
    ],
    [t],
  )

  const { table } = useDataTable<TierRow>({
    data,
    columns,
    getRowId: (row) => `${row.type}-${getConfig(row)?.name}`,
  })

  const confirmDelete = (row: TierRow) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this tier?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => deleteTier(row),
    })
  }

  const deleteTier = async (row: TierRow) => {
    try {
      const name = getConfig(row)?.name || ""
      await removeTiers(name)
      message.success(t("Delete Success"))
      loadTiers()
    } catch (error) {
      message.error((error as Error).message || t("Delete Failed"))
    }
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => setNewFormOpen(true)}>
              <RiAddLine className="size-4" aria-hidden />
              <span>{t("Add Tier")}</span>
            </Button>
            <Button variant="outline" onClick={loadTiers}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Tiers")}</h1>
      </PageHeader>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Tiers")}
        emptyDescription={t("Add tiers to configure remote storage destinations.")}
      />

      <TiersNewForm open={newFormOpen} onOpenChange={setNewFormOpen} onSuccess={loadTiers} />
      <TiersChangeKey
        open={changeKeyOpen}
        onOpenChange={setChangeKeyOpen}
        tierName={selectedTierName}
        onSuccess={loadTiers}
      />
    </Page>
  )
}
