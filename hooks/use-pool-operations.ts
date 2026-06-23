"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"
import {
  deriveDecommissionDisplayState,
  deriveRebalanceDisplayState,
  normalizeDecommissionInfo,
  normalizeDecommissionStatus,
  normalizePoolsOverview,
  normalizeRebalanceStatus,
  type DecommissionDisplayState,
  type DecommissionInfo,
  type PoolsOverview,
  type RebalanceDisplayState,
  type RebalanceStatus,
} from "@/lib/pool-operations"

export interface RebalanceViewModel {
  overview: PoolsOverview
  status: RebalanceStatus | null
  displayState: RebalanceDisplayState
}

export interface DecommissionViewModel {
  overview: PoolsOverview
  status: DecommissionInfo | null
  rebalanceState: RebalanceDisplayState
  displayState: DecommissionDisplayState
}

export function usePoolOperations() {
  const api = useApi()

  const getPoolsOverview = useCallback(async () => {
    const response = await api.get("/pools/list")
    return normalizePoolsOverview(response)
  }, [api])

  const getRebalanceStatus = useCallback(async () => {
    const response = await api.get("/rebalance/status")
    return normalizeRebalanceStatus(response)
  }, [api])

  const startRebalance = useCallback(async () => {
    const response = await api.post("/rebalance/start", {})
    return normalizeRebalanceStatus(response)
  }, [api])

  const stopRebalance = useCallback(async () => {
    const response = await api.post("/rebalance/stop", {})
    return normalizeRebalanceStatus(response)
  }, [api])

  const getDecommissionStatus = useCallback(
    async (poolId: string) => {
      const response = await api.get("/decommission/status", {
        params: {
          pool: poolId,
          "by-id": "true",
        },
      })
      return normalizeDecommissionInfo(response, poolId)
    },
    [api],
  )

  const getDecommissionStatuses = useCallback(async () => {
    const response = await api.get("/decommission/status")
    return normalizeDecommissionStatus(response)
  }, [api])

  const startDecommission = useCallback(
    async (poolId: string) => {
      const response = await api.post(`/pools/decommission?pool=${encodeURIComponent(poolId)}&by-id=true`, {})
      return normalizeDecommissionInfo(response, poolId)
    },
    [api],
  )

  const cancelDecommission = useCallback(
    async (poolId: string) => {
      const response = await api.post(`/pools/cancel?pool=${encodeURIComponent(poolId)}&by-id=true`, {})
      return normalizeDecommissionInfo(response, poolId)
    },
    [api],
  )

  const clearDecommission = useCallback(
    async (poolId: string) => {
      const response = await api.post(`/pools/clear?pool=${encodeURIComponent(poolId)}&by-id=true`, {})
      return normalizeDecommissionInfo(response, poolId)
    },
    [api],
  )

  const getRebalanceViewModel = useCallback(async (): Promise<RebalanceViewModel> => {
    const [overview, status] = await Promise.all([getPoolsOverview(), getRebalanceStatus().catch(() => null)])
    return {
      overview,
      status,
      displayState: deriveRebalanceDisplayState(status, overview.supportState),
    }
  }, [getPoolsOverview, getRebalanceStatus])

  const getDecommissionViewModel = useCallback(
    async (poolId?: string, isConfirming = false): Promise<DecommissionViewModel> => {
      const [overview, rebalanceStatus] = await Promise.all([
        getPoolsOverview(),
        getRebalanceStatus().catch(() => null),
      ])
      const rebalanceState = deriveRebalanceDisplayState(rebalanceStatus, overview.supportState)
      const decommissionStatus = poolId ? await getDecommissionStatus(poolId).catch(() => null) : null

      return {
        overview,
        status: decommissionStatus,
        rebalanceState,
        displayState: deriveDecommissionDisplayState(
          decommissionStatus,
          overview.supportState,
          rebalanceState,
          isConfirming,
        ),
      }
    },
    [getDecommissionStatus, getPoolsOverview, getRebalanceStatus],
  )

  return {
    getPoolsOverview,
    getRebalanceStatus,
    startRebalance,
    stopRebalance,
    getDecommissionStatus,
    getDecommissionStatuses,
    startDecommission,
    cancelDecommission,
    clearDecommission,
    getRebalanceViewModel,
    getDecommissionViewModel,
  }
}
