export type KmsServiceStatus = "NotConfigured" | "Configured" | "Running" | { Error: string }

export type KmsBackendType = "Local" | "Vault"

export interface KmsCacheSummary {
  enabled?: boolean
  max_cached_keys?: number | null
  cache_ttl_seconds?: number | null
  ttl_seconds?: number | null
}

export interface KmsBackendSummary {
  key_dir?: string | null
  file_permissions?: number | null
  address?: string | null
  namespace?: string | null
  mount_path?: string | null
  kv_mount?: string | null
  key_path_prefix?: string | null
  skip_tls_verify?: boolean | null
  timeout_seconds?: number | null
  retry_attempts?: number | null
}

export interface KmsConfigSummary {
  default_key_id?: string | null
  enable_cache?: boolean | null
  max_cached_keys?: number | null
  cache_ttl_seconds?: number | null
  cache_summary?: KmsCacheSummary | null
  backend_summary?: KmsBackendSummary | null
}

export interface KmsServiceStatusResponse {
  status: KmsServiceStatus
  backend_type: KmsBackendType | null
  healthy: boolean | null
  config_summary: KmsConfigSummary | null
}

export interface KmsMutationResponse {
  success?: boolean
  message?: string
  status?: string
}

export interface KmsStartRequest {
  force?: boolean
}

export interface KmsLocalConfigPayload {
  backend_type: "local"
  key_dir: string
  file_permissions?: number
  default_key_id?: string
  timeout_seconds?: number
  retry_attempts?: number
  enable_cache?: boolean
  max_cached_keys?: number
  cache_ttl_seconds?: number
}

export interface KmsVaultTokenAuthMethod {
  Token: {
    token: string
  }
}

export interface KmsVaultConfigPayload {
  backend_type: "vault"
  address: string
  auth_method: KmsVaultTokenAuthMethod
  namespace?: string | null
  mount_path: string
  kv_mount?: string | null
  key_path_prefix?: string | null
  skip_tls_verify?: boolean
  default_key_id?: string
  timeout_seconds?: number
  retry_attempts?: number
  enable_cache?: boolean
  max_cached_keys?: number
  cache_ttl_seconds?: number
}

export type KmsConfigPayload = KmsLocalConfigPayload | KmsVaultConfigPayload

export interface KmsKeyInfo {
  key_id: string
  description?: string | null
  algorithm?: string | null
  usage?: string | null
  status?: string | null
  version?: number | null
  metadata?: Record<string, string> | null
  tags?: Record<string, string> | null
  created_at?: string | null
  rotated_at?: string | null
  created_by?: string | null
}

export interface KmsKeyListResponse extends KmsMutationResponse {
  keys?: KmsKeyInfo[]
  truncated?: boolean
  next_marker?: string | null
}

export interface KmsCreateKeyRequest {
  key_usage?: string
  description?: string
  tags?: Record<string, string>
}

export interface KmsCreateKeyResponse extends KmsMutationResponse {
  key_id?: string
  key_metadata?: KmsKeyMetadata | null
}

export interface KmsKeyMetadata {
  key_id: string
  key_state?: "Enabled" | "Disabled" | "PendingDeletion" | "PendingImport" | "Unavailable" | string
  key_usage?: string | null
  description?: string | null
  creation_date?: string | null
  deletion_date?: string | null
  origin?: string | null
  key_manager?: string | null
  tags?: Record<string, string> | null
  metadata?: Record<string, string> | null
  algorithm?: string | null
  version?: number | null
}

export interface KmsKeyDetailResponse extends KmsMutationResponse {
  key_metadata?: KmsKeyMetadata | null
}

export interface KmsDeleteKeyOptions {
  pending_window_in_days?: number
  force_immediate?: boolean
}

export interface KmsCancelDeletionRequest {
  key_id: string
}
