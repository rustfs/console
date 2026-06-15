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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  return ["failed", "error"].includes(pool.status.trim().toLowerCase())
}

function formatCleanupWarnings(pool: PoolSummary) {
  const warnings = pool.cleanupWarnings
  if (!warnings.count) return "--"

  const context = [warnings.lastBucket, warnings.lastObject].filter(Boolean).join("/")
  return context ? `${warnings.count} (${context})` : String(warnings.count)
}

export default function RebalancePage() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const message = useMessage()
  const { getRebalanceViewModel, startRebalance, stopRebalance } = usePoolOperations()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
        const view = await getRebalanceViewModel()
        setOverview(view.overview)
        setStatus(view.status)
        setDisplayState(view.displayState)
      } catch (loadError) {
        setError((loadError as Error).message || t("Load Failed"))
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [getRebalanceViewModel, t],
  )

  useEffect(() => {
    void loadData()
    return clearPoll
  }, [loadData])

  useEffect(() => {
    clearPoll()
    if (!shouldPoll(displayState)) return
    pollRef.current = window.setTimeout(() => {
      void loadData(false)
    }, POLL_MS)
    return clearPoll
  }, [displayState, loadData])

  const canStart =
    overview.supportState === "supported" && ["idle", "completed", "failed", "stopped"].includes(displayState)
  const canStop = ["starting", "running"].includes(displayState)

  const handleStart = async () => {
    setSubmitting(true)
    try {
      await startRebalance()
      message.success(t("Rebalance started"))
      await loadData(false)
    } catch (startError) {
      message.error((startError as Error).message || t("Failed to start rebalance"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStop = () => {
    dialog.warning({
      title: t("Stop rebalance"),
      content: t("Are you sure you want to stop the current rebalance operation?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        setSubmitting(true)
        try {
          await stopRebalance()
          message.success(t("Rebalance stop requested"))
          await loadData(false)
        } catch (stopError) {
          message.error((stopError as Error).message || t("Failed to stop rebalance"))
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  const statusLabel = useMemo(() => {
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
  }, [displayState, t])

  const pools = useMemo(() => {
    const statusPools = new Map((status?.pools ?? []).map((pool) => [pool.id, pool]))
    return overview.pools.map((pool) => {
      const statusPool = statusPools.get(pool.id)
      if (!statusPool) return pool
      return {
        ...pool,
        status: statusPool.status || pool.status,
        progress: statusPool.progress,
        cleanupWarnings: statusPool.cleanupWarnings,
      }
    })
  }, [overview.pools, status?.pools])

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading || submitting}>
              <RiRefreshLine className="me-2 size-4" aria-hidden />
              {t("Sync")}
            </Button>
            <Button onClick={handleStart} disabled={!canStart || submitting}>
              {submitting && canStart ? (
                <Spinner className="me-2 size-4" />
              ) : (
                <RiPlayCircleLine className="me-2 size-4" aria-hidden />
              )}
              {t("Start Rebalance")}
            </Button>
            <Button variant="outline" onClick={handleStop} disabled={!canStop || submitting}>
              <RiPauseCircleLine className="me-2 size-4" aria-hidden />
              {t("Stop")}
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Rebalance")}</h1>
      </PageHeader>

      <div className="space-y-6">
        <PoolsOverviewCard overview={overview} operationLabel={t("Rebalance")} showDecommissionColumns={false} />

        {overview.supportState === "unsupported" ? (
          <Alert>
            <AlertTitle>{t("Single pool rebalance is not supported")}</AlertTitle>
            <AlertDescription>{t("Rebalance requires more than one pool in the cluster.")}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{t("Load Failed")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
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
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="size-8 text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
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

                <Progress value={status?.progressPercent ?? 0} className="h-2" />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Pool")}</TableHead>
                      <TableHead>{t("Status")}</TableHead>
                      <TableHead>{t("Used Capacity")}</TableHead>
                      <TableHead>{t("Bytes Moved")}</TableHead>
                      <TableHead>{t("Objects")}</TableHead>
                      <TableHead>{t("Versions")}</TableHead>
                      <TableHead>{t("Cleanup Warnings")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {t("No Data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      pools.map((pool) => (
                        <TableRow
                          key={pool.id}
                          className={cn(isFailedRebalancePool(pool) && "bg-destructive/15 hover:bg-destructive/20")}
                        >
                          <TableCell>{pool.name}</TableCell>
                          <TableCell>{pool.status || "--"}</TableCell>
                          <TableCell>{formatBytesValue(pool.used)}</TableCell>
                          <TableCell>{formatBytesValue(pool.progress.bytes)}</TableCell>
                          <TableCell>{formatNumberValue(pool.progress.objects)}</TableCell>
                          <TableCell>{formatNumberValue(pool.progress.versions)}</TableCell>
                          <TableCell>
                            {pool.cleanupWarnings.count > 0 ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                                {formatCleanupWarnings(pool)}
                              </Badge>
                            ) : (
                              "--"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
