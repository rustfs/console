"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiAlertLine, RiDeleteBin5Line, RiPlayCircleLine, RiRefreshLine } from "@remixicon/react"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePoolOperations } from "@/hooks/use-pool-operations"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { formatDateTime, formatInteger, niceBytes } from "@/lib/functions"
import {
  deriveDecommissionDisplayState,
  deriveRebalanceDisplayState,
  type DecommissionDisplayState,
  type DecommissionInfo,
  type PoolSupportState,
  type PoolSummary,
  type PoolsOverview,
  type RebalanceDisplayState,
} from "@/lib/pool-operations"
import { cn } from "@/lib/utils"

const POLL_MS = 5000

interface PoolRow {
  pool: PoolSummary
  status: DecommissionInfo | null
  displayState: DecommissionDisplayState
}

function shouldPoll(state: DecommissionDisplayState) {
  return ["running", "canceling"].includes(state)
}

function formatBytesValue(value?: number | null) {
  return typeof value === "number" ? niceBytes(String(value)) : "--"
}

function getPoolDisplayState(
  status: DecommissionInfo | null,
  supportState: PoolSupportState,
  rebalanceState: RebalanceDisplayState,
  isConfirming = false,
) {
  return deriveDecommissionDisplayState(status, supportState, rebalanceState, isConfirming)
}

function formatPoolStatusLabel(row: PoolRow, t: (key: string) => string) {
  const rawStatus = row.status?.status.trim().toLowerCase()

  if (row.displayState === "running" && rawStatus === "queued") return t("Queued")

  switch (row.displayState) {
    case "unsupported":
      return t("Unsupported")
    case "blocked-by-rebalance":
      return t("Blocked")
    case "ready":
      return t("Ready")
    case "confirming":
      return t("Needs Confirmation")
    case "running":
      return t("Running")
    case "canceling":
      return t("Canceling")
    case "completed":
      return t("Completed Status")
    case "failed":
      return t("Failed Status")
    case "canceled":
      return t("Canceled")
    default:
      return t("Unknown")
  }
}

function getPoolStatusBadgeVariant(state: DecommissionDisplayState) {
  if (state === "failed") return "destructive"
  if (state === "completed") return "default"
  if (state === "running" || state === "canceling") return "outline"
  return "secondary"
}

function hasDecommissionProgress(state: DecommissionDisplayState) {
  return ["running", "canceling", "completed", "failed", "canceled"].includes(state)
}

function getProgressBase(status: DecommissionInfo | null, pool: PoolSummary) {
  return Math.max((status?.totalSize || pool.decommission.totalSize || pool.total) - (status?.startSize || 0), 0)
}

function getProgressPercent(status: DecommissionInfo | null, pool: PoolSummary) {
  if (!status) return 0
  if (status.complete) return 100
  if (status.progressPercent > 0) return status.progressPercent

  const progressBase = getProgressBase(status, pool)
  if (progressBase <= 0) return 0

  return Math.max(0, Math.min(100, (status.bytes / progressBase) * 100))
}

function getRemainingBytes(status: DecommissionInfo | null, pool: PoolSummary) {
  if (!status) return undefined
  const progressBase = getProgressBase(status, pool)
  if (progressBase <= 0) return undefined
  return Math.max(progressBase - status.bytes, 0)
}

function getCurrentObject(status: DecommissionInfo | null) {
  if (!status) return "--"
  const parts = [status.bucket, status.prefix, status.object].filter(Boolean)
  return parts.length > 0 ? parts.join("/") : "--"
}

function isTaskLocked(row: PoolRow | undefined) {
  return Boolean(row && ["running", "canceling"].includes(row.displayState))
}

function canClearDecommission(row: PoolRow) {
  return row.displayState === "failed" || row.displayState === "canceled"
}

function isActivePool(pool: PoolSummary) {
  return pool.status.trim().toLowerCase() === "active"
}

function isRebalanceBlockingDecommission(state: RebalanceDisplayState) {
  return ["starting", "running", "stopping"].includes(state)
}

function canStartDecommission(row: PoolRow, selectionLocked: boolean, activePoolCount: number) {
  return row.displayState === "ready" && !selectionLocked && isActivePool(row.pool) && activePoolCount > 1
}

function UsageMeter({
  value,
  label,
  tone = "primary",
}: {
  value: number
  label: string
  tone?: "primary" | "destructive" | "muted"
}) {
  return (
    <div className="flex min-w-32 items-center gap-3">
      <Progress
        value={value}
        className={cn(
          "w-28 [&_[data-slot=progress-indicator]]:bg-primary",
          tone === "destructive" && "[&_[data-slot=progress-indicator]]:bg-destructive",
          tone === "muted" && "[&_[data-slot=progress-indicator]]:bg-muted-foreground",
        )}
        aria-label={label}
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(value)}%</span>
    </div>
  )
}

export default function PoolDecommissionPage() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const message = useMessage()
  const {
    getPoolsOverview,
    getRebalanceStatus,
    getDecommissionStatuses,
    startDecommission,
    cancelDecommission,
    clearDecommission,
  } = usePoolOperations()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPoolId, setSelectedPoolId] = useState("")
  const [overview, setOverview] = useState<PoolsOverview>({
    pools: [] as PoolSummary[],
    totalCapacity: 0,
    totalUsedCapacity: 0,
    totalAvailableCapacity: 0,
    poolCount: 0,
    supportState: "unsupported" as const,
  })
  const [statuses, setStatuses] = useState<Record<string, DecommissionInfo | null>>({})
  const [rebalanceState, setRebalanceState] = useState<RebalanceDisplayState>("idle")
  const pollRef = useRef<number | null>(null)
  const requestVersionRef = useRef(0)
  const mutationRef = useRef(false)
  const mountedRef = useRef(true)
  const shouldPollRef = useRef(false)
  const interactionLockedRef = useRef(true)
  const poolRowsRef = useRef<PoolRow[]>([])

  const clearPoll = () => {
    if (pollRef.current !== null) {
      window.clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }

  const loadData = useCallback(
    async (showSpinner = true) => {
      const requestId = ++requestVersionRef.current
      if (showSpinner) setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const [nextOverview, rebalanceStatus, decommissionStatuses] = await Promise.all([
          getPoolsOverview(),
          getRebalanceStatus(),
          getDecommissionStatuses(),
        ])
        if (!mountedRef.current || requestId !== requestVersionRef.current) return false
        const nextRebalanceState = deriveRebalanceDisplayState(rebalanceStatus, nextOverview.supportState)
        const statusEntries = decommissionStatuses.map((status) => [status.poolId, status])

        setOverview(nextOverview)
        setStatuses(Object.fromEntries(statusEntries) as Record<string, DecommissionInfo | null>)
        setRebalanceState(nextRebalanceState)
        setSelectedPoolId((current) =>
          current && nextOverview.pools.some((pool) => pool.id === current)
            ? current
            : (nextOverview.pools[0]?.id ?? ""),
        )
        setDataReady(true)
        return true
      } catch (loadError) {
        if (!mountedRef.current || requestId !== requestVersionRef.current) return false
        setError((loadError as Error).message || t("Load Failed"))
        setDataReady(false)
        return false
      } finally {
        if (mountedRef.current && requestId === requestVersionRef.current) {
          if (showSpinner) setLoading(false)
          else setRefreshing(false)
        }
      }
    },
    [getDecommissionStatuses, getPoolsOverview, getRebalanceStatus, t],
  )

  useEffect(() => {
    mountedRef.current = true
    void loadData()
    return () => {
      mountedRef.current = false
      requestVersionRef.current += 1
      clearPoll()
    }
  }, [loadData])

  const poolRows = useMemo(
    () =>
      overview.pools.map((pool) => {
        const rowStatus = statuses[pool.id] ?? null
        return {
          pool,
          status: rowStatus,
          displayState: getPoolDisplayState(rowStatus, overview.supportState, rebalanceState, false),
        }
      }),
    [overview.pools, overview.supportState, rebalanceState, statuses],
  )

  const activeTask = poolRows.find((row) => isTaskLocked(row))
  const selectedRow =
    activeTask ?? poolRows.find((row) => row.pool.id === selectedPoolId) ?? poolRows.find((row) => row.pool.id)
  const trackedTask =
    activeTask ??
    (selectedRow && hasDecommissionProgress(selectedRow.displayState) && selectedRow.status ? selectedRow : undefined)
  const selectionLocked = isTaskLocked(activeTask)
  const activePoolCount = poolRows.filter((row) => isActivePool(row.pool)).length
  const trackedProgress = trackedTask ? getProgressPercent(trackedTask.status, trackedTask.pool) : 0
  const interactionLocked = loading || refreshing || submitting || Boolean(error) || !dataReady

  useEffect(() => {
    shouldPollRef.current = dataReady && poolRows.some((row) => shouldPoll(row.displayState))
    poolRowsRef.current = poolRows
  }, [dataReady, poolRows])

  useEffect(() => {
    interactionLockedRef.current = interactionLocked
  }, [interactionLocked])

  useEffect(() => {
    clearPoll()
    if (!shouldPollRef.current) return
    let cancelled = false

    const scheduleNextPoll = async () => {
      const succeeded = await loadData(false)
      if (!cancelled && succeeded && shouldPollRef.current) {
        pollRef.current = window.setTimeout(() => void scheduleNextPoll(), POLL_MS)
      }
    }

    pollRef.current = window.setTimeout(() => void scheduleNextPoll(), POLL_MS)
    return () => {
      cancelled = true
      clearPoll()
    }
  }, [dataReady, loadData, poolRows])

  const handleStart = async (poolId: string) => {
    if (mutationRef.current) return
    const currentRows = poolRowsRef.current
    const currentRow = currentRows.find((row) => row.pool.id === poolId)
    if (
      interactionLockedRef.current ||
      !currentRow ||
      !canStartDecommission(
        currentRow,
        isTaskLocked(currentRows.find((row) => isTaskLocked(row))),
        currentRows.filter((row) => isActivePool(row.pool)).length,
      )
    )
      return
    mutationRef.current = true
    requestVersionRef.current += 1
    setSubmitting(true)
    setError(null)
    try {
      const nextStatus = await startDecommission(poolId)
      if (!mountedRef.current) return
      setStatuses((current) => ({ ...current, [poolId]: nextStatus }))
      setSelectedPoolId(poolId)
      message.success(t("Pool decommission started"))
      await loadData(false)
    } catch (startError) {
      message.error((startError as Error).message || t("Failed to start decommission"))
    } finally {
      mutationRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  const handleCancel = async (poolId: string) => {
    if (mutationRef.current) return
    const currentRow = poolRowsRef.current.find((row) => row.pool.id === poolId)
    if (interactionLockedRef.current || currentRow?.displayState !== "running") return
    mutationRef.current = true
    requestVersionRef.current += 1
    setSubmitting(true)
    setError(null)
    try {
      const nextStatus = await cancelDecommission(poolId)
      if (!mountedRef.current) return
      setStatuses((current) => ({ ...current, [poolId]: nextStatus }))
      setSelectedPoolId(poolId)
      message.success(t("Pool decommission cancel requested"))
      await loadData(false)
    } catch (cancelError) {
      message.error((cancelError as Error).message || t("Failed to cancel decommission"))
    } finally {
      mutationRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  const handleClear = async (poolId: string) => {
    if (mutationRef.current) return
    const currentRow = poolRowsRef.current.find((row) => row.pool.id === poolId)
    if (interactionLockedRef.current || !currentRow || !canClearDecommission(currentRow)) return
    mutationRef.current = true
    requestVersionRef.current += 1
    setSubmitting(true)
    setError(null)
    try {
      const nextStatus = await clearDecommission(poolId)
      if (!mountedRef.current) return
      setStatuses((current) => ({ ...current, [poolId]: nextStatus }))
      message.success(t("Decommission cleared"))
      await loadData(false)
    } catch (clearError) {
      message.error((clearError as Error).message || t("Failed to clear decommission"))
    } finally {
      mutationRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  const confirmStart = (row: PoolRow) => {
    dialog.warning({
      title: t("Review before decommission"),
      content: `${t("This action retires the selected pool and should be used only after verifying rebalance has completed.")} ${t("Selected Pool")}: ${row.pool.name}`,
      positiveText: t("Start Decommission"),
      negativeText: t("Cancel"),
      onPositiveClick: () => handleStart(row.pool.id),
    })
  }

  const confirmCancel = (row: PoolRow) => {
    dialog.warning({
      title: t("Pool Decommission"),
      content: `${t("Selected Pool")}: ${row.pool.name}`,
      positiveText: t("Cancel"),
      negativeText: t("Close"),
      onPositiveClick: () => handleCancel(row.pool.id),
    })
  }

  const confirmClear = (row: PoolRow) => {
    dialog.error({
      title: t("Clear Decommission"),
      content: `${t("Selected Pool")}: ${row.pool.name}`,
      positiveText: t("Clear Decommission"),
      negativeText: t("Cancel"),
      onPositiveClick: () => handleClear(row.pool.id),
    })
  }

  const renderPoolAction = (row: PoolRow, fullWidth = false) => {
    const className = fullWidth ? "min-h-10 w-full" : undefined
    if (row.displayState === "ready") {
      return (
        <Button
          type="button"
          size="sm"
          className={className}
          disabled={!canStartDecommission(row, selectionLocked, activePoolCount) || interactionLocked}
          onClick={(event) => {
            event.stopPropagation()
            setSelectedPoolId(row.pool.id)
            confirmStart(row)
          }}
        >
          <RiPlayCircleLine className="size-4" aria-hidden />
          {t("Start Decommission")}
        </Button>
      )
    }

    if (row.displayState === "running") {
      return (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={className}
          disabled={interactionLocked}
          onClick={(event) => {
            event.stopPropagation()
            confirmCancel(row)
          }}
        >
          {t("Cancel")}
        </Button>
      )
    }

    if (canClearDecommission(row)) {
      return (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className={className}
          disabled={interactionLocked}
          onClick={(event) => {
            event.stopPropagation()
            confirmClear(row)
          }}
        >
          <RiDeleteBin5Line className="size-4" aria-hidden />
          {t("Clear Decommission")}
        </Button>
      )
    }

    return <span className="text-muted-foreground">--</span>
  }

  const initialLoading = loading && !overview.pools.length && !error

  return (
    <Page>
      <PageHeader
        actions={
          <Button variant="outline" onClick={() => void loadData()} disabled={loading || refreshing || submitting}>
            {loading || refreshing ? (
              <Spinner className="me-2 size-4" />
            ) : (
              <RiRefreshLine className="me-2 size-4" aria-hidden />
            )}
            {t("Sync")}
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">{t("Pool Decommission")}</h1>
      </PageHeader>

      <div className="space-y-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("Load Failed")}</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="break-words">{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadData()}>
                <RiRefreshLine className="size-4" aria-hidden />
                {t("Refresh")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {initialLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner className="size-5" aria-hidden />
            {t("Loading…")}
          </div>
        ) : null}

        {trackedTask ? (
          <Card className="rounded-none" aria-busy={refreshing || submitting}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <CardTitle>{t("Current Pool Decommission Status")}</CardTitle>
                <p className="break-all text-sm text-muted-foreground">{trackedTask.pool.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getPoolStatusBadgeVariant(trackedTask.displayState)}>
                  {formatPoolStatusLabel(trackedTask, t)}
                </Badge>
                <Button
                  variant="outline"
                  className="min-h-10 w-full sm:w-auto"
                  onClick={() => confirmCancel(trackedTask)}
                  disabled={trackedTask.displayState !== "running" || interactionLocked}
                >
                  {t("Cancel")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Progress
                  value={trackedProgress}
                  className="flex-1"
                  aria-label={`${trackedTask.pool.name} ${t("Progress")}`}
                />
                <span className="w-12 text-right text-sm font-semibold tabular-nums">
                  {Math.round(trackedProgress)}%
                </span>
              </div>
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-4 xl:grid-cols-7">
                <div>
                  <p className="text-xs text-muted-foreground">{t("Bytes Moved")}</p>
                  <p className="text-sm font-medium">{formatBytesValue(trackedTask.status?.bytes)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Remaining Bytes")}</p>
                  <p className="text-sm font-medium">
                    {formatBytesValue(getRemainingBytes(trackedTask.status, trackedTask.pool))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Objects")}</p>
                  <p className="text-sm font-medium">{formatInteger(trackedTask.status?.objects)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Objects Failed")}</p>
                  <p className="text-sm font-medium">{formatInteger(trackedTask.status?.objectsFailed)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Bytes Failed")}</p>
                  <p className="text-sm font-medium">{formatBytesValue(trackedTask.status?.bytesFailed)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Start Time")}</p>
                  <p className="text-sm font-medium">{formatDateTime(trackedTask.status?.startedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Updated At")}</p>
                  <p className="text-sm font-medium">{formatDateTime(trackedTask.status?.updatedAt)}</p>
                </div>
              </div>
              <div className="grid gap-3 border-t pt-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("Current Object")}</p>
                  <p className="break-all font-medium">{getCurrentObject(trackedTask.status)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("State")}</p>
                  <p className="break-words font-medium">
                    {trackedTask.status?.stage || trackedTask.status?.status || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Waiting Reason")}</p>
                  <p className="break-words font-medium">{trackedTask.status?.waitingReason || "--"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {dataReady && overview.supportState === "unsupported" ? (
          <Alert>
            <AlertTitle>{t("Single pool decommission is not supported")}</AlertTitle>
            <AlertDescription>{t("Decommission requires more than one pool in the cluster.")}</AlertDescription>
          </Alert>
        ) : null}

        {dataReady && isRebalanceBlockingDecommission(rebalanceState) ? (
          <Alert>
            <RiAlertLine className="size-4" aria-hidden />
            <AlertTitle>{t("Rebalance must complete before decommission")}</AlertTitle>
            <AlertDescription>{t("Finish rebalance successfully before retiring a pool.")}</AlertDescription>
          </Alert>
        ) : null}

        {overview.pools.length ? (
          <Card className="rounded-none" aria-busy={refreshing || submitting}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>{t("Pool Decommission")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectionLocked
                    ? t("Selection Locked")
                    : t("Select a pool, review its impact, then start or monitor retirement.")}
                </p>
              </div>
              <Badge variant={selectionLocked ? "outline" : "secondary"}>
                {!dataReady || error ? t("Unknown") : selectionLocked ? t("Running") : t("Ready")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading && !overview.pools.length ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner className="size-8 text-muted-foreground" />
                </div>
              ) : (
                <>
                  {selectedRow ? (
                    <div className="grid grid-cols-2 gap-4 border bg-muted/20 p-3 sm:grid-cols-4">
                      <div className="col-span-2 min-w-0 sm:col-span-4">
                        <p className="text-xs text-muted-foreground">
                          {selectionLocked ? t("Selection Locked") : t("Selected Pool")}
                        </p>
                        <p className="break-all text-sm font-semibold">{selectedRow.pool.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("Total Capacity")}</p>
                        <p className="text-sm font-medium tabular-nums">{formatBytesValue(selectedRow.pool.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("Used Capacity")}</p>
                        <p className="text-sm font-medium tabular-nums">{formatBytesValue(selectedRow.pool.used)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("Available")}</p>
                        <p className="text-sm font-medium tabular-nums">
                          {formatBytesValue(selectedRow.pool.available)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("Updated At")}</p>
                        <p className="text-sm font-medium">{formatDateTime(selectedRow.pool.lastUpdate)}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3 md:hidden">
                    {poolRows.map((row) => {
                      const showProgress = Boolean(row.status) && hasDecommissionProgress(row.displayState)
                      const progressPercent = showProgress ? getProgressPercent(row.status, row.pool) : 0
                      const isSelected = selectedRow?.pool.id === row.pool.id

                      return (
                        <div
                          key={row.pool.id}
                          role="button"
                          tabIndex={selectionLocked ? undefined : 0}
                          aria-pressed={isSelected}
                          className={cn(
                            "space-y-3 border p-3",
                            isSelected && "border-primary/40 bg-primary/5",
                            row.displayState === "failed" && "border-destructive/40 bg-destructive/5",
                          )}
                          onClick={() => {
                            if (!selectionLocked) setSelectedPoolId(row.pool.id)
                          }}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget || selectionLocked) return
                            if (event.key !== "Enter" && event.key !== " ") return
                            event.preventDefault()
                            setSelectedPoolId(row.pool.id)
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 break-all text-sm font-medium">{row.pool.name}</p>
                            <Badge variant={getPoolStatusBadgeVariant(row.displayState)}>
                              {formatPoolStatusLabel(row, t)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Used Capacity")}</p>
                              <p className="tabular-nums">{formatBytesValue(row.pool.used)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Available")}</p>
                              <p className="tabular-nums">{formatBytesValue(row.pool.available)}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{showProgress ? t("Progress") : t("Usage")}</span>
                              <span className="tabular-nums">
                                {Math.round(showProgress ? progressPercent : row.pool.usagePercent)}%
                              </span>
                            </div>
                            <Progress
                              value={showProgress ? progressPercent : row.pool.usagePercent}
                              aria-label={`${row.pool.name} ${showProgress ? t("Progress") : t("Usage")}`}
                            />
                          </div>
                          {renderPoolAction(row, true)}
                        </div>
                      )
                    })}
                  </div>

                  <div className="hidden md:block">
                    <Table>
                      <TableCaption className="sr-only">{t("Pool Decommission")}</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">{t("Pool")}</TableHead>
                          <TableHead scope="col">{t("Status")}</TableHead>
                          <TableHead scope="col">{t("Total Capacity")}</TableHead>
                          <TableHead scope="col">{t("Usage")}</TableHead>
                          <TableHead scope="col">{t("Progress")}</TableHead>
                          <TableHead scope="col" className="text-end">
                            {t("Actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poolRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              {t("No Data")}
                            </TableCell>
                          </TableRow>
                        ) : (
                          poolRows.map((row) => {
                            const { pool, status: rowStatus, displayState: rowState } = row
                            const showProgress = Boolean(rowStatus) && hasDecommissionProgress(rowState)
                            const progressPercent = showProgress ? getProgressPercent(rowStatus, pool) : 0
                            const isSelected = selectedRow?.pool.id === pool.id
                            return (
                              <TableRow
                                key={pool.id}
                                tabIndex={0}
                                aria-selected={isSelected}
                                className={cn(
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  selectionLocked ? "cursor-default" : "cursor-pointer",
                                  rowState === "running" && "bg-primary/5",
                                  rowState === "failed" && "bg-destructive/10",
                                  rowState === "canceled" && "bg-muted/60",
                                )}
                                data-state={isSelected ? "selected" : undefined}
                                onClick={() => {
                                  if (selectionLocked) return
                                  setSelectedPoolId(pool.id)
                                }}
                                onKeyDown={(event) => {
                                  if (event.target !== event.currentTarget) return
                                  if (event.key !== "Enter" && event.key !== " ") return
                                  event.preventDefault()
                                  if (selectionLocked) return
                                  setSelectedPoolId(pool.id)
                                }}
                              >
                                <TableHead scope="row" className="max-w-[30rem] whitespace-normal">
                                  <span className="break-all font-medium">{pool.name}</span>
                                </TableHead>
                                <TableCell>
                                  <Badge variant={getPoolStatusBadgeVariant(rowState)}>
                                    {formatPoolStatusLabel(row, t)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <p className="tabular-nums">{formatBytesValue(pool.total)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {t("Available")}: {formatBytesValue(pool.available)}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <UsageMeter value={pool.usagePercent} label={`${pool.name} ${t("Usage")}`} />
                                </TableCell>
                                <TableCell>
                                  {showProgress ? (
                                    <UsageMeter
                                      value={progressPercent}
                                      tone="muted"
                                      label={`${pool.name} ${t("Progress")}`}
                                    />
                                  ) : (
                                    "--"
                                  )}
                                </TableCell>
                                <TableCell className="text-end">
                                  <div className="inline-flex justify-end">{renderPoolAction(row)}</div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Page>
  )
}
