"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine, RiDeleteBin7Line } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useBucket } from "@/hooks/use-bucket"
import { usePermissions } from "@/hooks/use-permissions"
import { ReplicationNewForm } from "@/components/replication/new-form"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { isMissingBucketConfiguration, removeMatchingBucketRule } from "@/lib/bucket-configuration"
import type { ColumnDef } from "@tanstack/react-table"

interface ReplicationRule {
  ID?: string
  Status?: string
  Priority?: number
  Filter?: { Prefix?: string }
  Destination?: { Bucket?: string; StorageClass?: string }
}

interface BucketReplicationTabProps {
  bucketName: string
  hideTitle?: boolean
  renderHeader?: (actions: React.ReactNode) => React.ReactNode
}

export function BucketReplicationTab({ bucketName, hideTitle = false, renderHeader }: BucketReplicationTabProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { canCapability } = usePermissions()
  const { getBucketReplication, putBucketReplication, deleteBucketReplication, deleteRemoteReplicationTarget } =
    useBucket()
  const replicationContext = React.useMemo(() => ({ bucket: bucketName }), [bucketName])
  const canEditReplication = canCapability("bucket.replication.edit", replicationContext)

  const [data, setData] = React.useState<ReplicationRule[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [mutatingRuleId, setMutatingRuleId] = React.useState<string | null>(null)
  const [newFormOpen, setNewFormOpen] = React.useState(false)
  const requestVersionRef = React.useRef(0)

  const loadData = React.useCallback(async () => {
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    try {
      const res = await getBucketReplication(bucketName)
      if (requestVersion !== requestVersionRef.current) return
      setData(res?.ReplicationConfiguration?.Rules ?? [])
      setLoadError("")
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) return
      if (isMissingBucketConfiguration(error, "replication")) {
        setData([])
        setLoadError("")
      } else {
        setLoadError(t("Unable to load replication rules. Refresh before making changes."))
      }
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false)
    }
  }, [bucketName, getBucketReplication, t])

  React.useEffect(() => {
    loadData()
    return () => {
      requestVersionRef.current += 1
    }
  }, [loadData])

  const handleRowDelete = React.useCallback(
    async (rule: ReplicationRule) => {
      if (!canEditReplication || loadError || loading || mutatingRuleId) return
      const mutationKey = rule.ID ?? JSON.stringify(rule)
      setMutatingRuleId(mutationKey)

      try {
        const currentConfig = await getBucketReplication(bucketName)
        const currentRules = (currentConfig?.ReplicationConfiguration?.Rules ?? []) as ReplicationRule[]
        const matches = rule.ID
          ? currentRules.filter((item) => item.ID === rule.ID)
          : currentRules.filter((item) => JSON.stringify(item) === JSON.stringify(rule))
        const remaining = removeMatchingBucketRule(currentRules, rule)
        if (!remaining) throw new Error(t("Configuration changed. Refresh and try again."))
        const role = currentConfig?.ReplicationConfiguration?.Role?.trim() ?? ""
        const targetArn = matches[0]?.Destination?.Bucket
        let targetCleanupFailed = false

        if (remaining.length === 0) {
          await deleteBucketReplication(bucketName)
        } else {
          await putBucketReplication(bucketName, {
            Role: role,
            Rules: remaining,
          })
        }
        if (!role && targetArn && !remaining.some((item) => item.Destination?.Bucket === targetArn)) {
          try {
            await deleteRemoteReplicationTarget(bucketName, targetArn)
          } catch (cleanupError) {
            console.error(cleanupError)
            targetCleanupFailed = true
          }
        }
        if (targetCleanupFailed) {
          message.warning(t("The rule was deleted, but the remote target could not be removed."))
        } else {
          message.success(t("Delete Success"))
        }
        await loadData()
      } catch (error) {
        message.error((error as Error).message || t("Delete Failed"))
      } finally {
        setMutatingRuleId(null)
      }
    },
    [
      canEditReplication,
      deleteBucketReplication,
      deleteRemoteReplicationTarget,
      bucketName,
      getBucketReplication,
      loadError,
      loading,
      mutatingRuleId,
      putBucketReplication,
      message,
      t,
      loadData,
    ],
  )

  const confirmDelete = React.useCallback(
    (rule: ReplicationRule) => {
      dialog.error({
        title: t("Warning"),
        content: `${t("Are you sure you want to delete this replication rule?")} ${rule.ID ?? t("Unnamed rule")} · ${bucketName}`,
        positiveText: t("Delete Rule"),
        negativeText: t("Cancel"),
        onPositiveClick: () => handleRowDelete(rule),
      })
    },
    [bucketName, dialog, t, handleRowDelete],
  )

  const columns: ColumnDef<ReplicationRule>[] = React.useMemo(
    () => [
      {
        accessorKey: "ID",
        header: () => t("Rule ID"),
        cell: ({ row }) => <span>{row.original.ID || "-"}</span>,
      },
      {
        accessorKey: "Status",
        header: () => t("Status"),
        cell: ({ row }) => (
          <Badge variant={row.original.Status === "Enabled" ? "secondary" : "outline"}>
            {row.original.Status === "Enabled" ? t("Enabled") : t("Disabled")}
          </Badge>
        ),
      },
      {
        accessorKey: "Priority",
        header: () => t("Priority"),
        cell: ({ row }) => <span>{String(row.original.Priority ?? "-")}</span>,
      },
      {
        id: "Filter",
        header: () => t("Prefix"),
        cell: ({ row }) => <span>{row.original.Filter?.Prefix || "-"}</span>,
      },
      {
        id: "destination-bucket",
        header: () => t("Destination Bucket"),
        cell: ({ row }) => {
          const bucketArn = row.original.Destination?.Bucket || ""
          return <span>{bucketArn.replace(/^arn:aws:s3:::/, "") || "-"}</span>
        },
      },
      {
        id: "destination-storage",
        header: () => t("Storage Class"),
        cell: ({ row }) => <span>{row.original.Destination?.StorageClass || "-"}</span>,
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {canEditReplication ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmDelete(row.original)}
                disabled={Boolean(loadError) || loading || mutatingRuleId !== null}
                aria-label={`${t("Delete Rule")} ${row.original.ID ?? t("Unnamed rule")}`}
              >
                <RiDeleteBin7Line className="size-4" aria-hidden />
                <span>{t("Delete")}</span>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canEditReplication, confirmDelete, loadError, loading, mutatingRuleId, t],
  )

  const { table } = useDataTable<ReplicationRule>({
    data,
    columns,
    getRowId: (row) => row.ID ?? JSON.stringify(row),
  })

  const actions = (
    <>
      {canEditReplication ? (
        <Button
          onClick={() => setNewFormOpen(true)}
          disabled={Boolean(loadError) || loading || mutatingRuleId !== null}
        >
          <RiAddLine className="size-4" aria-hidden />
          <span>{t("Add Replication Rule")}</span>
        </Button>
      ) : null}
      <Button variant="outline" onClick={loadData} disabled={loading || mutatingRuleId !== null}>
        <RiRefreshLine className="size-4" aria-hidden />
        <span>{t("Refresh")}</span>
      </Button>
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      {renderHeader ? (
        renderHeader(actions)
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {hideTitle ? null : <h2 className="text-lg font-medium">{t("Bucket Replication")}</h2>}
          <div className="grid w-full gap-2 sm:ms-auto sm:flex sm:w-auto">{actions}</div>
        </div>
      )}

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("Replication rules unavailable")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="hidden md:block">
        <DataTable
          table={table}
          isLoading={loading}
          emptyTitle={t("No replication rules")}
          emptyDescription={t("Add replication rules to sync objects across buckets.")}
        />
      </div>

      <div className="space-y-3 md:hidden" aria-live="polite">
        {loading && data.length === 0 ? (
          <div className="border p-4 text-sm text-muted-foreground">{t("Loading")}</div>
        ) : data.length === 0 && !loadError ? (
          <div className="border p-4">
            <p className="text-sm font-medium">{t("No replication rules")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Add replication rules to sync objects across buckets.")}
            </p>
          </div>
        ) : (
          data.map((rule) => {
            const identity = rule.ID ?? JSON.stringify(rule)
            const destination = (rule.Destination?.Bucket ?? "").replace(/^arn:aws:s3:::/, "") || "-"
            return (
              <article key={identity} className="space-y-4 border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-all text-sm font-medium">{rule.ID ?? t("Unnamed rule")}</h3>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{destination}</p>
                  </div>
                  <Badge variant={rule.Status === "Enabled" ? "secondary" : "outline"}>
                    {rule.Status === "Enabled" ? t("Enabled") : t("Disabled")}
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("Priority")}</dt>
                    <dd className="tabular-nums">{String(rule.Priority ?? "-")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("Prefix")}</dt>
                    <dd className="break-all">{rule.Filter?.Prefix || "-"}</dd>
                  </div>
                </dl>
                {canEditReplication ? (
                  <Button
                    variant="outline"
                    className="min-h-11 w-full whitespace-normal break-all"
                    onClick={() => confirmDelete(rule)}
                    disabled={Boolean(loadError) || loading || mutatingRuleId !== null}
                  >
                    <RiDeleteBin7Line className="size-4" aria-hidden />
                    {`${t("Delete Rule")}: ${rule.ID ?? t("Unnamed rule")}`}
                  </Button>
                ) : null}
              </article>
            )
          })
        )}
      </div>

      <ReplicationNewForm
        open={newFormOpen}
        onOpenChange={setNewFormOpen}
        bucketName={bucketName}
        onSuccess={loadData}
      />
    </div>
  )
}
