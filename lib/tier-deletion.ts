export interface TierDeletionCheck {
  proofComplete: boolean
  scanStatus: string
  reasons: string[]
}

export interface TierCleanupRetry {
  status: string
  scanTruncated: boolean
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function parseTierDeletionCheck(value: unknown, tierName: string): TierDeletionCheck | null {
  const data = record(value)
  if (data?.tierName !== tierName || !Array.isArray(data.reasons)) return null
  return {
    proofComplete: data.proofComplete === true,
    scanStatus: typeof data.scanStatus === "string" ? data.scanStatus : "unknown",
    reasons: data.reasons.map((reason) => {
      const kind = record(reason)?.kind
      return typeof kind === "string" ? kind : "UNKNOWN"
    }),
  }
}

export function parseTierCleanupRetry(value: unknown, tierName: string): TierCleanupRetry {
  const data = record(value)
  return {
    status: data?.tierName === tierName && typeof data.status === "string" ? data.status : "unknown",
    scanTruncated: data?.scanTruncated === true,
  }
}

export function canRetryTierDeletion(check: TierDeletionCheck | null): boolean {
  return check?.proofComplete === true && check.scanStatus === "complete" && check.reasons.length === 0
}

export function isTierDeletionBlocked(error: unknown): boolean {
  const data = record(error)
  if (data?.status === 401 || data?.status === 403) return false
  return (
    typeof data?.code === "string" &&
    [
      "XMinioAdminTierBackendInUse",
      "XRustFSAdminTierBackendInUse",
      "TierNameBackendInUse",
      "TierDeletionBlocked",
      "TierBackendInUse",
    ].includes(data.code)
  )
}

export function isTierDeletionUnsupported(error: unknown): boolean {
  const data = record(error)
  return data?.status === 404 || data?.status === 405 || data?.status === 501 || data?.code === "NotImplemented"
}

export const tierDeletionReasonKeys: Record<string, string> = {
  LIFECYCLE_REFERENCE: "Lifecycle rules still reference this tier. Update those rules before deleting it.",
  LIVE_TRANSITIONED_VERSION:
    "Live transitioned object versions still use this tier. Keep it configured while they exist.",
  CLEANUP_PENDING: "Object cleanup is pending for this tier. Background recovery continues automatically.",
  TRANSITION_PENDING: "A transition is still pending for this tier. Wait for recovery, then recheck.",
  PROOF_INCOMPLETE: "The server could not complete the deletion safety check. Recheck before retrying deletion.",
}
