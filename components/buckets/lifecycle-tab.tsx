"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine, RiDeleteBin5Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useBucket } from "@/hooks/use-bucket"
import { LifecycleNewForm } from "@/components/lifecycle/new-form"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

interface LifecycleRule {
  ID?: string
  Status?: string
  Filter?: {
    Prefix?: string
    Tag?: { Key: string; Value: string }
    And?: { Prefix?: string; Tags?: Array<{ Key: string; Value: string }> }
  }
  Expiration?: {
    Days?: number
    Date?: string
    StorageClass?: string
    ExpiredObjectDeleteMarker?: boolean
  }
  NoncurrentVersionExpiration?: { NoncurrentDays?: number }
  Transitions?: Array<{ Days?: number; StorageClass?: string }>
  NoncurrentVersionTransitions?: Array<{
    NoncurrentDays?: number
    StorageClass?: string
  }>
}

interface BucketLifecycleTabProps {
  bucketName: string
}

export function BucketLifecycleTab({ bucketName }: BucketLifecycleTabProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { getBucketLifecycleConfiguration, deleteBucketLifecycle, putBucketLifecycleConfiguration } = useBucket()

  const [data, setData] = React.useState<LifecycleRule[]>([])
  const [loading, setLoading] = React.useState(false)
  const [newFormOpen, setNewFormOpen] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await getBucketLifecycleConfiguration(bucketName)
      const rules = [...(response?.Rules ?? [])]
        .map((r) => r as LifecycleRule)
        .sort((a, b) => (a.ID ?? "").localeCompare(b.ID ?? ""))
      setData(rules)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [bucketName, getBucketLifecycleConfiguration])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleRowDelete = React.useCallback(
    async (row: LifecycleRule) => {
      const remaining = data.filter((item) => item.ID !== row.ID)

      try {
        if (remaining.length === 0) {
          await deleteBucketLifecycle(bucketName)
        } else {
          await putBucketLifecycleConfiguration(bucketName, {
            Rules: remaining,
          })
        }
        message.success(t("Delete Success"))
        loadData()
      } catch (error) {
        message.error((error as Error).message || t("Delete Failed"))
      }
    },
    [data, deleteBucketLifecycle, bucketName, putBucketLifecycleConfiguration, message, t, loadData],
  )

  const confirmDelete = React.useCallback(
    (row: LifecycleRule) => {
      dialog.error({
        title: t("Warning"),
        content: t("Are you sure you want to delete this rule?"),
        positiveText: t("Confirm"),
        negativeText: t("Cancel"),
        onPositiveClick: () => handleRowDelete(row),
      })
    },
    [dialog, t, handleRowDelete],
  )

  const columns: ColumnDef<LifecycleRule>[] = React.useMemo(
    () => [
      {
        id: "type",
        header: () => t("Type"),
        accessorFn: (row) => (row.Transitions || row.NoncurrentVersionTransitions ? "Transition" : "Expire"),
      },
      {
        id: "version",
        header: () => t("Version"),
        accessorFn: (row) =>
          row.NoncurrentVersionExpiration || row.NoncurrentVersionTransitions
            ? t("Non-current Version")
            : t("Current Version"),
      },
      {
        id: "deleteMarker",
        header: () => t("Expiration Delete Mark"),
        accessorFn: (row) => (row.Expiration?.ExpiredObjectDeleteMarker ? t("On") : t("Off")),
      },
      {
        id: "tier",
        header: () => t("Tier"),
        accessorFn: (row) =>
          row.Transitions?.[0]?.StorageClass || row.NoncurrentVersionTransitions?.[0]?.StorageClass || "--",
      },
      {
        id: "prefix",
        header: () => t("Prefix"),
        accessorFn: (row) => row.Filter?.Prefix || row.Filter?.And?.Prefix || "",
      },
      {
        id: "timeCycle",
        header: () => `${t("Time Cycle")} (${t("Days")})`,
        accessorFn: (row) =>
          row.Expiration?.Days ??
          row.NoncurrentVersionExpiration?.NoncurrentDays ??
          row.Transitions?.[0]?.Days ??
          row.NoncurrentVersionTransitions?.[0]?.NoncurrentDays ??
          "",
      },
      {
        id: "status",
        header: () => t("Status"),
        accessorFn: (row) => row.Status ?? "-",
        cell: ({ row }) => (
          <Badge variant={row.original.Status === "Enabled" ? "secondary" : "destructive"}>
            {row.original.Status ?? "-"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => confirmDelete(row.original)}>
              <RiDeleteBin5Line className="size-4" aria-hidden />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        ),
      },
    ],
    [t, confirmDelete],
  )

  const { table } = useDataTable<LifecycleRule>({
    data,
    columns,
    getRowId: (row) => row.ID ?? JSON.stringify(row),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("Lifecycle")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewFormOpen(true)}>
            <RiAddLine className="size-4" />
            <span>{t("Add Lifecycle Rule")}</span>
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RiRefreshLine className="size-4" />
            <span>{t("Refresh")}</span>
          </Button>
        </div>
      </div>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Data")}
        emptyDescription={t("Create lifecycle rules to automate object transitions and expiration.")}
      />

      <LifecycleNewForm open={newFormOpen} onOpenChange={setNewFormOpen} bucketName={bucketName} onSuccess={loadData} />
    </div>
  )
}
