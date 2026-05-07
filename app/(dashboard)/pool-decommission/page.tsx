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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { usePoolOperations } from "@/hooks/use-pool-operations"
import type {
  DecommissionDisplayState,
  DecommissionInfo,
  PoolsOverview,
  PoolSummary,
  RebalanceDisplayState,
} from "@/lib/pool-operations"
import { useMessage } from "@/lib/feedback/message"
import { niceBytes } from "@/lib/functions"

const POLL_MS = 5000

function shouldPoll(state: DecommissionDisplayState) {
  return ["running", "canceling"].includes(state)
}

export default function PoolDecommissionPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const { getDecommissionViewModel, startDecommission, cancelDecommission } = usePoolOperations()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPoolId, setSelectedPoolId] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [overview, setOverview] = useState<PoolsOverview>({
    pools: [] as PoolSummary[],
    totalCapacity: 0,
    totalUsedCapacity: 0,
    totalAvailableCapacity: 0,
    poolCount: 0,
    supportState: "unsupported" as const,
  })
  const [status, setStatus] = useState<DecommissionInfo | null>(null)
  const [displayState, setDisplayState] = useState<DecommissionDisplayState>("ready")
  const [rebalanceState, setRebalanceState] = useState<RebalanceDisplayState>("idle")
  const pollRef = useRef<number | null>(null)

  const clearPoll = () => {
    if (pollRef.current) {
      window.clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }

  const loadData = useCallback(
    async (showSpinner = true, nextPoolId = selectedPoolId, nextConfirming = confirming) => {
      if (showSpinner) setLoading(true)
      setError(null)
      try {
        const view = await getDecommissionViewModel(nextPoolId || undefined, nextConfirming)
        setOverview(view.overview)
        setStatus(view.status)
        setRebalanceState(view.rebalanceState)
        setDisplayState(view.displayState)
        if (!nextPoolId && view.overview.pools[0]?.id) {
          setSelectedPoolId(view.overview.pools[0].id)
        }
      } catch (loadError) {
        setError((loadError as Error).message || t("Load Failed"))
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    [confirming, getDecommissionViewModel, selectedPoolId, t],
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

  useEffect(() => {
    void loadData(false, selectedPoolId, confirming)
  }, [confirming, loadData, selectedPoolId])

  const selectedPool = overview.pools.find((pool) => pool.id === selectedPoolId) ?? null
  const isBlocked = ["unsupported", "blocked-by-rebalance"].includes(displayState)
  const canRequestStart =
    !isBlocked && !!selectedPoolId && ["ready", "failed", "canceled", "completed"].includes(displayState)
  const canConfirm = confirming && !!selectedPoolId && !isBlocked && !submitting
  const canCancel = ["running"].includes(displayState)

  const handleStart = async () => {
    if (!selectedPoolId) return
    setSubmitting(true)
    try {
      await startDecommission(selectedPoolId)
      setConfirming(false)
      message.success(t("Pool decommission started"))
      await loadData(false, selectedPoolId, false)
    } catch (startError) {
      message.error((startError as Error).message || t("Failed to start decommission"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedPoolId) return
    setSubmitting(true)
    try {
      await cancelDecommission(selectedPoolId)
      message.success(t("Pool decommission cancel requested"))
      await loadData(false, selectedPoolId, false)
    } catch (cancelError) {
      message.error((cancelError as Error).message || t("Failed to cancel decommission"))
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = useMemo(() => {
    switch (displayState) {
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
        return t("Completed")
      case "failed":
        return t("Failed")
      case "canceled":
        return t("Canceled")
      default:
        return t("Unknown")
    }
  }, [displayState, t])

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading || submitting}>
              <RiRefreshLine className="me-2 size-4" />
              {t("Sync")}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={!canCancel || submitting}>
              {t("Cancel")}
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Pool Decommission")}</h1>
      </PageHeader>

      <div className="space-y-6">
        <PoolsOverviewCard overview={overview} operationLabel={t("Pool Decommission")} />

        {displayState === "unsupported" ? (
          <Alert>
            <AlertTitle>{t("Single pool decommission is not supported")}</AlertTitle>
            <AlertDescription>{t("Decommission requires more than one pool in the cluster.")}</AlertDescription>
          </Alert>
        ) : null}

        {displayState === "blocked-by-rebalance" ? (
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
                <div className="grid gap-4 md:grid-cols-[280px_1fr]">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t("Target Pool")}</p>
                    <Select
                      value={selectedPoolId}
                      onValueChange={(value) => {
                        setSelectedPoolId(value)
                        setConfirming(false)
                      }}
                      disabled={submitting || ["running", "canceling"].includes(displayState)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("Select a pool")} />
                      </SelectTrigger>
                      <SelectContent>
                        {overview.pools.map((pool) => (
                          <SelectItem key={pool.id} value={pool.id}>
                            {pool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("Rebalance Status")}</p>
                      <p className="text-sm font-medium">{rebalanceState}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("Progress")}</p>
                      <p className="text-sm font-medium">{Math.round(status?.progressPercent ?? 0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("Objects")}</p>
                      <p className="text-sm font-medium">{status?.objects ?? "--"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("Bytes Moved")}</p>
                      <p className="text-sm font-medium">{status?.bytes ? niceBytes(String(status.bytes)) : "--"}</p>
                    </div>
                  </div>
                </div>

                {selectedPool ? (
                  <div className="rounded-none border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{selectedPool.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("Used Capacity")}: {selectedPool.used ? niceBytes(String(selectedPool.used)) : "--"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={!canRequestStart || submitting}
                          onClick={() => setConfirming(true)}
                        >
                          {t("Start Decommission")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {confirming ? (
                  <Alert>
                    <AlertTitle>{t("Review before decommission")}</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>
                        {t(
                          "This action retires the selected pool and should be used only after verifying rebalance has completed.",
                        )}
                      </p>
                      <p>
                        {t("Selected Pool")}: {selectedPool?.name ?? "--"}
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={handleStart} disabled={!canConfirm}>
                          {submitting ? <Spinner className="me-2 size-4" /> : null}
                          {t("Confirm")}
                        </Button>
                        <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
                          {t("Cancel")}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Progress value={status?.progressPercent ?? 0} className="h-2" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
