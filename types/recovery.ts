/** MRF observations describe retained work, never an integrity certificate. */
export interface MrfSummary {
  contractVersion: 1
  sampledAtMs: number
  checkpointReadable: boolean
  checkpointOwner: string | null
  checkpointSequence: number | null
  activeResponsibilityCount: number
  heldCount: number
  legacyGenerationUnknownCount: number
  bucketIncarnationChangedCount: number
  operatorAcceptedCount: number
  bestEffortQueueDepth: number
  responsibilityBytes: number
}

export interface MrfResponsibility {
  responsibilityId: string
  bucket: string
  object: string
  sourceBucketIncarnationId: string | null
  bucketIncarnationId: string | null
  /** null identifies the MRF null slot; it does not select the current audit version. */
  versionId: string | null
  poolIndex: number | null
  setIndex: number | null
  enqueuedAtMs: number
  status: string
  heldSinceMs: number | null
  accepted: {
    acceptedAtMs: number
    actor: string
    reason: string
    reference: string
    requestId: string
    acknowledgedUnknownSourceIncarnation: boolean
    acknowledgedIncarnationMismatch: boolean
  } | null
  lastIdentityProbeResult?: string
  lastIdentityProbeAtMs?: number
  nextIdentityProbeAtMs?: number
}

export interface MrfPage {
  contractVersion: 2
  nodeLocal: true
  checkpointOwner: string | null
  checkpointSequence: number | null
  heldCount: number
  legacyGenerationUnknownCount: number
  bucketIncarnationChangedCount: number
  operatorAcceptedCount: number
  responsibilities: MrfResponsibility[]
  nextCursor?: string | null
}

export interface MrfActionResult {
  responsibilityId: string
  state: string
  dataVerified: false
  durableResponsibilityRetained: true
}

export type MrfReply =
  | { result: "summary"; summary: MrfSummary }
  | { result: "list"; snapshot: MrfPage; observedAtMs: number }
  | {
      result: "get"
      observation: { contractVersion: 1; observedAtMs: number; responsibility: MrfResponsibility | null }
    }
  | { result: "action"; action: MrfActionResult }
  | { result: "error"; code: string }

export interface MrfNodeObservation {
  nodeId: string
  host: string
  state: string
  reply?: MrfReply
}

export interface MrfObservation {
  contractVersion: 1
  topologyFingerprint: string
  observationStartedAtMs: number
  observationFinishedAtMs: number
  expectedNodes: number
  pageComplete: boolean
  nodes: MrfNodeObservation[]
  nextCursor: string | null
}

export interface MrfAction {
  nodeId: string
  request: {
    action: "refresh" | "recheck" | "acceptUnverifiedRisk"
    responsibilityId: string
    expectedBucketIncarnationId: string | null
    acknowledgeUnverifiedDataRisk?: boolean
    acknowledgeUnknownSourceIncarnation?: boolean
    acknowledgeBucketIncarnationMismatch?: boolean
    reason?: string
    reference?: string
    requestId?: string
  }
}

export interface MrfGroup {
  id: string
  bucket: string
  object: string
  versionId: string | null
  sourceBucketIncarnationId: string | null
  responsibilities: {
    nodeId: string
    host: string
    responsibility: MrfResponsibility
    observedAtMs: number
  }[]
}

export interface IntegrityJobRequest {
  mode: "audit" | "migrate"
  items: {
    key: string
    /** JSON null selects current; the string "null" selects the null slot. */
    version_id: string | null
    expected_sha256: string | null
    target_key: string | null
  }[]
  bytes_per_second: number
  max_object_bytes: number
}

export interface IntegrityItemResult {
  state: string
  source_fingerprint: string | null
  expected_sha256: string | null
  evidence_source: string | null
  source_size: number | null
  target_version_id: string | null
  detail: string | null
}

export interface IntegrityJob {
  format_version: 1
  id: string
  bucket: string
  bucket_incarnation: string
  request: IntegrityJobRequest
  state: string
  revision: number
  results: IntegrityItemResult[]
  last_error: string | null
}

/** Local configuration and operator assertions; not deployment qualification. */
export interface IntegrityReadiness {
  local_reader_supported: boolean
  write_requested: boolean
  fleet_operator_attested: boolean
  new_writes_enabled_here: boolean
  fleet_capability_verified: boolean
  unverified_requirements: string[]
}

/** This local document locates a job; only a fresh backend read supplies job state. */
export interface RecoveryReceipt {
  format_version: 1
  alias: string
  endpoint: string
  job: IntegrityJob
  inventory_observed_at: string
  inventory_bucket_incarnation: string
  digest_source_reference: string | null
  qualification: { deployment_id: string; reference: string; operator_attested: boolean } | null
  readiness: unknown
  estimate: {
    object_count: number
    inventory_selected_bytes: number | null
    per_stream_bytes_per_second: number
    stream_passes: number
    minimum_stream_seconds: number | null
    peak_payload_staging_budget: number
    note: string
  }
  query_command: string[]
  resume_command: string[]
}
