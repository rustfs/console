import type { DecommissionInfo, PoolsOverview, RebalanceStatus } from "@/lib/pool-operations"

interface PoolDecommissionLoaders {
  getPoolsOverview: () => Promise<PoolsOverview>
  getRebalanceStatus: () => Promise<RebalanceStatus | null>
  getDecommissionStatuses: () => Promise<DecommissionInfo[]>
}

export async function loadPoolDecommissionData({
  getPoolsOverview,
  getRebalanceStatus,
  getDecommissionStatuses,
}: PoolDecommissionLoaders) {
  const overview = await getPoolsOverview()
  const [rebalanceResult, decommissionResult] = await Promise.allSettled([
    getRebalanceStatus(),
    overview.supportState === "supported" ? getDecommissionStatuses() : Promise.resolve([]),
  ])

  if (decommissionResult.status === "rejected") throw decommissionResult.reason

  return {
    overview,
    rebalanceResult,
    decommissionStatuses: decommissionResult.value,
  }
}
