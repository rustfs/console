"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiAlertLine, RiRefreshLine } from "@remixicon/react"
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
import { useMessage } from "@/lib/feedback/message"
import { niceBytes } from "@/lib/functions"

const POLL_MS = 5000

function shouldPoll(state: DecommissionDisplayState) {
  return ["running", "canceling"].includes(state)
}

function formatBytesValue(value?: number) {
  return value === undefined ? "--" : niceBytes(String(value))
}

function getPoolDisplayState(
  status: DecommissionInfo | null,
  supportState: PoolSupportState,
  rebalanceState: RebalanceDisplayState,
  isConfirming = false,
) {
  return deriveDecommissionDisplayState(status, supportState, rebalanceState, isConfirming)
}

function formatPoolStatusLabel(state: DecommissionDisplayState, t: (key: string) => string) {
  switch (state) {
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
  return "secondary"
}

export default function PoolDecommissionPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const { getPoolsOverview, getRebalanceStatus, getDecommissionStatus, startDecommission, cancelDecommission } =
    usePoolOperations()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePoolId, setActivePoolId] = useState("")
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
        if (!activePoolId && nextOverview.pools[0]?.id) {
          setActivePoolId(nextOverview.pools[0].id)
        }
        if (!selectedPoolId && nextOverview.pools[0]?.id) {
          setSelectedPoolId(nextOverview.pools[0].id)
        }
      } catch (loadError) {
        setError((loadError as Error).message || t("Load Failed"))
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [activePoolId, getDecommissionStatus, getPoolsOverview, getRebalanceStatus, selectedPoolId, t],
  )

  useEffect(() => {
    void loadData()
    return clearPoll
  }, [loadData])

  useEffect(() => {
    clearPoll()
    if (
      !Object.values(statuses).some((status) =>
        shouldPoll(getPoolDisplayState(status, overview.supportState, rebalanceState)),
      )
    ) {
      return
    }
    pollRef.current = window.setTimeout(() => {
      void loadData(false)
    }, POLL_MS)
    return clearPoll
  }, [loadData, overview.supportState, rebalanceState, statuses])

  const activeStatus = statuses[activePoolId] ?? null
  const activeDisplayState = getPoolDisplayState(
    activeStatus,
    overview.supportState,
    rebalanceState,
    confirmingPoolId === activePoolId,
  )
  const canCancelActive = activePoolId
    ? getPoolDisplayState(activeStatus, overview.supportState, rebalanceState) === "running"
    : false
  const selectedPoolName = overview.pools.find((pool) => pool.id === selectedPoolId)?.name ?? "--"

  const handleStart = async (poolId: string) => {
    setSubmitting(true)
    try {
      await startDecommission(poolId)
      setConfirmingPoolId("")
      setActivePoolId(poolId)
      message.success(t("Pool decommission started"))
      await loadData(false)
    } catch (startError) {
      message.error((startError as Error).message || t("Failed to start decommission"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (poolId = activePoolId) => {
    if (!poolId) return
    setSubmitting(true)
    try {
      await cancelDecommission(poolId)
      setActivePoolId(poolId)
      message.success(t("Pool decommission cancel requested"))
      await loadData(false)
    } catch (cancelError) {
      message.error((cancelError as Error).message || t("Failed to cancel decommission"))
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = useMemo(() => {
    switch (activeDisplayState) {
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
  }, [activeDisplayState, t])

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

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading || submitting}>
              <RiRefreshLine className="me-2 size-4" />
              {t("Sync")}
            </Button>
            <Button variant="outline" onClick={() => void handleCancel()} disabled={!canCancelActive || submitting}>
              {t("Cancel")}
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Pool Decommission")}</h1>
      </PageHeader>

      <div className="space-y-6">
        <PoolsOverviewCard overview={overview} operationLabel={t("Pool Decommission")} />

        {overview.supportState === "unsupported" ? (
          <Alert>
            <AlertTitle>{t("Single pool decommission is not supported")}</AlertTitle>
            <AlertDescription>{t("Decommission requires more than one pool in the cluster.")}</AlertDescription>
          </Alert>
        ) : null}

        {["starting", "running", "stopping", "failed", "stopped", "unknown"].includes(rebalanceState) ? (
          <Alert>
            <RiAlertLine className="size-4" />
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

        <Card className="rounded-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>{t("Current Pool Decommission Status")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("Select a pool, review its impact, then start or monitor retirement.")}
              </p>
            </div>
            <Badge
              variant={
                activeDisplayState === "failed"
                  ? "destructive"
                  : activeDisplayState === "completed"
                    ? "default"
                    : "secondary"
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
                    <p className="text-xs text-muted-foreground">{t("Active Pool")}</p>
                    <p className="truncate text-sm font-medium">
                      {overview.pools.find((pool) => pool.id === activePoolId)?.name ?? "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Selected Pool")}</p>
                    <p className="truncate text-sm font-medium">{selectedPoolName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Progress")}</p>
                    <p className="text-sm font-medium">{Math.round(activeStatus?.progressPercent ?? 0)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Bytes Moved")}</p>
                    <p className="text-sm font-medium">{formatBytesValue(activeStatus?.bytes)}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Pool")}</TableHead>
                      <TableHead>{t("Status")}</TableHead>
                      <TableHead>{t("Used Capacity")}</TableHead>
                      <TableHead>{t("Progress")}</TableHead>
                      <TableHead>{t("Objects")}</TableHead>
                      <TableHead>{t("Bytes Moved")}</TableHead>
                      <TableHead className="text-right">{t("Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poolRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {t("No Data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      poolRows.map(({ pool, status: rowStatus, displayState: rowState }) => {
                        const hasDecommissionStarted = Boolean(rowStatus)
                        const canRequestStart = !submitting && rowState === "ready"
                        const canConfirm = !submitting && rowState === "confirming"
                        const canCancel = !submitting && rowState === "running"

                        return (
                          <TableRow
                            key={pool.id}
                            data-state={pool.id === selectedPoolId ? "selected" : undefined}
                            onClick={() => setSelectedPoolId(pool.id)}
                          >
                            <TableCell className="max-w-[320px] truncate">{pool.name}</TableCell>
                            <TableCell>
                              <Badge variant={getPoolStatusBadgeVariant(rowState)}>
                                {formatPoolStatusLabel(rowState, t)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatBytesValue(pool.used)}</TableCell>
                            <TableCell className="min-w-32">
                              {hasDecommissionStarted ? (
                                <div className="flex items-center gap-2">
                                  <Progress value={rowStatus?.progressPercent ?? 0} className="h-2 w-20" />
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(rowStatus?.progressPercent ?? 0)}%
                                  </span>
                                </div>
                              ) : (
                                "--"
                              )}
                            </TableCell>
                            <TableCell>{hasDecommissionStarted ? (rowStatus?.objects ?? "--") : "--"}</TableCell>
                            <TableCell>{hasDecommissionStarted ? formatBytesValue(rowStatus?.bytes) : "--"}</TableCell>
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
                                      {submitting && activePoolId === pool.id ? (
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
                                      disabled={!canRequestStart || hasDecommissionStarted}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setActivePoolId(pool.id)
                                        setSelectedPoolId(pool.id)
                                        setConfirmingPoolId(pool.id)
                                      }}
                                    >
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
                      {t("Selected Pool")}: {overview.pools.find((pool) => pool.id === confirmingPoolId)?.name ?? "--"}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Progress value={activeStatus?.progressPercent ?? 0} className="h-2" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
