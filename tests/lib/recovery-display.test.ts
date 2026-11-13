import test from "node:test"
import assert from "node:assert/strict"
import {
  acceptedRequestMatches,
  integrityEvidenceLabel,
  JOB_STATUS_LABELS,
  mrfActionAvailability,
  mrfActionConfirmed,
  MRF_STATUS_LABELS,
  riskConfirmationMatches,
} from "../../lib/recovery-display"
import type { MrfAction, MrfObservation, MrfResponsibility } from "../../types/recovery"

const id = "11111111-1111-1111-1111-111111111111"
const incarnation = "22222222-2222-2222-2222-222222222222"
const requestId = "33333333-3333-3333-3333-333333333333"
const nodeId = "a".repeat(64)

function row(overrides: Partial<MrfResponsibility> = {}): MrfResponsibility {
  return {
    responsibilityId: id,
    bucket: "bucket",
    object: "key",
    sourceBucketIncarnationId: incarnation,
    bucketIncarnationId: incarnation,
    versionId: null,
    poolIndex: 0,
    setIndex: 0,
    enqueuedAtMs: 1,
    status: "held_unverified_legacy",
    heldSinceMs: 2,
    accepted: null,
    ...overrides,
  }
}

function riskRequest(): MrfAction {
  return {
    nodeId,
    request: {
      action: "acceptUnverifiedRisk",
      responsibilityId: id,
      expectedBucketIncarnationId: incarnation,
      requestId,
      reason: "Incident decision",
      reference: "INC-1",
      acknowledgeUnverifiedDataRisk: true,
      acknowledgeUnknownSourceIncarnation: false,
      acknowledgeBucketIncarnationMismatch: false,
    },
  }
}

test("rechecking requires a held record with the same known source and current identity", () => {
  assert.equal(mrfActionAvailability(row()).recheck, true)
  for (const record of [
    row({ sourceBucketIncarnationId: null }),
    row({ bucketIncarnationId: requestId }),
    row({ status: "active" }),
    row({ status: "legacy_generation_unknown" }),
  ]) {
    assert.equal(mrfActionAvailability(record).recheck, false)
  }
})

test("unresolved identity prevents risk acceptance while allowing an identity refresh", () => {
  for (const status of ["legacy_generation_unobserved", "source_and_current_generation_unknown"]) {
    assert.deepEqual(mrfActionAvailability(row({ status, bucketIncarnationId: null })), {
      refresh: true,
      recheck: false,
      acceptRisk: false,
    })
  }
})

test("risk confirmation binds the responsibility, bucket incarnations, object, and exact version slot", () => {
  const snapshot = row()
  assert.equal(riskConfirmationMatches(snapshot, row()), true)
  for (const change of [
    { responsibilityId: requestId },
    { bucket: "recreated" },
    { object: "different-key" },
    { sourceBucketIncarnationId: null },
    { bucketIncarnationId: requestId },
    { versionId: "null" },
    { status: "bucket_incarnation_changed" },
  ]) {
    assert.equal(riskConfirmationMatches(snapshot, row(change)), false)
  }
  assert.equal(riskConfirmationMatches(snapshot, null), false)
})

test("risk acceptance and job completion labels do not claim verification or an all-pass result", () => {
  assert.equal(MRF_STATUS_LABELS.operator_accepted_unverified, "Risk accepted · unverified")
  assert.equal(JOB_STATUS_LABELS.complete, "All items finished")
  assert.equal(JOB_STATUS_LABELS.running, "Last recorded: running")
  assert.equal(mrfActionAvailability(row({ status: "operator_accepted_unverified" })).acceptRisk, false)
})

test("an uncertain acceptance is reconciled only by the exact request and recorded audit fields", () => {
  const request = riskRequest()
  const record = row({
    status: "operator_accepted_unverified",
    accepted: {
      acceptedAtMs: 10,
      actor: "operator",
      reason: request.request.reason!,
      reference: request.request.reference!,
      requestId,
      acknowledgedUnknownSourceIncarnation: false,
      acknowledgedIncarnationMismatch: false,
    },
  })
  assert.equal(acceptedRequestMatches(record, request), true)
  for (const change of [
    { responsibilityId: requestId },
    { expectedBucketIncarnationId: requestId },
    { requestId: incarnation },
    { reason: "Different reason" },
    { reference: "INC-2" },
    { acknowledgeUnknownSourceIncarnation: true },
    { acknowledgeBucketIncarnationMismatch: true },
  ]) {
    assert.equal(acceptedRequestMatches(record, { ...request, request: { ...request.request, ...change } }), false)
  }
  assert.equal(acceptedRequestMatches({ ...record, status: "active" }, request), false)
})

test("an action receipt must confirm its own operation while retaining unverified responsibility", () => {
  const request: MrfAction = {
    nodeId,
    request: { action: "recheck", responsibilityId: id, expectedBucketIncarnationId: incarnation },
  }
  const value: MrfObservation = {
    contractVersion: 1,
    topologyFingerprint: "topology",
    observationStartedAtMs: 1,
    observationFinishedAtMs: 2,
    expectedNodes: 1,
    pageComplete: true,
    nextCursor: null,
    nodes: [
      {
        nodeId,
        host: "node",
        state: "ok",
        reply: {
          result: "action",
          action: { responsibilityId: id, state: "active", dataVerified: false, durableResponsibilityRetained: true },
        },
      },
    ],
  }
  assert.equal(mrfActionConfirmed(value, request), true)
  assert.equal(mrfActionConfirmed(value, { ...request, request: { ...request.request, action: "refresh" } }), false)
  assert.equal(mrfActionConfirmed({ ...value, nodes: [{ ...value.nodes[0], state: "timed_out" }] }, request), false)
})

test("missing or unrecognized digest provenance remains unknown", () => {
  assert.equal(integrityEvidenceLabel("administrator_supplied_sha256"), "Administrator-supplied SHA-256")
  assert.equal(integrityEvidenceLabel("stored_sha256"), "Stored SHA-256")
  for (const source of [undefined, null, "downloaded_now", "unknown_future_source"]) {
    assert.equal(integrityEvidenceLabel(source), "Evidence source unknown")
  }
})
