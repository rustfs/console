/**
 * @typedef {{ objectsCount: number, sizeBytes: number }} AccountBucketUsage
 */

/**
 * Extract bucket statistics from the authoritative accountinfo response.
 * A null entry identifies a bucket returned without either statistic.
 * Absent and malformed entries have no established measurement status.
 *
 * @param {Record<string, unknown> | null | undefined} accountInfo
 * @returns {Map<string, AccountBucketUsage | null>}
 */
export function getAccountBucketUsage(accountInfo) {
  /** @type {Map<string, AccountBucketUsage | null>} */
  const usage = new Map()
  const buckets = Array.isArray(accountInfo?.buckets) ? accountInfo.buckets : []

  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue

    const { name, objects, size } = bucket
    if (typeof name !== "string" || !name) continue
    if (bucket.usage_value_state === "observed") {
      usage.set(name, null)
      continue
    }
    if (objects === undefined && size === undefined) {
      usage.set(name, null)
      continue
    }
    if (
      typeof objects !== "number" ||
      !Number.isSafeInteger(objects) ||
      objects < 0 ||
      typeof size !== "number" ||
      !Number.isFinite(size) ||
      size < 0
    ) {
      continue
    }

    usage.set(name, { objectsCount: objects, sizeBytes: size })
  }

  return usage
}

/**
 * Explicitly authorized first measurements, kept outside the complete sum.
 * Missing flags, failed requests and malformed complete values never fall back.
 * @param {Record<string, unknown> | null | undefined} accountInfo
 * @returns {Map<string, AccountBucketUsage & { initial: true }>}
 */
export function getAccountBucketInitialUsage(accountInfo) {
  const complete = getAccountBucketUsage(accountInfo)
  const statuses = getAccountBucketScanStatus(accountInfo)
  /** @type {Map<string, AccountBucketUsage & { initial: true }>} */
  const initial = new Map()
  for (const bucket of Array.isArray(accountInfo?.buckets) ? accountInfo.buckets : []) {
    if (
      !bucket ||
      bucket.initial_scan !== true ||
      bucket.objects !== undefined ||
      bucket.size !== undefined ||
      complete.get(bucket.name) !== null
    )
      continue
    const progress = statuses.get(bucket.name)?.progress
    if (
      !progress ||
      progress.stage === "enumerating" ||
      progress.objectsCount === undefined ||
      progress.sizeBytes === undefined
    )
      continue
    initial.set(bucket.name, { objectsCount: progress.objectsCount, sizeBytes: progress.sizeBytes, initial: true })
  }
  return initial
}

/**
 * Complete measurements always win; initial values remain explicitly marked.
 * @param {Record<string, unknown> | null | undefined} accountInfo
 * @returns {Map<string, (AccountBucketUsage & { initial?: true }) | null>}
 */
export function getAccountBucketDisplayUsage(accountInfo) {
  const usage = getAccountBucketUsage(accountInfo)
  for (const [name, initial] of getAccountBucketInitialUsage(accountInfo)) usage.set(name, initial)
  return usage
}

/**
 * Sum only reported measurements within the visible namespace.
 * @param {string[]} names
 * @param {ReadonlyMap<string, AccountBucketUsage | null>} usage
 * @returns {{ measuredBuckets: number, objectsCount: number | undefined, sizeBytes: number | undefined }}
 */
export function summarizeBucketUsage(names, usage) {
  let objectsCount = 0
  let sizeBytes = 0
  let measuredBuckets = 0
  for (const name of names) {
    const bucket = usage.get(name)
    if (!bucket) continue
    measuredBuckets += 1
    objectsCount += bucket.objectsCount
    sizeBytes += bucket.sizeBytes
  }
  return {
    measuredBuckets,
    objectsCount: Number.isSafeInteger(objectsCount) ? objectsCount : undefined,
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : undefined,
  }
}

/**
 * @typedef {{ stage: "enumerating" | "scanning" | "awaiting_sources" | "completed", updatedAt: number, objectsCount?: number, sizeBytes?: number, sourcesObserved: number, sourcesTotal: number }} BucketScanProgress
 * @typedef {{ progress?: BucketScanProgress, updatedAt?: number, state?: string }} AccountBucketScanStatus
 */

const validCounter = (value) => Number.isSafeInteger(value) && value >= 0
const validTimestamp = (value) => Number.isSafeInteger(value) && value > 0 && value <= 8640000000000000

/**
 * Parse optional display diagnostics separately from reported bucket totals.
 * Partial usage never enters getAccountBucketUsage or the overview sum.
 * @param {Record<string, unknown> | null | undefined} accountInfo
 * @returns {Map<string, AccountBucketScanStatus>}
 */
export function getAccountBucketScanStatus(accountInfo) {
  /** @type {Map<string, AccountBucketScanStatus>} */
  const statuses = new Map()
  const buckets = Array.isArray(accountInfo?.buckets) ? accountInfo.buckets : []
  for (const bucket of buckets) {
    if (!bucket || typeof bucket.name !== "string" || !bucket.name) continue
    /** @type {AccountBucketScanStatus} */
    const status = {}
    if (validTimestamp(bucket.usage_updated_at)) status.updatedAt = bucket.usage_updated_at
    if (["certified", "carried", "observed", "unknown"].includes(bucket.usage_value_state)) {
      status.state = bucket.usage_value_state
    }
    const progress = bucket.scan_progress
    if (
      progress &&
      ["enumerating", "scanning", "awaiting_sources", "completed"].includes(progress.stage) &&
      validTimestamp(progress.updated_at) &&
      validCounter(progress.sources_observed) &&
      validCounter(progress.sources_total) &&
      progress.sources_observed > 0 &&
      progress.sources_observed <= progress.sources_total &&
      ((progress.objects == null && progress.size == null) ||
        (validCounter(progress.objects) && validCounter(progress.size))) &&
      (progress.stage !== "completed" ||
        (progress.sources_observed === progress.sources_total && validCounter(progress.objects)))
    ) {
      status.progress = {
        stage: progress.stage,
        updatedAt: progress.updated_at,
        sourcesObserved: progress.sources_observed,
        sourcesTotal: progress.sources_total,
        ...(progress.objects != null ? { objectsCount: progress.objects, sizeBytes: progress.size } : {}),
      }
    }
    statuses.set(bucket.name, status)
  }
  return statuses
}
