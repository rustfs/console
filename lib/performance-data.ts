export type ServerHealthState = "online" | "offline" | "degraded" | "initializing" | "unknown"

export interface ServerInfo {
  endpoint?: string
  state?: ServerHealthState
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
    unknownDisks?: number
  }
}

export interface DataUsageInfo {
  total_capacity?: number
  total_free_capacity?: number
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
      current_cycle?: number
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

function asNonNegativeNumber(value: unknown): number | undefined {
  const number = asNumber(value)
  return number !== undefined && number >= 0 ? number : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

function asStringOrNumber(value: unknown): string | number | undefined {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : undefined
}

function asTimestamp(value: unknown): string | undefined {
  const timestamp = asString(value)
  return timestamp && !Number.isNaN(Date.parse(timestamp)) ? timestamp : undefined
}

export function normalizeServerHealthState(value: unknown): ServerHealthState {
  const state = asString(value)?.toLowerCase()
  if (state === "online" || state === "offline" || state === "degraded" || state === "initializing") {
    return state
  }
  return "unknown"
}

function normalizeDrive(value: unknown): NonNullable<ServerInfo["drives"]>[number] | undefined {
  const source = asRecord(value)
  if (!Object.keys(source).length) return undefined

  return {
    uuid: asString(source.uuid ?? source.UUID),
    drive_path: asString(source.drive_path ?? source.drivePath ?? source.DrivePath),
    path: asString(source.path ?? source.Path),
    usedspace: asNonNegativeNumber(source.usedspace ?? source.usedSpace ?? source.UsedSpace),
    totalspace: asNonNegativeNumber(source.totalspace ?? source.totalSpace ?? source.TotalSpace),
    availspace: asNonNegativeNumber(source.availspace ?? source.availableSpace ?? source.AvailableSpace),
    state: asString(source.state ?? source.State)?.toLowerCase(),
  }
}

function normalizeServer(value: unknown): ServerInfo | undefined {
  const source = asRecord(value)
  if (!Object.keys(source).length) return undefined

  const network = Object.fromEntries(
    Object.entries(asRecord(source.network ?? source.Network)).flatMap(([key, state]) => {
      const normalizedState = asString(state)?.toLowerCase()
      return normalizedState ? [[key, normalizedState]] : []
    }),
  )

  return {
    endpoint: asString(source.endpoint ?? source.Endpoint),
    state: normalizeServerHealthState(source.state ?? source.State),
    version: asString(source.version ?? source.Version),
    uptime: asNonNegativeNumber(source.uptime ?? source.Uptime),
    drives: asArray<unknown>(source.drives ?? source.Drives).flatMap((drive) => {
      const normalized = normalizeDrive(drive)
      return normalized ? [normalized] : []
    }),
    network,
  }
}

function unwrapInfoRecord(value: unknown): JsonRecord {
  const record = asRecord(value)
  const wrapped = record.info ?? record.Info
  return wrapped && typeof wrapped === "object" && !Array.isArray(wrapped) ? (wrapped as JsonRecord) : record
}

function normalizeCountInfo(value: unknown): { count?: number } | undefined {
  const record = asRecord(value)
  if (record.error ?? record.Error) return undefined
  const count = asNonNegativeNumber(record.count ?? record.Count)
  return count === undefined ? undefined : { count }
}

export function normalizeSystemInfo(value: unknown): SystemInfo {
  const source = unwrapInfoRecord(value)
  const backend = asRecord(source.backend ?? source.Backend)
  const buckets = normalizeCountInfo(source.buckets ?? source.Buckets)
  const objects = normalizeCountInfo(source.objects ?? source.Objects)
  const rawServers = source.servers ?? source.Servers
  const servers = Array.isArray(rawServers)
    ? rawServers.flatMap((server) => {
        const normalized = normalizeServer(server)
        return normalized ? [normalized] : []
      })
    : undefined

  return {
    ...(buckets ? { buckets } : {}),
    ...(objects ? { objects } : {}),
    ...(servers ? { servers } : {}),
    ...(Object.keys(backend).length
      ? {
          backend: {
            backendType: asString(backend.backendType ?? backend.BackendType),
            onlineDisks: asNonNegativeNumber(backend.onlineDisks ?? backend.OnlineDisks),
            offlineDisks: asNonNegativeNumber(backend.offlineDisks ?? backend.OfflineDisks),
            unknownDisks: asNonNegativeNumber(backend.unknownDisks ?? backend.UnknownDisks),
          },
        }
      : {}),
  }
}

export function normalizeStorageInfo(value: unknown): StorageInfo {
  const source = unwrapInfoRecord(value)
  const backend = asRecord(source.backend ?? source.Backend)
  if (!Object.keys(backend).length) return {}

  return {
    backend: {
      BackendType: asString(backend.BackendType ?? backend.backendType),
      StandardSCParity: asStringOrNumber(backend.StandardSCParity ?? backend.standardSCParity),
      RRSCParity: asStringOrNumber(backend.RRSCParity ?? backend.rrSCParity),
    },
  }
}

export function normalizeDataUsageInfo(value: unknown): DataUsageInfo {
  const source = unwrapInfoRecord(value)
  const totalCapacity = asNonNegativeNumber(source.total_capacity ?? source.totalCapacity ?? source.TotalCapacity)
  const totalFreeCapacity = asNonNegativeNumber(
    source.total_free_capacity ?? source.totalFreeCapacity ?? source.TotalFreeCapacity,
  )
  const totalUsedCapacity = asNonNegativeNumber(
    source.total_used_capacity ?? source.totalUsedCapacity ?? source.TotalUsedCapacity,
  )

  return {
    ...(totalCapacity !== undefined ? { total_capacity: totalCapacity } : {}),
    ...(totalFreeCapacity !== undefined ? { total_free_capacity: totalFreeCapacity } : {}),
    ...(totalUsedCapacity !== undefined ? { total_used_capacity: totalUsedCapacity } : {}),
  }
}

export function normalizeMetricsInfo(value: unknown): MetricsInfo {
  const source = unwrapInfoRecord(value)
  const aggregated = asRecord(source.aggregated ?? source.Aggregated)
  const scanner = asRecord(aggregated.scanner ?? aggregated.Scanner)
  const currentCycle = asNonNegativeNumber(scanner.current_cycle ?? scanner.currentCycle)
  const currentStarted = asTimestamp(scanner.current_started ?? scanner.currentStarted)
  const cycleCompleteTimes = asArray<unknown>(scanner.cycle_complete_times ?? scanner.cycleCompleteTimes).flatMap(
    (item) => {
      const timestamp = asTimestamp(item)
      return timestamp ? [timestamp] : []
    },
  )

  if (currentCycle === undefined && !currentStarted && !cycleCompleteTimes.length) return {}

  return {
    aggregated: {
      scanner: {
        ...(currentCycle !== undefined ? { current_cycle: currentCycle } : {}),
        ...(currentStarted ? { current_started: currentStarted } : {}),
        ...(cycleCompleteTimes.length ? { cycle_complete_times: cycleCompleteTimes } : {}),
      },
    },
  }
}

export function summarizeServerStates(servers: ServerInfo[] | undefined): Record<ServerHealthState, number> {
  const summary: Record<ServerHealthState, number> = {
    online: 0,
    offline: 0,
    degraded: 0,
    initializing: 0,
    unknown: 0,
  }

  for (const server of servers ?? []) {
    summary[normalizeServerHealthState(server.state)] += 1
  }

  return summary
}

export function formatRelativeTime(timestamp: string | Date, locale: string | undefined, now = Date.now()) {
  const time = timestamp instanceof Date ? timestamp.getTime() : Date.parse(timestamp)
  if (!Number.isFinite(time)) return undefined

  const difference = time - now
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1_000],
  ]
  const [unit, size] = units.find(([, unitSize]) => Math.abs(difference) >= unitSize) ?? units.at(-1)!
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(Math.round(difference / size), unit)
}
