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
 * Sum only reported measurements within the visible namespace.
 * @param {string[]} names
 * @param {Map<string, AccountBucketUsage | null>} usage
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
