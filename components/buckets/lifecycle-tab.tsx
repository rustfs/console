"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine, RiDeleteBin5Line } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useBucket } from "@/hooks/use-bucket"
import { usePermissions } from "@/hooks/use-permissions"
import { LifecycleNewForm } from "@/components/lifecycle/new-form"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { isMissingBucketConfiguration, removeMatchingBucketRule } from "@/lib/bucket-configuration"
import { getLifecycleActions, type LifecycleRule, type LifecycleAction } from "@/lib/lifecycle-display"
import type { ColumnDef } from "@tanstack/react-table"

interface BucketLifecycleTabProps {
  bucketName: string
  hideTitle?: boolean
  renderHeader?: (actions: React.ReactNode) => React.ReactNode
}

export function BucketLifecycleTab({ bucketName, hideTitle = false, renderHeader }: BucketLifecycleTabProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { canCapability } = usePermissions()
  const { getBucketLifecycleConfiguration, deleteBucketLifecycle, putBucketLifecycleConfiguration } = useBucket()
  const lifecycleContext = React.useMemo(() => ({ bucket: bucketName }), [bucketName])
  const canEditLifecycle = canCapability("bucket.lifecycle.edit", lifecycleContext)

  const [data, setData] = React.useState<LifecycleRule[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [mutatingRuleId, setMutatingRuleId] = React.useState<string | null>(null)
  const [newFormOpen, setNewFormOpen] = React.useState(false)
  const requestVersionRef = React.useRef(0)

  const loadData = React.useCallback(async () => {
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    try {
      const response = await getBucketLifecycleConfiguration(bucketName)
      const rules = [...(response?.Rules ?? [])]
        .map((r) => r as LifecycleRule)
        .sort((a, b) => (a.ID ?? "").localeCompare(b.ID ?? ""))
      if (requestVersion !== requestVersionRef.current) return
      setData(rules)
      setLoadError("")
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) return
      if (isMissingBucketConfiguration(error, "lifecycle")) {
        setData([])
        setLoadError("")
      } else {
        setLoadError(t("Unable to load lifecycle rules. Refresh before making changes."))
      }
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false)
    }
  }, [bucketName, getBucketLifecycleConfiguration, t])

  React.useEffect(() => {
    loadData()
    return () => {
      requestVersionRef.current += 1
    }
  }, [loadData])

  const handleRowDelete = React.useCallback(
    async (row: LifecycleRule) => {
      if (!canEditLifecycle || loadError || loading || mutatingRuleId) return
      const mutationKey = row.ID ?? JSON.stringify(row)
      setMutatingRuleId(mutationKey)

      try {
        const current = await getBucketLifecycleConfiguration(bucketName)
        const currentRules = (current?.Rules ?? []).map((rule) => rule as LifecycleRule)
        const remaining = removeMatchingBucketRule(currentRules, row)
        if (!remaining) throw new Error(t("Configuration changed. Refresh and try again."))

        if (remaining.length === 0) {
          await deleteBucketLifecycle(bucketName)
        } else {
          await putBucketLifecycleConfiguration(bucketName, {
            Rules: remaining,
          })
        }
        message.success(t("Delete Success"))
        await loadData()
      } catch (error) {
        message.error((error as Error).message || t("Delete Failed"))
      } finally {
        setMutatingRuleId(null)
      }
    },
    [
      bucketName,
      canEditLifecycle,
      deleteBucketLifecycle,
      getBucketLifecycleConfiguration,
      loadData,
      loadError,
      loading,
      message,
      mutatingRuleId,
      putBucketLifecycleConfiguration,
      t,
    ],
  )

  const confirmDelete = React.useCallback(
    (row: LifecycleRule) => {
      dialog.error({
        title: t("Warning"),
        content: `${t("Are you sure you want to delete this rule?")} ${row.ID ?? t("Unnamed rule")} · ${bucketName}`,
        positiveText: t("Delete Rule"),
        negativeText: t("Cancel"),
        onPositiveClick: () => handleRowDelete(row),
      })
    },
    [bucketName, dialog, t, handleRowDelete],
  )

  const actionValue = React.useCallback(
    (action: LifecycleAction, field: "type" | "version" | "deleteMarker" | "tier" | "timeCycle") => {
      switch (field) {
        case "type":
          return t(action.type)
        case "version":
          return t(action.version)
        case "deleteMarker":
          return action.deleteMarker ? t("On") : t("Off")
        case "tier":
          return action.tier ?? "--"
        default:
          return action.days != null
            ? `${action.days} ${t("Days")}`
            : ((action.date instanceof Date ? action.date.toISOString() : action.date) ?? "--")
      }
    },
    [t],
  )

  const columns: ColumnDef<LifecycleRule>[] = React.useMemo(
    () => [
      ...(["type", "version", "deleteMarker", "tier"] as const).map((field) => ({
        id: field,
        header: () =>
          t({ type: "Type", version: "Version", deleteMarker: "Expiration Delete Mark", tier: "Tier" }[field]),
        accessorFn: (row: LifecycleRule) =>
          getLifecycleActions(row)
            .map((action) => actionValue(action, field))
            .join(" · "),
        cell: ({ row }: { row: { original: LifecycleRule } }) => (
          <div className="space-y-2">
            {getLifecycleActions(row.original).map((action, index) => (
              <div key={index} className="whitespace-nowrap">
                {actionValue(action, field)}
              </div>
            ))}
          </div>
        ),
      })),
      {
        id: "prefix",
        header: () => t("Prefix"),
        accessorFn: (row) => row.Filter?.Prefix || row.Filter?.And?.Prefix || "",
      },
      {
        id: "timeCycle",
        header: () => t("Time Cycle"),
        accessorFn: (row) =>
          getLifecycleActions(row)
            .map((action) => actionValue(action, "timeCycle"))
            .join(" · "),
        cell: ({ row }) => (
          <div className="space-y-2">
            {getLifecycleActions(row.original).map((action, index) => (
              <div key={index} className="whitespace-nowrap tabular-nums">
                {actionValue(action, "timeCycle")}
              </div>
            ))}
          </div>
        ),
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
            {canEditLifecycle ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmDelete(row.original)}
                disabled={Boolean(loadError) || loading || mutatingRuleId !== null}
                aria-label={`${t("Delete Rule")} ${row.original.ID ?? t("Unnamed rule")}`}
              >
                <RiDeleteBin5Line className="size-4" aria-hidden />
                <span>{t("Delete")}</span>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [actionValue, canEditLifecycle, confirmDelete, loadError, loading, mutatingRuleId, t],
  )

  const { table } = useDataTable<LifecycleRule>({
    data,
    columns,
    getRowId: (row) => row.ID ?? JSON.stringify(row),
  })

  const actions = (
    <>
      {canEditLifecycle ? (
        <Button
          onClick={() => setNewFormOpen(true)}
          disabled={Boolean(loadError) || loading || mutatingRuleId !== null}
        >
          <RiAddLine className="size-4" aria-hidden />
          <span>{t("Add Lifecycle Rule")}</span>
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
          {hideTitle ? null : <h2 className="text-lg font-medium">{t("Lifecycle")}</h2>}
          <div className="grid w-full gap-2 sm:ms-auto sm:flex sm:w-auto">{actions}</div>
        </div>
      )}

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("Lifecycle rules unavailable")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="hidden md:block">
        <DataTable
          table={table}
          isLoading={loading}
          emptyTitle={t("No lifecycle rules")}
          emptyDescription={t("Create lifecycle rules to automate object transitions and expiration.")}
        />
      </div>

      <div className="space-y-3 md:hidden" aria-live="polite">
        {loading && data.length === 0 ? (
          <div className="border p-4 text-sm text-muted-foreground">{t("Loading")}</div>
        ) : data.length === 0 && !loadError ? (
          <div className="border p-4">
            <p className="text-sm font-medium">{t("No lifecycle rules")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Create lifecycle rules to automate object transitions and expiration.")}
            </p>
          </div>
        ) : (
          data.map((rule) => {
            const identity = rule.ID ?? JSON.stringify(rule)
            return (
              <article key={identity} className="space-y-4 border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-all text-sm font-medium">{rule.ID ?? t("Unnamed rule")}</h3>
                  </div>
                  <Badge variant={rule.Status === "Enabled" ? "secondary" : "outline"}>
                    {rule.Status === "Enabled" ? t("Enabled") : t("Disabled")}
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("Prefix")}</dt>
                    <dd className="break-all">{rule.Filter?.Prefix || rule.Filter?.And?.Prefix || "-"}</dd>
                  </div>
                </dl>
                {getLifecycleActions(rule).map((action, index) => (
                  <dl key={index} className="grid grid-cols-2 gap-3 text-sm">
                    {(["type", "version", "deleteMarker", "tier", "timeCycle"] as const).map((field) => (
                      <div key={field}>
                        <dt className="text-xs text-muted-foreground">
                          {t(
                            {
                              type: "Type",
                              version: "Version",
                              deleteMarker: "Expiration Delete Mark",
                              tier: "Tier",
                              timeCycle: "Time Cycle",
                            }[field],
                          )}
                        </dt>
                        <dd className="break-all">{actionValue(action, field)}</dd>
                      </div>
                    ))}
                  </dl>
                ))}
                {canEditLifecycle ? (
                  <Button
                    variant="outline"
                    className="min-h-11 w-full whitespace-normal break-all"
                    onClick={() => confirmDelete(rule)}
                    disabled={Boolean(loadError) || loading || mutatingRuleId !== null}
                  >
                    <RiDeleteBin5Line className="size-4" aria-hidden />
                    {`${t("Delete Rule")}: ${rule.ID ?? t("Unnamed rule")}`}
                  </Button>
                ) : null}
              </article>
            )
          })
        )}
      </div>

      <LifecycleNewForm open={newFormOpen} onOpenChange={setNewFormOpen} bucketName={bucketName} onSuccess={loadData} />
    </div>
  )
}
