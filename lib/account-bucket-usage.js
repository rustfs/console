/**
 * @typedef {{ objectsCount: number, sizeBytes: number }} AccountBucketUsage
 */

/**
 * Extract bucket statistics from the authoritative accountinfo response.
 * Invalid or incomplete entries are omitted so callers can display an
 * unavailable state instead of fabricating zero usage.
 *
 * @param {Record<string, unknown> | null | undefined} accountInfo
 * @returns {Map<string, AccountBucketUsage>}
 */
export function getAccountBucketUsage(accountInfo) {
  /** @type {Map<string, AccountBucketUsage>} */
  const usage = new Map()
  const buckets = Array.isArray(accountInfo?.buckets) ? accountInfo.buckets : []

  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue

    const { name, objects, size } = bucket
    if (
      typeof name !== "string" ||
      !name ||
      typeof objects !== "number" ||
      !Number.isFinite(objects) ||
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
