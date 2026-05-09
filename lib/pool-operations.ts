export type PoolSupportState = "supported" | "unsupported"
export type RebalanceDisplayState =
  | "unsupported"
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "completed"
  | "failed"
  | "stopped"
  | "unknown"
export type DecommissionDisplayState =
  | "unsupported"
  | "blocked-by-rebalance"
  | "ready"
  | "confirming"
  | "running"
  | "canceling"
  | "completed"
  | "failed"
  | "canceled"
  | "unknown"

export interface PoolUsageProgress {
  bytes: number
  objects: number
  versions: number
  eta: number
  elapsed: number
}

export interface PoolDecommissionSummary {
  startTime?: string
  startSize: number
  totalSize: number
  currentSize: number
  complete: boolean
  failed: boolean
  canceled: boolean
  objects: number
  objectsFailed: number
  bytes: number
  bytesFailed: number
}

export interface PoolSummary {
  id: string
  name: string
  total: number
  used: number
  available: number
  currentSize: number
  usagePercent: number
  lastUpdate?: string
  status: string
  progress: PoolUsageProgress
  decommission: PoolDecommissionSummary
}

export interface PoolsOverview {
  pools: PoolSummary[]
  totalCapacity: number
  totalUsedCapacity: number
  totalAvailableCapacity: number
  poolCount: number
  supportState: PoolSupportState
}

export interface RebalanceStatus {
  id: string
  status: string
  startedAt?: string
  updatedAt?: string
  stoppedAt?: string
  finishedAt?: string
  message?: string
  progressPercent: number
  pools: PoolSummary[]
  totals: PoolUsageProgress
}

export interface DecommissionInfo {
  status: string
  poolId: string
  complete: boolean
  failed: boolean
  canceled: boolean
  progressPercent: number
  objects: number
  versions: number
  bytes: number
  currentSize: number
  message?: string
  startedAt?: string
  updatedAt?: string
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function normalizeProgress(value: unknown): PoolUsageProgress {
  const record = asRecord(value)
  return {
    bytes: asNumber(record.bytes),
    objects: asNumber(record.objects),
    versions: asNumber(record.versions),
    eta: asNumber(record.eta),
    elapsed: asNumber(record.elapsed),
  }
}

function normalizeDecommissionSummary(value: unknown): PoolDecommissionSummary {
  const record = asRecord(value)
  return {
    startTime: asString(record.startTime || record.StartTime) || undefined,
    startSize: asNumber(record.startSize || record.StartSize),
    totalSize: asNumber(record.totalSize || record.TotalSize),
    currentSize: asNumber(record.currentSize || record.CurrentSize),
    complete: asBoolean(record.complete || record.Complete),
    failed: asBoolean(record.failed || record.Failed),
    canceled: asBoolean(record.canceled || record.Canceled),
    objects: asNumber(record.objectsDecommissioned || record.ObjectsDecommissioned || record.objects || record.Objects),
    objectsFailed: asNumber(
      record.objectsDecommissionedFailed || record.ObjectsDecommissionedFailed || record.objectsFailed,
    ),
    bytes: asNumber(record.bytesDecommissioned || record.BytesDecommissioned || record.bytes || record.Bytes),
    bytesFailed: asNumber(record.bytesDecommissionedFailed || record.BytesDecommissionedFailed || record.bytesFailed),
  }
}

function hasProgress(progress: PoolUsageProgress): boolean {
  return Boolean(progress.bytes || progress.objects || progress.versions || progress.eta || progress.elapsed)
}

function aggregatePoolProgress(pools: PoolSummary[]): PoolUsageProgress {
  return pools.reduce(
    (totals, pool) => ({
      bytes: totals.bytes + pool.progress.bytes,
      objects: totals.objects + pool.progress.objects,
      versions: totals.versions + pool.progress.versions,
      eta: Math.max(totals.eta, pool.progress.eta),
      elapsed: Math.max(totals.elapsed, pool.progress.elapsed),
    }),
    { bytes: 0, objects: 0, versions: 0, eta: 0, elapsed: 0 },
  )
}

function pickStatus(record: JsonRecord): string {
  return (
    asString(record.status) ||
    asString(record.State) ||
    asString(record.state) ||
    asString(record.phase) ||
    asString(record.result)
  )
}

function normalizePool(value: unknown, index: number): PoolSummary {
  const record = asRecord(value)
  const decommissionInfo = asRecord(record.decommissionInfo || record.DecommissionInfo)
  const decommission = normalizeDecommissionSummary(decommissionInfo)
  const total = asNumber(
    record.total || record.capacity || record.totalSize || record.Total || record.TotalSize || decommission.totalSize,
  )
  const explicitUsed = asNumber(record.usedSize || record.UsedSize || record.usedCapacity || record.UsedCapacity)
  const rawUsed = asNumber(record.used || record.Used)
  const used =
    explicitUsed || (rawUsed > 0 && rawUsed <= 1 && total > 0 ? total * rawUsed : rawUsed) || decommission.currentSize
  const currentSize = asNumber(record.currentSize || record.CurrentSize || decommission.currentSize)
  const available =
    asNumber(record.available || record.availableCapacity || record.Available || record.AvailableCapacity) ||
    Math.max(total - used, 0)
  const rawUsagePercent = asNumber(record.used || record.Used || record.usagePercent || record.UsagePercent)
  const usagePercent = clampPercent(
    rawUsagePercent > 0 && rawUsagePercent <= 1 ? rawUsagePercent * 100 : rawUsagePercent,
  )
  const progress = normalizeProgress(record.progress || record.Progress)
  const rawId =
    record.id ?? record.poolId ?? record.pool ?? record.index ?? record.ID ?? record.PoolID ?? record.poolIndex

  return {
    id: String(rawId ?? index),
    name: asString(record.name) || asString(record.cmdline) || `Pool ${String(rawId ?? index)}`,
    total,
    used,
    available,
    currentSize,
    usagePercent: usagePercent || (total > 0 ? clampPercent((used / total) * 100) : 0),
    lastUpdate: asString(record.lastUpdate || record.LastUpdate || record.updatedAt || record.UpdatedAt) || undefined,
    status: pickStatus(record),
    progress,
    decommission,
  }
}

function computeOverview(pools: PoolSummary[]): PoolsOverview {
  const totalCapacity = pools.reduce((sum, pool) => sum + pool.total, 0)
  const totalUsedCapacity = pools.reduce((sum, pool) => sum + pool.used, 0)
  const totalAvailableCapacity = pools.reduce((sum, pool) => sum + pool.available, 0)
  return {
    pools,
    totalCapacity,
    totalUsedCapacity,
    totalAvailableCapacity,
    poolCount: pools.length,
    supportState: pools.length > 1 ? "supported" : "unsupported",
  }
}

export function normalizePoolsOverview(value: unknown): PoolsOverview {
  const record = asRecord(value)
  const poolsSource = asArray(record.pools).length
    ? asArray(record.pools)
    : asArray(record.Pools).length
      ? asArray(record.Pools)
      : asArray(value)
  const pools = poolsSource.map((pool, index) => normalizePool(pool, index))
  return computeOverview(pools)
}

export function normalizeRebalanceStatus(value: unknown): RebalanceStatus {
  const record = asRecord(value)
  const poolsSource = asArray(record.pools).length
    ? asArray(record.pools)
    : asArray(record.Pools).length
      ? asArray(record.Pools)
      : []
  const pools = poolsSource.map((pool, index) => normalizePool(pool, index))
  const explicitTotals = normalizeProgress(record.progress || record.Progress || record.totals || record.Totals)
  const totals = hasProgress(explicitTotals) ? explicitTotals : aggregatePoolProgress(pools)
  const status = pickStatus(record) || deriveStatusFromPools(pools)
  const rawProgress =
    asNumber(record.progressPercent || record.ProgressPercent || record.percent || record.Percent) ||
    (totals.bytes > 0 && pools.length > 0
      ? (pools.reduce((sum, pool) => sum + pool.progress.bytes, 0) / totals.bytes) * 100
      : ["completed", "complete", "success", "finished"].includes(normalizeState(status))
        ? 100
        : 0)

  return {
    id: asString(record.id) || asString(record.ID),
    status,
    startedAt: asString(record.startedAt || record.StartedAt) || undefined,
    updatedAt: asString(record.updatedAt || record.UpdatedAt) || undefined,
    stoppedAt: asString(record.stoppedAt || record.StoppedAt) || undefined,
    finishedAt: asString(record.finishedAt || record.FinishedAt) || undefined,
    message: asString(record.message || record.Message) || undefined,
    progressPercent: clampPercent(rawProgress),
    pools,
    totals,
  }
}

export function normalizeDecommissionInfo(value: unknown, fallbackPoolId = ""): DecommissionInfo {
  const record = asRecord(value)
  const info = asRecord(record.decommissionInfo || record.DecommissionInfo || value)
  const progressPercent =
    asNumber(info.progressPercent || info.ProgressPercent || info.percent || info.Percent) ||
    (asBoolean(info.complete || info.Complete) ? 100 : 0)

  return {
    status: pickStatus(info),
    poolId: asString(info.poolId || info.pool || info.PoolID || info.Pool) || fallbackPoolId,
    complete: asBoolean(info.complete || info.Complete),
    failed: asBoolean(info.failed || info.Failed),
    canceled: asBoolean(info.canceled || info.Canceled),
    progressPercent: clampPercent(progressPercent),
    objects: asNumber(info.objects || info.Objects || info.objectCount),
    versions: asNumber(info.versions || info.Versions || info.versionCount),
    bytes: asNumber(info.bytes || info.Bytes),
    currentSize: asNumber(info.currentSize || info.CurrentSize || info.size || info.Size),
    message: asString(info.message || info.Message) || undefined,
    startedAt: asString(info.startedAt || info.StartedAt) || undefined,
    updatedAt: asString(info.updatedAt || info.UpdatedAt) || undefined,
  }
}

function normalizeState(value: string): string {
  return value.trim().toLowerCase()
}

function deriveStatusFromPools(pools: PoolSummary[]): string {
  if (pools.length === 0) return ""

  const states = pools.map((pool) => normalizeState(pool.status))
  if (states.some((state) => ["failed", "error"].includes(state))) return "failed"
  if (states.some((state) => ["stopping", "stop_requested", "stop-requested"].includes(state))) return "stopping"
  if (
    states.some((state) =>
      ["running", "in_progress", "in-progress", "progressing", "starting", "started"].includes(state),
    )
  ) {
    return "running"
  }
  if (
    states.every((state) =>
      ["completed", "complete", "success", "finished", "none", "not_started", "not-started"].includes(state),
    )
  ) {
    return "completed"
  }
  return ""
}

export function deriveRebalanceDisplayState(
  status: RebalanceStatus | null,
  supportState: PoolSupportState,
): RebalanceDisplayState {
  if (supportState === "unsupported") return "unsupported"
  if (!status) return "idle"

  const state = normalizeState(status.status)
  if (!state) return status.id ? "starting" : "idle"
  if (["running", "in_progress", "in-progress", "progressing"].includes(state)) return "running"
  if (["starting", "started"].includes(state)) return "starting"
  if (["stopping", "stop_requested", "stop-requested"].includes(state)) return "stopping"
  if (["completed", "complete", "success", "finished"].includes(state)) return "completed"
  if (["failed", "error"].includes(state)) return "failed"
  if (["stopped", "stopped_by_user", "cancelled", "canceled"].includes(state)) return "stopped"
  if (["idle", "none", "not_started", "not-started"].includes(state)) return "idle"
  return "unknown"
}

export function deriveDecommissionDisplayState(
  info: DecommissionInfo | null,
  supportState: PoolSupportState,
  rebalanceState: RebalanceDisplayState,
  isConfirming = false,
): DecommissionDisplayState {
  if (supportState === "unsupported") return "unsupported"
  if (["starting", "running", "stopping", "failed", "stopped", "unknown"].includes(rebalanceState)) {
    return "blocked-by-rebalance"
  }
  if (isConfirming) return "confirming"
  if (!info) return "ready"

  const state = normalizeState(info.status)
  if (info.complete || ["complete", "completed", "success", "finished"].includes(state)) return "completed"
  if (info.failed || ["failed", "error"].includes(state)) return "failed"
  if (info.canceled || ["canceled", "cancelled", "stopped"].includes(state)) return "canceled"
  if (["canceling", "cancelling", "stopping"].includes(state)) return "canceling"
  if (["running", "in_progress", "in-progress", "started", "starting"].includes(state)) return "running"
  return "ready"
}
