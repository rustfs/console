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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePoolOperations } from "@/hooks/use-pool-operations"
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

function canStartDecommission(row: PoolRow, selectionLocked: boolean) {
  return row.displayState === "ready" && !selectionLocked
}

function UsageMeter({ value, tone = "primary" }: { value: number; tone?: "primary" | "destructive" | "muted" }) {
  return (
    <div className="flex min-w-32 items-center gap-3">
      <Progress
        value={value}
        className={cn(
          "w-28 [&_[data-slot=progress-indicator]]:bg-primary",
          tone === "destructive" && "[&_[data-slot=progress-indicator]]:bg-destructive",
          tone === "muted" && "[&_[data-slot=progress-indicator]]:bg-muted-foreground",
        )}
      />
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(value)}%</span>
    </div>
  )
}

export default function PoolDecommissionPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const {
    getPoolsOverview,
    getRebalanceStatus,
    getDecommissionStatus,
    startDecommission,
    cancelDecommission,
    clearDecommission,
  } = usePoolOperations()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPoolId, setSelectedPoolId] = useState("")
  const [confirmingPoolId, setConfirmingPoolId] = useState("")
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

  const clearPoll = () => {
    if (pollRef.current) {
      window.clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }

  const loadData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true)
      setError(null)
      try {
        const [nextOverview, rebalanceStatus] = await Promise.all([
          getPoolsOverview(),
          getRebalanceStatus().catch(() => null),
        ])
        const nextRebalanceState = deriveRebalanceDisplayState(rebalanceStatus, nextOverview.supportState)
        const statusEntries = await Promise.all(
          nextOverview.pools.map(async (pool) => [pool.id, await getDecommissionStatus(pool.id).catch(() => null)]),
        )

        setOverview(nextOverview)
        setStatuses(Object.fromEntries(statusEntries) as Record<string, DecommissionInfo | null>)
        setRebalanceState(nextRebalanceState)
        if (!selectedPoolId && nextOverview.pools[0]?.id) {
          setSelectedPoolId(nextOverview.pools[0].id)
        }
      } catch (loadError) {
        setError((loadError as Error).message || t("Load Failed"))
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [getDecommissionStatus, getPoolsOverview, getRebalanceStatus, selectedPoolId, t],
  )

  useEffect(() => {
    void loadData()
    return clearPoll
  }, [loadData])

  const poolRows = useMemo(
    () =>
      overview.pools.map((pool) => {
        const rowStatus = statuses[pool.id] ?? null
        return {
          pool,
          status: rowStatus,
          displayState: getPoolDisplayState(
            rowStatus,
            overview.supportState,
            rebalanceState,
            confirmingPoolId === pool.id,
          ),
        }
      }),
    [confirmingPoolId, overview.pools, overview.supportState, rebalanceState, statuses],
  )

  const activeTask = poolRows.find((row) => isTaskLocked(row))
  const selectedRow =
    activeTask ?? poolRows.find((row) => row.pool.id === selectedPoolId) ?? poolRows.find((row) => row.pool.id)
  const trackedTask =
    activeTask ??
    (selectedRow && hasDecommissionProgress(selectedRow.displayState) && selectedRow.status ? selectedRow : undefined)
  const selectionLocked = isTaskLocked(activeTask)
  const selectedPoolName = selectedRow?.pool.name ?? "--"
  const trackedProgress = trackedTask ? getProgressPercent(trackedTask.status, trackedTask.pool) : 0

  useEffect(() => {
    clearPoll()
    if (!poolRows.some((row) => shouldPoll(row.displayState))) return
    pollRef.current = window.setTimeout(() => {
      void loadData(false)
    }, POLL_MS)
    return clearPoll
  }, [loadData, poolRows])

  const handleStart = async (poolId: string) => {
    setSubmitting(true)
    try {
      await startDecommission(poolId)
      setConfirmingPoolId("")
      setSelectedPoolId(poolId)
      message.success(t("Pool decommission started"))
      await loadData(false)
    } catch (startError) {
      message.error((startError as Error).message || t("Failed to start decommission"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (poolId: string) => {
    setSubmitting(true)
    try {
      await cancelDecommission(poolId)
      setSelectedPoolId(poolId)
      message.success(t("Pool decommission cancel requested"))
      await loadData(false)
    } catch (cancelError) {
      message.error((cancelError as Error).message || t("Failed to cancel decommission"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = async (poolId: string) => {
    setSubmitting(true)
    try {
      await clearDecommission(poolId)
      if (selectedPoolId === poolId) setConfirmingPoolId("")
      message.success(t("Decommission cleared"))
      await loadData(false)
    } catch (clearError) {
      message.error((clearError as Error).message || t("Failed to clear decommission"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page>
      <PageHeader
        actions={
          <Button variant="outline" onClick={() => void loadData()} disabled={loading || submitting}>
            <RiRefreshLine className="me-2 size-4" aria-hidden />
            {t("Sync")}
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">{t("Pool Decommission")}</h1>
      </PageHeader>

      <div className="space-y-6">
        {trackedTask ? (
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>{t("Current Pool Decommission Status")}</CardTitle>
                <p className="text-sm text-muted-foreground">{trackedTask.pool.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getPoolStatusBadgeVariant(trackedTask.displayState)}>
                  {formatPoolStatusLabel(trackedTask, t)}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => void handleCancel(trackedTask.pool.id)}
                  disabled={trackedTask.displayState !== "running" || submitting}
                >
                  {t("Cancel")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Progress value={trackedProgress} className="flex-1" />
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
                  <p className="truncate font-medium">{getCurrentObject(trackedTask.status)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("State")}</p>
                  <p className="truncate font-medium">
                    {trackedTask.status?.stage || trackedTask.status?.status || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Waiting Reason")}</p>
                  <p className="truncate font-medium">{trackedTask.status?.waitingReason || "--"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {overview.supportState === "unsupported" ? (
          <Alert>
            <AlertTitle>{t("Single pool decommission is not supported")}</AlertTitle>
            <AlertDescription>{t("Decommission requires more than one pool in the cluster.")}</AlertDescription>
          </Alert>
        ) : null}

        {["starting", "running", "stopping", "failed", "stopped", "unknown"].includes(rebalanceState) ? (
          <Alert>
            <RiAlertLine className="size-4" aria-hidden />
            <AlertTitle>{t("Rebalance must complete before decommission")}</AlertTitle>
            <AlertDescription>{t("Finish rebalance successfully before retiring a pool.")}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("Load Failed")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>{t("Pool Decommission")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectionLocked
                    ? t("Selection Locked")
                    : t("Select a pool, review its impact, then start or monitor retirement.")}
                </p>
              </div>
              <Badge variant={selectionLocked ? "outline" : "secondary"}>
                {selectionLocked ? t("Running") : t("Ready")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner className="size-8 text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">{t("ID")}</TableHead>
                        <TableHead>{t("Pool")}</TableHead>
                        <TableHead>{t("Status")}</TableHead>
                        <TableHead>{t("Total Capacity")}</TableHead>
                        <TableHead>{t("Used Capacity")}</TableHead>
                        <TableHead>{t("Usage")}</TableHead>
                        <TableHead>{t("Progress")}</TableHead>
                        <TableHead>{t("Bytes Moved")}</TableHead>
                        <TableHead className="text-end">{t("Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poolRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground">
                            {t("No Data")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        poolRows.map((row) => {
                          const { pool, status: rowStatus, displayState: rowState } = row
                          const showProgress = Boolean(rowStatus) && hasDecommissionProgress(rowState)
                          const progressPercent = showProgress ? getProgressPercent(rowStatus, pool) : 0
                          const isSelected = selectedRow?.pool.id === pool.id
                          const canStart = canStartDecommission(row, selectionLocked) && !submitting
                          const canConfirm = rowState === "confirming" && !submitting
                          const canCancel = rowState === "running" && !submitting
                          const canClear = canClearDecommission(row) && !submitting

                          return (
                            <TableRow
                              key={pool.id}
                              tabIndex={0}
                              aria-selected={isSelected}
                              className={cn(
                                "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                                if (event.key !== "Enter" && event.key !== " ") return
                                event.preventDefault()
                                if (selectionLocked) return
                                setSelectedPoolId(pool.id)
                              }}
                            >
                              <TableCell className="text-muted-foreground">{pool.id}</TableCell>
                              <TableCell className="max-w-[340px] truncate font-medium">{pool.name}</TableCell>
                              <TableCell>
                                <Badge variant={getPoolStatusBadgeVariant(rowState)}>
                                  {formatPoolStatusLabel(row, t)}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatBytesValue(pool.total)}</TableCell>
                              <TableCell>{formatBytesValue(pool.used)}</TableCell>
                              <TableCell>
                                <UsageMeter value={pool.usagePercent} />
                              </TableCell>
                              <TableCell>
                                {showProgress ? <UsageMeter value={progressPercent} tone="muted" /> : "--"}
                              </TableCell>
                              <TableCell>{showProgress ? formatBytesValue(rowStatus?.bytes) : "--"}</TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  {rowState === "confirming" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          void handleStart(pool.id)
                                        }}
                                        disabled={!canConfirm}
                                      >
                                        {submitting && selectedPoolId === pool.id ? (
                                          <Spinner className="me-2 size-4" />
                                        ) : null}
                                        {t("Confirm")}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          setConfirmingPoolId("")
                                        }}
                                        disabled={submitting}
                                      >
                                        {t("Cancel")}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!canStart}
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          setSelectedPoolId(pool.id)
                                          setConfirmingPoolId(pool.id)
                                        }}
                                      >
                                        <RiPlayCircleLine className="me-1 size-3.5" aria-hidden />
                                        {t("Start Decommission")}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!canCancel}
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          void handleCancel(pool.id)
                                        }}
                                      >
                                        {t("Cancel")}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={!canClear}
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          void handleClear(pool.id)
                                        }}
                                      >
                                        <RiDeleteBin5Line className="me-1 size-3.5" aria-hidden />
                                        {t("Clear Decommission")}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>

                  {confirmingPoolId ? (
                    <Alert>
                      <AlertTitle>{t("Review before decommission")}</AlertTitle>
                      <AlertDescription>
                        {t(
                          "This action retires the selected pool and should be used only after verifying rebalance has completed.",
                        )}{" "}
                        {t("Selected Pool")}:{" "}
                        {overview.pools.find((pool) => pool.id === confirmingPoolId)?.name ?? "--"}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-none">
              <CardHeader>
                <CardTitle>{t("Selected Pool")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">{selectionLocked ? t("Selection Locked") : t("Pool")}</p>
                  <p className="truncate text-sm font-semibold">{selectedPoolName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Total Capacity")}</p>
                    <p className="text-sm font-medium">{formatBytesValue(selectedRow?.pool.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Used Capacity")}</p>
                    <p className="text-sm font-medium">{formatBytesValue(selectedRow?.pool.used)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Available")}</p>
                    <p className="text-sm font-medium">{formatBytesValue(selectedRow?.pool.available)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Updated At")}</p>
                    <p className="text-sm font-medium">{formatDateTime(selectedRow?.pool.lastUpdate)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("Usage")}</span>
                    <span>{Math.round(selectedRow?.pool.usagePercent ?? 0)}%</span>
                  </div>
                  <Progress value={selectedRow?.pool.usagePercent ?? 0} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none">
              <CardHeader>
                <CardTitle>{t("Actions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4 border-b pb-3">
                  <div>
                    <p className="font-medium">{t("Start Decommission")}</p>
                    <p className="text-xs text-muted-foreground">{t("Ready")}</p>
                  </div>
                  <Badge variant="secondary">{t("Ready")}</Badge>
                </div>
                <div className="flex items-start justify-between gap-4 border-b pb-3">
                  <div>
                    <p className="font-medium">{t("Cancel")}</p>
                    <p className="text-xs text-muted-foreground">{t("Running")}</p>
                  </div>
                  <Badge variant="outline">{t("Running")}</Badge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{t("Clear Decommission")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Failed Status")} / {t("Canceled")}
                    </p>
                  </div>
                  <Badge variant="destructive">{t("Clear Records")}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  )
}
