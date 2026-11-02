export interface PrefixSummaryPage {
  Contents?: Array<{ Size?: number; LastModified?: Date }>
  IsTruncated?: boolean
  NextContinuationToken?: string
}

export class PrefixSummaryLimitError extends Error {}

// A bounded, explicit scan. S3 pagination is not a point-in-time snapshot.
export async function summarizePrefix(
  fetchPage: (token: string | undefined, signal: AbortSignal) => Promise<PrefixSummaryPage>,
  signal: AbortSignal,
) {
  let count = 0
  let size: number | bigint = 0
  let lastModified: Date | undefined
  let token: string | undefined
  const seen = new Set<string>()
  for (let page = 0; page < 100; page++) {
    signal.throwIfAborted()
    const response = await fetchPage(token, signal)
    signal.throwIfAborted()
    for (const object of response.Contents ?? []) {
      if (++count > 100_000) throw new PrefixSummaryLimitError("Prefix is too large to calculate in one scan")
      const timestamp = object.LastModified?.getTime()
      if (
        !Number.isSafeInteger(object.Size) ||
        object.Size! < 0 ||
        timestamp === undefined ||
        !Number.isFinite(timestamp)
      ) {
        throw new Error("Incomplete object metadata")
      }
      if (typeof size === "number" && object.Size! <= Number.MAX_SAFE_INTEGER - size) {
        size += object.Size!
      } else {
        size = BigInt(size) + BigInt(object.Size!)
      }
      if (!lastModified || timestamp > lastModified.getTime()) lastModified = object.LastModified
    }
    if (response.IsTruncated === false) return { size, lastModified }
    const next = response.NextContinuationToken
    if (response.IsTruncated !== true || !next || seen.has(next)) throw new Error("Invalid pagination response")
    seen.add(next)
    token = next
  }
  throw new PrefixSummaryLimitError("Prefix is too large to calculate in one scan")
}

/** Compare byte counts without converting large values to floating point. */
export function compareByteCounts(left: number | bigint, right: number | bigint): number {
  return left < right ? -1 : left > right ? 1 : 0
}
