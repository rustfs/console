import type { KmsRekeyStartRequest } from "@/types/kms"

// The rekey endpoints answer 404 in two distinct cases: an old server without
// the routes at all, and a supporting server that has simply never run a sweep
// (JSON body {"error": "no rekey sweep has run"}). Only the latter is a normal
// empty state; anything else means the feature is unavailable.
export function isRekeyNeverRanError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const status = (error as Error & { status?: number }).status
  return status === 404 && error.message.includes("no rekey sweep has run")
}

export function isRekeyAlreadyRunningError(error: unknown): boolean {
  return error instanceof Error && (error as Error & { status?: number }).status === 409
}

export function isRekeyUnsupportedError(error: unknown): boolean {
  return error instanceof Error && (error as Error & { status?: number }).status === 501
}

// The server rejects unknown fields and treats a missing list as "all
// buckets", so empty inputs must be omitted entirely.
export function buildRekeyStartRequest(bucketsInput: string, prefixInput: string): KmsRekeyStartRequest {
  const buckets = bucketsInput
    .split(/[\s,]+/)
    .map((bucket) => bucket.trim())
    .filter(Boolean)
  const prefix = prefixInput.trim()
  const request: KmsRekeyStartRequest = {}
  if (buckets.length > 0) request.buckets = buckets
  if (prefix) request.prefix = prefix
  return request
}
