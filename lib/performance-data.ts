export interface ServerInfo {
  endpoint?: string
  state?: string
  version?: string
  uptime?: number
  drives?: Array<{
    uuid?: string
    drive_path?: string
    path?: string
    usedspace?: number
    totalspace?: number
    availspace?: number
    state?: string
  }>
  network?: Record<string, string>
}

export interface SystemInfo {
  buckets?: { count?: number }
  objects?: { count?: number }
  servers?: ServerInfo[]
  backend?: {
    backendType?: string
    onlineDisks?: number
    offlineDisks?: number
  }
}

export interface DataUsageInfo {
  total_capacity?: number
  total_used_capacity?: number
}

export interface StorageInfo {
  backend?: {
    BackendType?: string
    StandardSCParity?: string | number
    RRSCParity?: string | number
  }
}

export interface MetricsInfo {
  aggregated?: {
    scanner?: {
      current_started?: string
      cycle_complete_times?: string[]
    }
  }
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

function unwrapInfoRecord(value: unknown): JsonRecord {
  const record = asRecord(value)
  const wrapped = record.info ?? record.Info
  return wrapped && typeof wrapped === "object" && !Array.isArray(wrapped) ? (wrapped as JsonRecord) : record
}

function normalizeCountInfo(value: unknown): { count?: number } | undefined {
  const record = asRecord(value)
  const count = asNumber(record.count ?? record.Count)
  return count === undefined ? undefined : { count }
}

export function normalizeSystemInfo(value: unknown): SystemInfo {
  const source = unwrapInfoRecord(value)
  const backend = asRecord(source.backend ?? source.Backend)

  return {
    buckets: normalizeCountInfo(source.buckets ?? source.Buckets),
    objects: normalizeCountInfo(source.objects ?? source.Objects),
    servers: asArray<ServerInfo>(source.servers ?? source.Servers),
    backend: {
      backendType: asString(backend.backendType ?? backend.BackendType),
      onlineDisks: asNumber(backend.onlineDisks ?? backend.OnlineDisks),
      offlineDisks: asNumber(backend.offlineDisks ?? backend.OfflineDisks),
    },
  }
}

export function normalizeStorageInfo(value: unknown): StorageInfo {
  const source = unwrapInfoRecord(value)
  const backend = asRecord(source.backend ?? source.Backend)

  return {
    backend: {
      BackendType: asString(backend.BackendType ?? backend.backendType),
      StandardSCParity: (backend.StandardSCParity ?? backend.standardSCParity) as string | number | undefined,
      RRSCParity: (backend.RRSCParity ?? backend.rrSCParity) as string | number | undefined,
    },
  }
}
