"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiPauseCircleLine, RiPlayCircleLine, RiRefreshLine } from "@remixicon/react"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { PoolsOverviewCard } from "@/components/pools/overview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePoolOperations } from "@/hooks/use-pool-operations"
import type { PoolSummary, PoolsOverview, RebalanceDisplayState, RebalanceStatus } from "@/lib/pool-operations"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { formatInteger, niceBytes } from "@/lib/functions"
import { cn } from "@/lib/utils"

const POLL_MS = 5000

function formatDuration(seconds?: number) {
  if (seconds === undefined) return "--"
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainSeconds}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function shouldPoll(state: RebalanceDisplayState) {
  return ["starting", "running", "stopping"].includes(state)
}

function formatBytesValue(value?: number) {
  return value === undefined ? "--" : niceBytes(String(value))
}

function formatNumberValue(value?: number) {
  return formatInteger(value)
}

function isFailedRebalancePool(pool: PoolSummary) {
  return ["failed", "error"].includes(pool.rebalanceStatus.trim().toLowerCase())
}

function formatCleanupWarnings(pool: PoolSummary) {
  const warnings = pool.cleanupWarnings
  if (!warnings.present && !warnings.count) return "--"

  const context = [warnings.lastBucket, warnings.lastObject].filter(Boolean).join("/")
  return context ? `${warnings.count} (${context})` : String(warnings.count)
}

export default function RebalancePage() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const message = useMessage()
  const { getRebalanceViewModel, startRebalance, stopRebalance } = usePoolOperations()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<PoolsOverview>(() => ({
    pools: [] as PoolSummary[],
    totalCapacity: 0,
    totalUsedCapacity: 0,
    totalAvailableCapacity: 0,
    poolCount: 0,
    supportState: "unsupported" as const,
  }))
  const [status, setStatus] = useState<RebalanceStatus | null>(null)
  const [displayState, setDisplayState] = useState<RebalanceDisplayState>("idle")
  const pollRef = useRef<number | null>(null)
  const requestVersionRef = useRef(0)
  const mutationRef = useRef(false)
  const mountedRef = useRef(true)
  const displayStateRef = useRef<RebalanceDisplayState>("idle")
  const interactionLockedRef = useRef(true)

  const clearPoll = () => {
    if (pollRef.current) {
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
        const view = await getRebalanceViewModel()
        if (!mountedRef.current || requestId !== requestVersionRef.current) return false
        setOverview(view.overview)
        setStatus(view.status)
        setDisplayState(view.displayState)
        displayStateRef.current = view.displayState
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
    [getRebalanceViewModel, t],
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

  useEffect(() => {
    displayStateRef.current = displayState
  }, [displayState])

  useEffect(() => {
    clearPoll()
    if (!dataReady || !shouldPoll(displayState)) return
    let cancelled = false

    const scheduleNextPoll = async () => {
      const succeeded = await loadData(false)
      if (!cancelled && succeeded && shouldPoll(displayStateRef.current)) {
        pollRef.current = window.setTimeout(() => void scheduleNextPoll(), POLL_MS)
      }
    }

    pollRef.current = window.setTimeout(() => void scheduleNextPoll(), POLL_MS)
    return () => {
      cancelled = true
      clearPoll()
    }
  }, [dataReady, displayState, loadData])

  const interactionLocked = loading || refreshing || submitting || Boolean(error) || !dataReady
  const canStart =
    !interactionLocked &&
    overview.supportState === "supported" &&
    overview.pools.filter((pool) => pool.status.trim().toLowerCase() === "active").length > 1 &&
    !overview.pools.some((pool) =>
      ["decommissioning", "queued", "running"].includes(pool.decommissionStatus.trim().toLowerCase()),
    ) &&
    ["idle", "completed", "failed", "stopped"].includes(displayState)
  const canStop = !interactionLocked && ["starting", "running"].includes(displayState)
  const showStop = ["starting", "running", "stopping"].includes(displayState)

  useEffect(() => {
    interactionLockedRef.current = interactionLocked
  }, [interactionLocked])

  const handleStart = async () => {
    if (mutationRef.current) return
    if (interactionLockedRef.current) return
    mutationRef.current = true
    requestVersionRef.current += 1
    setSubmitting(true)
    setError(null)
    try {
      const nextStatus = await startRebalance()
      if (!mountedRef.current) return
      setStatus(nextStatus)
      setDisplayState("starting")
      displayStateRef.current = "starting"
      message.success(t("Rebalance started"))
      await loadData(false)
    } catch (startError) {
      message.error((startError as Error).message || t("Failed to start rebalance"))
    } finally {
      mutationRef.current = false
      if (mountedRef.current) setSubmitting(false)
    }
  }

  const handleStop = () => {
    dialog.warning({
      title: t("Stop rebalance"),
      content: t("Are you sure you want to stop the current rebalance operation?"),
      positiveText: t("Stop rebalance"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        if (mutationRef.current) return
        if (interactionLockedRef.current || !["starting", "running"].includes(displayStateRef.current)) return
        mutationRef.current = true
        requestVersionRef.current += 1
        setSubmitting(true)
        setError(null)
        try {
          const nextStatus = await stopRebalance()
          if (!mountedRef.current) return
          setStatus(nextStatus)
          setDisplayState("stopping")
          displayStateRef.current = "stopping"
          message.success(t("Rebalance stop requested"))
          await loadData(false)
        } catch (stopError) {
          message.error((stopError as Error).message || t("Failed to stop rebalance"))
        } finally {
          mutationRef.current = false
          if (mountedRef.current) setSubmitting(false)
        }
      },
    })
  }

  const statusLabel = useMemo(() => {
    if (!dataReady || error) return t("Unknown")
    switch (displayState) {
      case "unsupported":
        return t("Unsupported")
      case "idle":
        return t("Idle")
      case "starting":
        return t("Starting")
      case "running":
        return t("Running")
      case "stopping":
        return t("Stopping")
      case "completed":
        return t("Completed Status")
      case "failed":
        return t("Failed Status")
      case "stopped":
        return t("Stopped")
      default:
        return t("Unknown")
    }
  }, [dataReady, displayState, error, t])

  const pools = useMemo(() => {
    const statusPools = new Map((status?.pools ?? []).map((pool) => [pool.id, pool]))
    return overview.pools.map((pool) => {
      const statusPool = statusPools.get(pool.id)
      if (!statusPool) return pool
      return {
        ...pool,
        rebalanceStatus: statusPool.rebalanceStatus || statusPool.status || pool.rebalanceStatus,
        progress: statusPool.progress,
        cleanupWarnings: statusPool.cleanupWarnings,
      }
    })
  }, [overview.pools, status?.pools])
  const initialLoading = loading && !overview.pools.length && !error

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading || refreshing || submitting}>
              {loading || refreshing ? (
                <Spinner className="me-2 size-4" />
              ) : (
                <RiRefreshLine className="me-2 size-4" aria-hidden />
              )}
              {t("Sync")}
            </Button>
            {showStop ? (
              <Button variant="outline" onClick={handleStop} disabled={!canStop}>
                {submitting ? (
                  <Spinner className="me-2 size-4" />
                ) : (
                  <RiPauseCircleLine className="me-2 size-4" aria-hidden />
                )}
                {t("Stop rebalance")}
              </Button>
            ) : (
              <Button onClick={handleStart} disabled={!canStart}>
                {submitting ? (
                  <Spinner className="me-2 size-4" />
                ) : (
                  <RiPlayCircleLine className="me-2 size-4" aria-hidden />
                )}
                {t("Start Rebalance")}
              </Button>
            )}
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Rebalance")}</h1>
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
        ) : overview.pools.length ? (
          <>
            <PoolsOverviewCard overview={overview} operationLabel={t("Rebalance")} />

            {dataReady && overview.supportState === "unsupported" ? (
              <Alert>
                <AlertTitle>{t("Single pool rebalance is not supported")}</AlertTitle>
                <AlertDescription>{t("Rebalance requires more than one pool in the cluster.")}</AlertDescription>
              </Alert>
            ) : null}

            <Card className="rounded-none" aria-busy={refreshing || submitting}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>{t("Current Rebalance Status")}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("Track overall rebalance progress and pool-by-pool movement.")}
                  </p>
                </div>
                <Badge
                  variant={
                    displayState === "failed" ? "destructive" : displayState === "completed" ? "default" : "secondary"
                  }
                >
                  {statusLabel}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading && !overview.pools.length ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner className="size-8 text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("Progress")}</p>
                        <p className="text-sm font-medium">{Math.round(status?.progressPercent ?? 0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("Bytes Moved")}</p>
                        <p className="text-sm font-medium">{formatBytesValue(status?.totals?.bytes)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("Elapsed")}</p>
                        <p className="text-sm font-medium">{formatDuration(status?.totals?.elapsed)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("ETA")}</p>
                        <p className="text-sm font-medium">{formatDuration(status?.totals?.eta)}</p>
                      </div>
                    </div>

                    <Progress
                      value={status?.progressPercent ?? 0}
                      className="h-2"
                      aria-label={`${t("Rebalance")} ${t("Progress")}`}
                    />

                    <div className="space-y-3 md:hidden">
                      {pools.map((pool) => (
                        <div
                          key={pool.id}
                          className={cn("space-y-3 border p-3", isFailedRebalancePool(pool) && "border-destructive/40")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 break-all text-sm font-medium">{pool.name}</p>
                            <Badge variant={isFailedRebalancePool(pool) ? "destructive" : "secondary"}>
                              {pool.rebalanceStatus || "--"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Used Capacity")}</p>
                              <p className="tabular-nums">{formatBytesValue(pool.used)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Bytes Moved")}</p>
                              <p className="tabular-nums">{formatBytesValue(pool.progress.bytes)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Objects")}</p>
                              <p className="tabular-nums">{formatNumberValue(pool.progress.objects)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("Versions")}</p>
                              <p className="tabular-nums">{formatNumberValue(pool.progress.versions)}</p>
                            </div>
                          </div>
                          {pool.cleanupWarnings.count > 0 ? (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              {t("Cleanup Warnings")}: {pool.cleanupWarnings.count}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block">
                      <Table>
                        <TableCaption className="sr-only">{t("Current Rebalance Status")}</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">{t("Pool")}</TableHead>
                            <TableHead scope="col">{t("Status")}</TableHead>
                            <TableHead scope="col">{t("Used Capacity")}</TableHead>
                            <TableHead scope="col">{t("Bytes Moved")}</TableHead>
                            <TableHead scope="col">{t("Objects")}</TableHead>
                            <TableHead scope="col">{t("Cleanup Warnings")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pools.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                {t("No Data")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            pools.map((pool) => (
                              <TableRow
                                key={pool.id}
                                className={cn(
                                  isFailedRebalancePool(pool) && "bg-destructive/15 hover:bg-destructive/20",
                                )}
                              >
                                <TableHead scope="row" className="max-w-[28rem] whitespace-normal">
                                  <span className="break-all font-medium">{pool.name}</span>
                                </TableHead>
                                <TableCell>
                                  <Badge variant={isFailedRebalancePool(pool) ? "destructive" : "secondary"}>
                                    {pool.rebalanceStatus || "--"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatBytesValue(pool.used)}</TableCell>
                                <TableCell>{formatBytesValue(pool.progress.bytes)}</TableCell>
                                <TableCell>
                                  {formatNumberValue(pool.progress.objects)} /{" "}
                                  {formatNumberValue(pool.progress.versions)}
                                </TableCell>
                                <TableCell>
                                  {pool.cleanupWarnings.count > 0 ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-amber-100 text-amber-900 hover:bg-amber-100"
                                      title={formatCleanupWarnings(pool)}
                                    >
                                      {pool.cleanupWarnings.count}
                                    </Badge>
                                  ) : (
                                    formatCleanupWarnings(pool)
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Page>
  )
}
