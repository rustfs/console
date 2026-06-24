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

export interface RebalanceCleanupWarnings {
  count: number
  lastMessage?: string
  lastBucket?: string
  lastObject?: string
  lastAt?: string
  present?: boolean
}

export interface PoolDecommissionSummary {
  startTime?: string
  startSize: number
  totalSize: number
  currentSize: number
  complete: boolean
  failed: boolean
  canceled: boolean
  queued: boolean
  queuedBuckets: string[]
  decommissionedBuckets: string[]
  bucket: string
  prefix: string
  object: string
  stage: string
  objects: number
  objectsFailed: number
  bytes: number
  bytesFailed: number
  waitingReason?: string
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
  decommissionStatus: string
  rebalanceStatus: string
  progress: PoolUsageProgress
  cleanupWarnings: RebalanceCleanupWarnings
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
  poolStatus: string
  poolId: string
  complete: boolean
  failed: boolean
  canceled: boolean
  queued: boolean
  progressPercent: number
  objects: number
  objectsFailed: number
  versions: number
  bytes: number
  bytesFailed: number
  startSize: number
  totalSize: number
  currentSize: number
  bucket: string
  prefix: string
  object: string
  stage: string
  waitingReason?: string
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

function asStringArray(value: unknown): string[] {
  return asArray(value).map(String)
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asIdString(value: unknown): string {
  return value === undefined || value === null ? "" : String(value)
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

function normalizeCleanupWarnings(value: unknown): RebalanceCleanupWarnings {
  const present = value !== undefined && value !== null && typeof value === "object"
  const record = asRecord(value)
  const entries = asArray(record.entries || record.Entries)
  const rawCount = record.count ?? record.Count
  return {
    count: rawCount === undefined || rawCount === null ? entries.length : asNumber(rawCount),
    lastMessage: asString(record.lastMsg || record.LastMsg || record.lastMessage || record.LastMessage) || undefined,
    lastBucket: asString(record.lastBucket || record.LastBucket) || undefined,
    lastObject: asString(record.lastObject || record.LastObject) || undefined,
    lastAt: asString(record.lastAt || record.LastAt) || undefined,
    present,
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
    queued: asBoolean(record.queued || record.Queued),
    queuedBuckets: asStringArray(record.queuedBuckets || record.QueuedBuckets),
    decommissionedBuckets: asStringArray(record.decommissionedBuckets || record.DecommissionedBuckets),
    bucket: asString(record.bucket || record.Bucket),
    prefix: asString(record.prefix || record.Prefix),
    object: asString(record.object || record.Object),
    stage: asString(record.stage || record.Stage),
    objects: asNumber(record.objectsDecommissioned || record.ObjectsDecommissioned || record.objects || record.Objects),
    objectsFailed: asNumber(
      record.objectsDecommissionedFailed || record.ObjectsDecommissionedFailed || record.objectsFailed,
    ),
    bytes: asNumber(record.bytesDecommissioned || record.BytesDecommissioned || record.bytes || record.Bytes),
    bytesFailed: asNumber(record.bytesDecommissionedFailed || record.BytesDecommissionedFailed || record.bytesFailed),
    waitingReason: asString(record.waitingReason || record.WaitingReason) || undefined,
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

function hasExplicitProgressPercent(record: JsonRecord): boolean {
  return (
    record.progressPercent !== undefined ||
    record.ProgressPercent !== undefined ||
    record.percent !== undefined ||
    record.Percent !== undefined
  )
}

function deriveRebalanceProgressPercent(status: string, pools: PoolSummary[]): number {
  const state = normalizeState(status)
  const rebalancePools = participatingRebalancePools(pools)
  if (
    ["completed", "complete", "success", "finished"].includes(state) &&
    rebalancePools.length > 0 &&
    rebalancePools.every(isCompletedRebalancePool)
  ) {
    return 100
  }
  if (rebalancePools.length === 0) return 0

  const finishedPools = rebalancePools.filter(isCompletedRebalancePool).length
  return Math.round((finishedPools / rebalancePools.length) * 100)
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

function pickFieldStatus(record: JsonRecord, camelKey: string, pascalKey: string): string {
  return asString(record[camelKey]) || asString(record[pascalKey])
}

function derivePoolLifecycleStatus(decommissionStatus: string): string {
  const state = normalizeState(decommissionStatus)
  if (["complete", "completed", "success", "finished"].includes(state)) return "decommissioned"
  if (["failed", "canceled", "cancelled"].includes(state)) return "blocked"
  if (["queued", "running", "starting", "started", "in_progress", "in-progress", "stopping"].includes(state)) {
    return "decommissioning"
  }
  return "active"
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
  const cleanupWarnings = normalizeCleanupWarnings(record.cleanupWarnings || record.CleanupWarnings)
  const rawId =
    record.id ?? record.poolId ?? record.pool ?? record.index ?? record.ID ?? record.PoolID ?? record.poolIndex
  const decommissionStatus =
    pickFieldStatus(record, "decommissionStatus", "DecommissionStatus") || deriveDecommissionStatus(decommissionInfo)
  const rebalanceStatus = pickFieldStatus(record, "rebalanceStatus", "RebalanceStatus")
  const lifecycleStatus = pickStatus(record) || derivePoolLifecycleStatus(decommissionStatus)

  return {
    id: String(rawId ?? index),
    name: asString(record.name) || asString(record.cmdline) || `Pool ${String(rawId ?? index)}`,
    total,
    used,
    available,
    currentSize,
    usagePercent: usagePercent || (total > 0 ? clampPercent((used / total) * 100) : 0),
    lastUpdate: asString(record.lastUpdate || record.LastUpdate || record.updatedAt || record.UpdatedAt) || undefined,
    status: lifecycleStatus,
    decommissionStatus,
    rebalanceStatus,
    progress,
    cleanupWarnings,
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
  const pools = poolsSource.map((pool, index) => {
    const normalized = normalizePool(pool, index)
    const poolRecord = asRecord(pool)
    return {
      ...normalized,
      rebalanceStatus: normalized.rebalanceStatus || pickStatus(poolRecord),
    }
  })
  const explicitTotals = normalizeProgress(record.progress || record.Progress || record.totals || record.Totals)
  const totalsAreExplicit = hasProgress(explicitTotals)
  const totals = totalsAreExplicit ? explicitTotals : aggregatePoolProgress(pools)
  const status = pickStatus(record) || deriveStatusFromPools(pools)
  const rawProgress = hasExplicitProgressPercent(record)
    ? asNumber(record.progressPercent || record.ProgressPercent || record.percent || record.Percent)
    : totalsAreExplicit && totals.bytes > 0 && pools.length > 0
      ? (pools.reduce((sum, pool) => sum + pool.progress.bytes, 0) / totals.bytes) * 100
      : deriveRebalanceProgressPercent(status, pools)

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
  const status = pickStatus(record) || pickStatus(info) || deriveDecommissionStatus(info)
  const poolStatus = pickFieldStatus(record, "poolStatus", "PoolStatus")
  const startSize = asNumber(info.startSize || info.StartSize)
  const totalSize =
    asNumber(info.totalSize || info.TotalSize) || asNumber(record.totalSize || record.TotalSize || record.capacity)
  const bytes = asNumber(info.bytesDecommissioned || info.BytesDecommissioned || info.bytes || info.Bytes)
  const progressBase = Math.max(totalSize - startSize, 0)
  const rawProgress =
    asNumber(info.progressPercent || info.ProgressPercent || info.percent || info.Percent) ||
    (asBoolean(info.complete || info.Complete) ? 100 : progressBase > 0 ? (bytes / progressBase) * 100 : 0)

  return {
    status,
    poolStatus,
    poolId:
      asIdString(
        record.id ??
          record.poolId ??
          record.pool ??
          record.ID ??
          record.PoolID ??
          info.poolId ??
          info.pool ??
          info.PoolID,
      ) || fallbackPoolId,
    complete: asBoolean(info.complete || info.Complete),
    failed: asBoolean(info.failed || info.Failed),
    canceled: asBoolean(info.canceled || info.Canceled),
    queued: asBoolean(info.queued || info.Queued),
    progressPercent: clampPercent(rawProgress),
    objects: asNumber(
      info.objectsDecommissioned || info.ObjectsDecommissioned || info.objects || info.Objects || info.objectCount,
    ),
    objectsFailed: asNumber(info.objectsDecommissionedFailed || info.ObjectsDecommissionedFailed || info.objectsFailed),
    versions: asNumber(info.versions || info.Versions || info.versionCount),
    bytes,
    bytesFailed: asNumber(info.bytesDecommissionedFailed || info.BytesDecommissionedFailed || info.bytesFailed),
    startSize,
    totalSize,
    currentSize: asNumber(info.currentSize || info.CurrentSize || info.size || info.Size),
    bucket: asString(info.bucket || info.Bucket),
    prefix: asString(info.prefix || info.Prefix),
    object: asString(info.object || info.Object),
    stage: asString(info.stage || info.Stage),
    waitingReason: asString(info.waitingReason || info.WaitingReason) || undefined,
    message: asString(info.message || info.Message) || undefined,
    startedAt: asString(info.startedAt || info.StartedAt || info.startTime || info.StartTime) || undefined,
    updatedAt: asString(info.updatedAt || info.UpdatedAt) || undefined,
  }
}

export function normalizeDecommissionStatus(value: unknown): DecommissionInfo[] {
  const record = asRecord(value)
  const source = asArray(record.pools).length
    ? asArray(record.pools)
    : asArray(record.Pools).length
      ? asArray(record.Pools)
      : []
  if (source.length === 0 && Object.keys(record).length > 0) {
    const poolId = asIdString(record.id ?? record.poolId ?? record.pool ?? record.ID ?? record.PoolID)
    return [normalizeDecommissionInfo(record, poolId)]
  }
  return source.map((item) => {
    const itemRecord = asRecord(item)
    const poolId = asIdString(
      itemRecord.id ?? itemRecord.poolId ?? itemRecord.pool ?? itemRecord.ID ?? itemRecord.PoolID,
    )
    return normalizeDecommissionInfo(item, poolId)
  })
}

function normalizeState(value: string): string {
  return value.trim().toLowerCase()
}

function deriveDecommissionStatus(info: JsonRecord): string {
  if (asBoolean(info.complete || info.Complete)) return "complete"
  if (asBoolean(info.failed || info.Failed)) return "failed"
  if (asBoolean(info.canceled || info.Canceled)) return "canceled"
  if (asBoolean(info.queued || info.Queued)) return "queued"
  if (asString(info.startTime || info.StartTime)) return "running"
  return ""
}

function isIdleRebalancePool(pool: PoolSummary): boolean {
  return ["", "none", "not_started", "not-started", "idle"].includes(normalizeState(pool.rebalanceStatus))
}

function isCompletedRebalancePool(pool: PoolSummary): boolean {
  return ["completed", "complete", "success", "finished"].includes(normalizeState(pool.rebalanceStatus))
}

function participatingRebalancePools(pools: PoolSummary[]): PoolSummary[] {
  return pools.filter((pool) => !isIdleRebalancePool(pool) || hasProgress(pool.progress))
}

function deriveStatusFromPools(pools: PoolSummary[]): string {
  if (pools.length === 0) return ""

  const states = pools.map((pool) => normalizeState(pool.rebalanceStatus))
  if (states.some((state) => ["failed", "error"].includes(state))) return "failed"
  if (states.some((state) => ["stopping", "stop_requested", "stop-requested"].includes(state))) return "stopping"
  if (
    states.some((state) =>
      ["running", "in_progress", "in-progress", "progressing", "starting", "started"].includes(state),
    )
  ) {
    return "running"
  }
  const rebalancePools = participatingRebalancePools(pools)
  if (rebalancePools.length > 0 && rebalancePools.every(isCompletedRebalancePool)) {
    return "completed"
  }
  if (pools.some(isCompletedRebalancePool) && pools.some(isIdleRebalancePool)) return "running"
  if (pools.every(isIdleRebalancePool)) return ""
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
  if (["starting", "running", "stopping"].includes(rebalanceState)) {
    return "blocked-by-rebalance"
  }
  if (isConfirming) return "confirming"
  if (!info) return "ready"

  const state = normalizeState(info.status)
  if (info.complete || ["complete", "completed", "success", "finished"].includes(state)) return "completed"
  if (info.failed || ["failed", "error"].includes(state)) return "failed"
  if (info.canceled || ["canceled", "cancelled", "stopped"].includes(state)) return "canceled"
  if (info.queued || ["queued", "waiting"].includes(state)) return "running"
  if (["canceling", "cancelling", "stopping"].includes(state)) return "canceling"
  if (["running", "in_progress", "in-progress", "started", "starting"].includes(state)) return "running"
  return "ready"
}
