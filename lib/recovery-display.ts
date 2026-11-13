import type { MrfAction, MrfObservation, MrfResponsibility } from "@/types/recovery"

export const MRF_STATUS_LABELS: Record<string, string> = {
  active: "Pending or checking",
  held_unverified_legacy: "Awaiting verification",
  legacy_generation_unknown: "Source identity unknown",
  legacy_generation_unobserved: "Bucket identity unresolved",
  source_and_current_generation_unknown: "Bucket identity unresolved",
  bucket_incarnation_changed: "Bucket identity changed",
  operator_accepted_unverified: "Risk accepted · unverified",
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  paused: "Paused",
  running: "Last recorded: running",
  pause_requested: "Pause requested",
  cancel_requested: "Cancellation requested",
  cancelled: "Canceled",
  complete: "All items finished",
  failed: "Failed Status",
  pending: "Awaiting execution",
  prepared: "Prepared for checking",
  verified: "Digest matched",
  migrated: "Protected copy created",
  unsupported: "Unsupported",
  unavailable: "Unavailable",
  mismatch: "Digest mismatch",
  stale: "Source changed",
  conflict: "Conflict",
}

export function mrfActionAvailability(row: MrfResponsibility) {
  const held = ["held_unverified_legacy", "operator_accepted_unverified"].includes(row.status)
  return {
    refresh: row.status !== "active" && row.status in MRF_STATUS_LABELS,
    recheck:
      held && Boolean(row.sourceBucketIncarnationId) && row.sourceBucketIncarnationId === row.bucketIncarnationId,
    acceptRisk:
      Boolean(row.bucketIncarnationId) &&
      ["held_unverified_legacy", "legacy_generation_unknown", "bucket_incarnation_changed"].includes(row.status),
  }
}

export function riskConfirmationMatches(snapshot: MrfResponsibility, current: MrfResponsibility | null): boolean {
  return Boolean(
    current &&
    [
      "responsibilityId",
      "bucket",
      "object",
      "versionId",
      "sourceBucketIncarnationId",
      "bucketIncarnationId",
      "status",
    ].every((key) => snapshot[key as keyof MrfResponsibility] === current[key as keyof MrfResponsibility]),
  )
}

export function acceptedRequestMatches(row: MrfResponsibility, action: MrfAction): boolean {
  const request = action.request
  const accepted = row.accepted
  return Boolean(
    request.action === "acceptUnverifiedRisk" &&
    row.responsibilityId === request.responsibilityId &&
    row.bucketIncarnationId === request.expectedBucketIncarnationId &&
    row.status === "operator_accepted_unverified" &&
    accepted &&
    accepted.requestId === request.requestId &&
    accepted.reason === request.reason &&
    accepted.reference === request.reference &&
    accepted.acknowledgedUnknownSourceIncarnation === request.acknowledgeUnknownSourceIncarnation &&
    accepted.acknowledgedIncarnationMismatch === request.acknowledgeBucketIncarnationMismatch,
  )
}

export function mrfActionConfirmed(observation: MrfObservation, request: MrfAction): boolean {
  const node = observation.nodes.find((node) => node.nodeId === request.nodeId)
  const reply = node?.reply
  const expectedState = { refresh: "refreshed", recheck: "active", acceptUnverifiedRisk: "operatorAcceptedUnverified" }[
    request.request.action
  ]
  return Boolean(
    node?.state === "ok" &&
    reply?.result === "action" &&
    reply.action.responsibilityId === request.request.responsibilityId &&
    reply.action.state === expectedState &&
    reply.action.dataVerified === false &&
    reply.action.durableResponsibilityRetained === true,
  )
}

export function integrityEvidenceLabel(source: string | null | undefined): string {
  if (source === "administrator_supplied_sha256") return "Administrator-supplied SHA-256"
  if (source === "stored_sha256") return "Stored SHA-256"
  return "Evidence source unknown"
}
