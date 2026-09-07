export type OnDemandMigrationProvider = "s3" | "aws" | "minio" | "rustfs" | "r2" | "gcs" | "azure" | "gcs_native"

export type OnDemandMigrationPathStyle = "auto" | "path" | "virtual"
export type OnDemandMigrationHeadPolicy = "proxy" | "local_only"
export type OnDemandMigrationRangeGetPolicy = "serve_and_backfill" | "serve_only"
export type OnDemandMigrationSourceErrorPolicy = "propagate" | "not_found"

export interface OnDemandMigrationCredentials {
  access_key: string
  secret_key: string
  session_token: string | null
}

export interface OnDemandMigrationAzure {
  account: string
  account_key: string | null
  sas_token: string | null
}

export interface OnDemandMigrationGcs {
  service_account_json: string
}

export interface OnDemandMigrationConfig {
  version: 1
  enabled: boolean
  source: {
    provider: OnDemandMigrationProvider
    endpoint: string | null
    region: string
    bucket: string
    path_style: OnDemandMigrationPathStyle
    credentials: OnDemandMigrationCredentials | null
    tls: {
      skip_verify: boolean
      ca_cert_pem: string | null
    }
    azure?: OnDemandMigrationAzure
    gcs?: OnDemandMigrationGcs
  }
  filter: {
    prefix: string | null
    source_prefix: string | null
  }
  policy: {
    head: OnDemandMigrationHeadPolicy
    range_get: OnDemandMigrationRangeGetPolicy
    source_error: OnDemandMigrationSourceErrorPolicy
    list_through: boolean
    respect_local_delete_marker: boolean
    preserve_etag: boolean
    copy_tags: boolean
    emit_events: boolean
    negative_cache_ttl_secs: number
    inline_max_bytes: number
    multipart_part_size_bytes: number
    max_concurrent_pulls: number
    pull_queue_capacity: number
    source_timeout: {
      connect_ms: number
      first_byte_ms: number
      idle_ms: number
    }
    bandwidth_limit_bytes_per_sec: number | null
  }
}

export interface OnDemandMigrationProbe {
  reachable: boolean
  listable: boolean
  sample_key: string | null
}

export interface OnDemandMigrationSetResponse {
  bucket: string
  dry_run: boolean
  config: OnDemandMigrationConfig
  updated_at: string | null
  probe: OnDemandMigrationProbe
}

export interface OnDemandMigrationGetResponse {
  bucket: string
  config: OnDemandMigrationConfig
  updated_at: string
}

export type OnDemandMigrationBreakerState = "closed" | "open" | "half_open"

export interface OnDemandMigrationCounters {
  requests_total: Record<string, Record<string, number>>
  pulled_bytes_total: number
  pulled_objects_total: Record<string, number>
  pull_failures_total: Record<string, number>
  source_latency: {
    buckets: Array<{ le_ms: number; count: number }>
    count: number
    sum_ms: number
  }
}

export type OnDemandMigrationBackfillState =
  | "pending"
  | "running"
  | "paused"
  | "cancelled"
  | "completed"
  | "completed_with_failures"
  | "failed"

export type OnDemandMigrationSkipExisting = "always" | "etag_or_size"

export interface OnDemandMigrationBackfillSummary {
  job_id: string
  state: OnDemandMigrationBackfillState
  listed: number
  enqueued: number
  pulled: number
  skipped_existing: number
  failed: number
  bytes: number
  updated_at: string
}

export interface OnDemandMigrationStatus {
  configured: boolean
  enabled: boolean
  module_enabled: boolean
  provider: string | null
  endpoint_host: string | null
  breaker: { state: OnDemandMigrationBreakerState; opened_at: string | null } | null
  counters: OnDemandMigrationCounters | null
  last_source_error: { class: string; at: string } | null
  inflight_pulls: number
  queue_depth: number
  served_by_source_ratio: number | null
  updated_at: string | null
  backfill?: OnDemandMigrationBackfillSummary
}

export interface OnDemandMigrationBackfillRequest {
  prefix?: string
  skip_existing?: OnDemandMigrationSkipExisting
  dry_run: boolean
}

export interface OnDemandMigrationBackfillJob {
  format_version: number
  job_id: string
  state: OnDemandMigrationBackfillState
  config_updated_at: string
  prefix: string | null
  skip_existing: OnDemandMigrationSkipExisting
  dry_run: boolean
  continuation_token: string | null
  listed: number
  enqueued: number
  pulled: number
  skipped_existing: number
  failed: number
  bytes: number
  last_key: string | null
  last_error: { class: string; key_hash: string | null; at: string } | null
  failed_keys: string[]
  started_at: string
  updated_at: string
  owner: { node: string; lease_until: string } | null
}

export interface OnDemandMigrationBackfillResponse {
  bucket: string
  job: OnDemandMigrationBackfillJob
}

export type OnDemandMigrationAzureAuth = "account_key" | "sas_token"

export interface OnDemandMigrationFormValues {
  enabled: boolean
  provider: OnDemandMigrationProvider
  endpoint: string
  region: string
  bucket: string
  pathStyle: OnDemandMigrationPathStyle
  accessKey: string
  secretKey: string
  sessionToken: string
  azureAccount: string
  azureAuth: OnDemandMigrationAzureAuth
  azureSecret: string
  serviceAccountJson: string
  localPrefix: string
  sourcePrefix: string
  skipTlsVerify: boolean
  caCertPem: string
  head: OnDemandMigrationHeadPolicy
  rangeGet: OnDemandMigrationRangeGetPolicy
  sourceError: OnDemandMigrationSourceErrorPolicy
  listThrough: boolean
  respectLocalDeleteMarker: boolean
  preserveEtag: boolean
  copyTags: boolean
  emitEvents: boolean
  negativeCacheTtlSecs: string
  inlineMaxBytes: string
  multipartPartSizeBytes: string
  maxConcurrentPulls: string
  pullQueueCapacity: string
  connectTimeoutMs: string
  firstByteTimeoutMs: string
  idleTimeoutMs: string
  bandwidthLimitBytesPerSec: string
}

export type OnDemandMigrationFormField = keyof OnDemandMigrationFormValues
