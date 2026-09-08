import type {
  OnDemandMigrationConfig,
  OnDemandMigrationFormField,
  OnDemandMigrationFormValues,
  OnDemandMigrationProvider,
} from "@/types/on-demand-migration"

export const ODM_REDACTED_SECRET = "REDACTED"
export const ODM_MIB = 1024 * 1024

export const ON_DEMAND_MIGRATION_PROVIDERS: OnDemandMigrationProvider[] = [
  "aws",
  "s3",
  "minio",
  "rustfs",
  "r2",
  "gcs",
  "azure",
  "gcs_native",
]

export const ODM_NATIVE_PROVIDERS = new Set<OnDemandMigrationProvider>(["azure", "gcs_native"])
export const ODM_AUTO_REGION_PROVIDERS = new Set<OnDemandMigrationProvider>([
  "minio",
  "rustfs",
  "r2",
  "azure",
  "gcs_native",
])
export const ODM_OPTIONAL_ENDPOINT_PROVIDERS = new Set<OnDemandMigrationProvider>(["aws", "azure", "gcs_native"])

export const ODM_DEFAULT_POLICY: OnDemandMigrationConfig["policy"] = {
  head: "proxy",
  range_get: "serve_and_backfill",
  source_error: "propagate",
  list_through: false,
  respect_local_delete_marker: true,
  preserve_etag: true,
  copy_tags: false,
  emit_events: true,
  negative_cache_ttl_secs: 30,
  inline_max_bytes: 16 * ODM_MIB,
  multipart_part_size_bytes: 64 * ODM_MIB,
  max_concurrent_pulls: 8,
  pull_queue_capacity: 1024,
  source_timeout: {
    connect_ms: 5000,
    first_byte_ms: 15000,
    idle_ms: 30000,
  },
  bandwidth_limit_bytes_per_sec: null,
}

export function createOnDemandMigrationFormValues(config?: OnDemandMigrationConfig): OnDemandMigrationFormValues {
  const provider = config?.source.provider ?? "aws"
  const nativeProvider = ODM_NATIVE_PROVIDERS.has(provider)
  const azureUsesSas = config?.source.azure?.sas_token !== null && config?.source.azure?.sas_token !== undefined
  const policy = config?.policy ?? ODM_DEFAULT_POLICY

  return {
    enabled: config?.enabled ?? true,
    provider,
    endpoint: config?.source.endpoint ?? "",
    region: nativeProvider
      ? "auto"
      : (config?.source.region ?? (ODM_AUTO_REGION_PROVIDERS.has(provider) ? "auto" : "us-east-1")),
    bucket: config?.source.bucket ?? "",
    pathStyle: nativeProvider ? "auto" : (config?.source.path_style ?? "auto"),
    accessKey: config?.source.credentials?.access_key ?? "",
    secretKey: "",
    sessionToken: "",
    azureAccount: config?.source.azure?.account ?? "",
    azureAuth: azureUsesSas ? "sas_token" : "account_key",
    azureSecret: "",
    serviceAccountJson: "",
    localPrefix: config?.filter.prefix ?? "",
    sourcePrefix: config?.filter.source_prefix ?? "",
    skipTlsVerify: config?.source.tls.skip_verify ?? false,
    caCertPem: config?.source.tls.ca_cert_pem ?? "",
    head: policy.head,
    rangeGet: policy.range_get,
    sourceError: policy.source_error,
    listThrough: policy.list_through,
    respectLocalDeleteMarker: policy.respect_local_delete_marker,
    preserveEtag: policy.preserve_etag,
    copyTags: policy.copy_tags,
    emitEvents: policy.emit_events,
    negativeCacheTtlSecs: String(policy.negative_cache_ttl_secs),
    inlineMaxBytes: String(policy.inline_max_bytes),
    multipartPartSizeBytes: String(policy.multipart_part_size_bytes),
    maxConcurrentPulls: String(policy.max_concurrent_pulls),
    pullQueueCapacity: String(policy.pull_queue_capacity),
    connectTimeoutMs: String(policy.source_timeout.connect_ms),
    firstByteTimeoutMs: String(policy.source_timeout.first_byte_ms),
    idleTimeoutMs: String(policy.source_timeout.idle_ms),
    bandwidthLimitBytesPerSec:
      policy.bandwidth_limit_bytes_per_sec === null ? "" : String(policy.bandwidth_limit_bytes_per_sec),
  }
}

const emptyOrValue = (value: string) => (value === "" ? null : value)

function integer(value: string): number {
  return Number(value)
}

export function buildOnDemandMigrationConfig(values: OnDemandMigrationFormValues): OnDemandMigrationConfig {
  const nativeProvider = ODM_NATIVE_PROVIDERS.has(values.provider)
  const source: OnDemandMigrationConfig["source"] = {
    provider: values.provider,
    endpoint: emptyOrValue(values.endpoint),
    region: nativeProvider ? "auto" : values.region,
    bucket: values.bucket,
    path_style: nativeProvider ? "auto" : values.pathStyle,
    credentials: nativeProvider
      ? null
      : {
          access_key: values.accessKey,
          secret_key: values.secretKey,
          session_token: emptyOrValue(values.sessionToken),
        },
    tls: {
      skip_verify: values.skipTlsVerify,
      ca_cert_pem: emptyOrValue(values.caCertPem),
    },
  }

  if (values.provider === "azure") {
    source.azure = {
      account: values.azureAccount,
      account_key: values.azureAuth === "account_key" ? values.azureSecret : null,
      sas_token: values.azureAuth === "sas_token" ? values.azureSecret : null,
    }
  }
  if (values.provider === "gcs_native") {
    source.gcs = { service_account_json: values.serviceAccountJson }
  }

  return {
    version: 1,
    enabled: values.enabled,
    source,
    filter: {
      prefix: emptyOrValue(values.localPrefix),
      source_prefix: emptyOrValue(values.sourcePrefix),
    },
    policy: {
      head: values.head,
      range_get: values.rangeGet,
      source_error: values.sourceError,
      list_through: values.listThrough,
      respect_local_delete_marker: values.respectLocalDeleteMarker,
      preserve_etag: values.preserveEtag,
      copy_tags: values.copyTags,
      emit_events: values.emitEvents,
      negative_cache_ttl_secs: integer(values.negativeCacheTtlSecs),
      inline_max_bytes: integer(values.inlineMaxBytes),
      multipart_part_size_bytes: integer(values.multipartPartSizeBytes),
      max_concurrent_pulls: integer(values.maxConcurrentPulls),
      pull_queue_capacity: integer(values.pullQueueCapacity),
      source_timeout: {
        connect_ms: integer(values.connectTimeoutMs),
        first_byte_ms: integer(values.firstByteTimeoutMs),
        idle_ms: integer(values.idleTimeoutMs),
      },
      bandwidth_limit_bytes_per_sec:
        values.bandwidthLimitBytesPerSec !== "" ? integer(values.bandwidthLimitBytesPerSec) : null,
    },
  }
}

export interface OnDemandMigrationValidationIssue {
  field: OnDemandMigrationFormField
  message: string
}

const numericRule = (
  values: OnDemandMigrationFormValues,
  field: OnDemandMigrationFormField,
  min: number,
  max: number,
  label: string,
): OnDemandMigrationValidationIssue | null => {
  const rawValue = String(values[field])
  const value = Number(rawValue)
  if (rawValue === "" || !Number.isSafeInteger(value) || value < min || value > max) {
    return { field, message: `${label} must be a whole number from ${min} to ${max}.` }
  }
  return null
}

function validateEndpoint(endpoint: string): string | null {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return "Enter an absolute HTTP or HTTPS endpoint."
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Enter an absolute HTTP or HTTPS endpoint."
  if (url.username || url.password) return "The endpoint must not contain credentials."
  if (url.pathname !== "/" || url.search || url.hash) return "The endpoint must not contain a path, query, or fragment."
  return null
}

export function validateOnDemandMigrationForm(values: OnDemandMigrationFormValues): OnDemandMigrationValidationIssue[] {
  const issues: OnDemandMigrationValidationIssue[] = []
  const endpoint = values.endpoint

  if (!endpoint && !ODM_OPTIONAL_ENDPOINT_PROVIDERS.has(values.provider)) {
    issues.push({ field: "endpoint", message: "Endpoint is required for this provider." })
  } else if (endpoint) {
    const endpointError = validateEndpoint(endpoint)
    if (endpointError) issues.push({ field: "endpoint", message: endpointError })
  }

  if (!ODM_NATIVE_PROVIDERS.has(values.provider)) {
    const region = values.region
    if (!region) issues.push({ field: "region", message: "Region is required." })
    else if (region === "auto" && !ODM_AUTO_REGION_PROVIDERS.has(values.provider)) {
      issues.push({ field: "region", message: "This provider requires a real region; auto is not supported." })
    } else if (values.provider === "aws" && !endpoint && !/^[A-Za-z0-9-]+$/.test(region)) {
      issues.push({ field: "region", message: "AWS regions may contain only letters, numbers, and hyphens." })
    }
  }

  const bucket = values.bucket
  if (!bucket) issues.push({ field: "bucket", message: "Source bucket is required." })
  else if (bucket.includes("/") || /\s/.test(bucket)) {
    issues.push({ field: "bucket", message: "Source bucket must not contain slashes or whitespace." })
  }

  if (values.provider === "azure") {
    if (!values.azureAccount) {
      issues.push({ field: "azureAccount", message: "Azure storage account is required." })
    } else if (!/^[A-Za-z0-9-]+$/.test(values.azureAccount)) {
      issues.push({ field: "azureAccount", message: "Azure account may contain only letters, numbers, and hyphens." })
    }
    if (!values.azureSecret) {
      issues.push({ field: "azureSecret", message: "Re-enter the Azure credential to test or save changes." })
    } else if (values.azureAuth === "account_key") {
      try {
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(values.azureSecret) || atob(values.azureSecret).length === 0) {
          throw new Error("invalid")
        }
      } catch {
        issues.push({ field: "azureSecret", message: "Azure account key must be valid Base64." })
      }
    } else if (values.azureSecret.startsWith("?") || /\s/.test(values.azureSecret)) {
      issues.push({ field: "azureSecret", message: "SAS token must omit the leading question mark and whitespace." })
    }
  } else if (values.provider === "gcs_native") {
    if (!values.serviceAccountJson) {
      issues.push({
        field: "serviceAccountJson",
        message: "Re-enter the service account JSON to test or save changes.",
      })
    } else {
      try {
        const key = JSON.parse(values.serviceAccountJson) as Record<string, unknown>
        if (
          key.type !== "service_account" ||
          typeof key.client_email !== "string" ||
          key.client_email.length === 0 ||
          typeof key.private_key !== "string" ||
          key.private_key.length === 0
        ) {
          throw new Error("invalid")
        }
      } catch {
        issues.push({
          field: "serviceAccountJson",
          message: "Use a valid service-account JSON key with client_email and private_key.",
        })
      }
    }
  } else {
    if (!values.accessKey) issues.push({ field: "accessKey", message: "Access key is required." })
    if (!values.secretKey) {
      issues.push({ field: "secretKey", message: "Re-enter the secret key to test or save changes." })
    }
  }

  if (values.caCertPem && !values.caCertPem.includes("-----BEGIN CERTIFICATE-----")) {
    issues.push({ field: "caCertPem", message: "CA certificate must be PEM encoded." })
  }

  const rules: Array<[OnDemandMigrationFormField, number, number, string]> = [
    ["negativeCacheTtlSecs", 0, 3600, "Negative cache TTL"],
    ["inlineMaxBytes", 0, 268435456, "Inline object limit"],
    ["multipartPartSizeBytes", 5242880, 5368709120, "Multipart part size"],
    ["maxConcurrentPulls", 1, 256, "Concurrent pulls"],
    ["pullQueueCapacity", 1, 65536, "Pull queue capacity"],
    ["connectTimeoutMs", 100, 600000, "Connect timeout"],
    ["firstByteTimeoutMs", 100, 600000, "First-byte timeout"],
    ["idleTimeoutMs", 100, 600000, "Idle timeout"],
  ]
  for (const [field, min, max, label] of rules) {
    const issue = numericRule(values, field, min, max, label)
    if (issue) issues.push(issue)
  }

  if (values.bandwidthLimitBytesPerSec !== "") {
    const value = Number(values.bandwidthLimitBytesPerSec)
    if (!Number.isSafeInteger(value) || value < 65536) {
      issues.push({
        field: "bandwidthLimitBytesPerSec",
        message: "Bandwidth limit must be a whole number of at least 65536 bytes/s.",
      })
    }
  }

  return issues
}

const SERVER_FIELD_PATTERNS: Array<[RegExp, OnDemandMigrationFormField]> = [
  [/source endpoint/i, "endpoint"],
  [/source region/i, "region"],
  [/source bucket/i, "bucket"],
  [/credentials field access_key/i, "accessKey"],
  [/credentials field secret_key/i, "secretKey"],
  [/credentials field session_token/i, "sessionToken"],
  [/source\.azure.*account_key|account_key/i, "azureSecret"],
  [/source\.azure.*sas_token|sas_token/i, "azureSecret"],
  [/source\.azure.*account|account contains|account must/i, "azureAccount"],
  [/source\.gcs|service_account_json/i, "serviceAccountJson"],
  [/ca_cert_pem/i, "caCertPem"],
  [/filter\.prefix/i, "localPrefix"],
  [/filter\.source_prefix/i, "sourcePrefix"],
  [/negative_cache_ttl_secs/i, "negativeCacheTtlSecs"],
  [/inline_max_bytes/i, "inlineMaxBytes"],
  [/multipart_part_size_bytes/i, "multipartPartSizeBytes"],
  [/max_concurrent_pulls/i, "maxConcurrentPulls"],
  [/pull_queue_capacity/i, "pullQueueCapacity"],
  [/source_timeout\.connect_ms/i, "connectTimeoutMs"],
  [/source_timeout\.first_byte_ms/i, "firstByteTimeoutMs"],
  [/source_timeout\.idle_ms/i, "idleTimeoutMs"],
  [/bandwidth_limit_bytes_per_sec/i, "bandwidthLimitBytesPerSec"],
]

export function getOnDemandMigrationServerField(message: string): OnDemandMigrationFormField | null {
  return SERVER_FIELD_PATTERNS.find(([pattern]) => pattern.test(message))?.[1] ?? null
}

export function isOnDemandMigrationBackfillActive(state?: string | null): boolean {
  return state === "pending" || state === "running"
}

export function sumCounterValues(values?: Record<string, number> | null): number {
  return Object.values(values ?? {}).reduce((total, value) => total + value, 0)
}

export type OnDemandMigrationErrorKind =
  | "configuration_missing"
  | "backfill_missing"
  | "module_disabled"
  | "source_unreachable"
  | "backend_not_compiled"
  | "backfill_running"
  | "invalid_argument"
  | "license_denied"
  | "access_denied"
  | "unknown"

interface ErrorLike {
  status?: unknown
  code?: unknown
  message?: unknown
}

export function getOnDemandMigrationErrorKind(error: unknown): OnDemandMigrationErrorKind {
  if (!error || typeof error !== "object") return "unknown"
  const candidate = error as ErrorLike
  const status = typeof candidate.status === "number" ? candidate.status : undefined
  const code = typeof candidate.code === "string" ? candidate.code : ""
  const message = typeof candidate.message === "string" ? candidate.message : ""

  if (code === "NoSuchConfiguration") return "configuration_missing"
  if (code === "NoSuchBackfillJob") return "backfill_missing"
  if (code === "OnDemandMigrationDisabled") return "module_disabled"
  if (code === "OnDemandMigrationSourceUnreachable") return "source_unreachable"
  if (code === "OnDemandMigrationBackendNotCompiled") return "backend_not_compiled"
  if (code === "OnDemandMigrationBackfillRunning" || status === 409) return "backfill_running"
  if (code === "InvalidArgument" || status === 400) return "invalid_argument"
  if (status === 403 && /licen[cs]e|entitlement/i.test(message)) return "license_denied"
  if (code === "AccessDenied" || status === 403) return "access_denied"
  return "unknown"
}

export function isOnDemandMigrationRouteMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as ErrorLike
  return (
    candidate.status === 404 &&
    candidate.code !== "NoSuchConfiguration" &&
    candidate.code !== "NoSuchBackfillJob" &&
    candidate.code !== "NoSuchBucket"
  )
}
