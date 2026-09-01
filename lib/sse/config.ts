import type { KmsServiceStatusResponse } from "@/types/kms"

export type ConfigFormBackendType = "local" | "vault-kv2" | "vault-transit" | "static" | "unsupported"

export type ConfigFormState = {
  backendType: ConfigFormBackendType
  keyDir: string
  filePermissions: string
  defaultKeyId: string
  timeoutSeconds: string
  retryAttempts: string
  enableCache: boolean
  maxCachedKeys: string
  cacheTtlSeconds: string
  address: string
  vaultToken: string
  namespace: string
  mountPath: string
  kvMount: string
  keyPathPrefix: string
  skipTlsVerify: boolean
  caCertPath: string
  clientCertPath: string
  clientKeyPath: string
  secretKey: string
  staticKeyId: string
}

export const INITIAL_FORM_STATE: ConfigFormState = {
  backendType: "vault-transit",
  keyDir: "",
  filePermissions: "384",
  defaultKeyId: "",
  timeoutSeconds: "30",
  retryAttempts: "3",
  enableCache: true,
  maxCachedKeys: "1000",
  cacheTtlSeconds: "3600",
  address: "",
  vaultToken: "",
  namespace: "",
  mountPath: "transit",
  kvMount: "secret",
  keyPathPrefix: "rustfs/kms/keys",
  skipTlsVerify: false,
  caCertPath: "",
  clientCertPath: "",
  clientKeyPath: "",
  secretKey: "",
  staticKeyId: "",
}

export function normalizeBackendType(value?: string | null): ConfigFormBackendType | null {
  switch (value) {
    case null:
    case undefined:
      return null
    case "Local":
      return "local"
    case "Vault":
    case "VaultKV2":
      return "vault-kv2"
    case "VaultTransit":
      return "vault-transit"
    case "Static":
      return "static"
    default:
      return "unsupported"
  }
}

export function buildFormStateFromStatus(status: KmsServiceStatusResponse | null): ConfigFormState {
  if (!status) return INITIAL_FORM_STATE

  const summary = status.config_summary
  const backendSummary = summary?.backend_summary
  const cacheSummary = summary?.cache_summary
  const backendType =
    normalizeBackendType(status.backend_type ?? summary?.backend_type) ?? INITIAL_FORM_STATE.backendType

  return {
    backendType,
    keyDir: backendSummary?.key_dir ?? "",
    filePermissions: String(backendSummary?.file_permissions ?? 384),
    defaultKeyId: summary?.default_key_id ?? "",
    timeoutSeconds: String(summary?.timeout_seconds ?? 30),
    retryAttempts: String(summary?.retry_attempts ?? 3),
    enableCache: summary?.enable_cache ?? cacheSummary?.enabled ?? true,
    maxCachedKeys: String(summary?.max_cached_keys ?? cacheSummary?.max_keys ?? 1000),
    cacheTtlSeconds: String(summary?.cache_ttl_seconds ?? cacheSummary?.ttl_seconds ?? 3600),
    address: backendSummary?.address ?? "",
    vaultToken: "",
    namespace: backendSummary?.namespace ?? "",
    mountPath: backendSummary?.mount_path ?? "transit",
    kvMount: backendSummary?.kv_mount ?? "secret",
    keyPathPrefix: backendSummary?.key_path_prefix ?? "rustfs/kms/keys",
    secretKey: "",
    staticKeyId: backendSummary?.key_id ?? "",
    skipTlsVerify: backendSummary?.skip_tls_verify ?? false,
    // The status API only reports has_custom_ca / has_client_identity booleans
    // and never echoes paths back, so these cannot be refilled from status.
    caCertPath: "",
    clientCertPath: "",
    clientKeyPath: "",
  }
}

export function getFormSyncDecision(
  currentFormState: ConfigFormState,
  baselineFormState: ConfigFormState,
  nextBaselineFormState: ConfigFormState,
): "sync" | "conflict" | "keep-dirty" {
  const currentJson = JSON.stringify(currentFormState)
  const baselineJson = JSON.stringify(baselineFormState)
  if (currentJson === baselineJson) return "sync"
  if (baselineJson !== JSON.stringify(nextBaselineFormState)) return "conflict"
  return "keep-dirty"
}

export function isSafeLocalFilePermissions(mode: number) {
  return Number.isInteger(mode) && mode >= 0 && mode <= 0o777 && (mode & 0o077) === 0
}
