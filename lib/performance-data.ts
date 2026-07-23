export type ServerHealthState = "online" | "offline" | "degraded" | "initializing" | "unknown"
export type OperationalStatus = "healthy" | "degraded" | "stale" | "not_reported" | "unknown"

export interface StatusDiagnostic {
  state: OperationalStatus
  reason?: string
  source?: string
  lastSuccessfulUpdate?: string
  lastError?: string
  historicalStallTimeouts?: number
  hint?: string
  scope?: {
    bucket?: string
    prefix?: string
    set?: string
    timeout?: string
  }
}

export interface PeerHealthDiagnostic extends StatusDiagnostic {
  nodeId: string
  isLocal?: boolean
}

export interface ClusterDiagnostics {
  peerHealth: StatusDiagnostic
  storageReadiness: StatusDiagnostic
  usageFreshness: StatusDiagnostic
  listingHealth: StatusDiagnostic
  workloadAdmission: StatusDiagnostic
  peers: PeerHealthDiagnostic[]
  membership: Array<{ nodeId: string; gridHost?: string; isLocal?: boolean }>
  topologyDrives: Array<{
    nodeId: string
    poolIndex?: number
    setIndex?: number
    diskIndex?: number
  }>
  pools: Array<{
    poolIndex?: number
    drivesPerSet?: number
    endpointCount?: number
  }>
}

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
    totalDrivesPerSet?: number[]
  }
  adminDiscovery?: {
    clusterSnapshot: string
  }
}

export interface RunningStatusTopology {
  source: "v4" | "v3" | "reported"
  expectedServers?: number
  reportedServers?: number
  expectedDrives?: number
  reportedDrives?: number
  unreportedServers?: number
  unreportedDrives?: number
  incomplete: boolean
}

export interface RunningStatusView {
  servers?: ServerInfo[]
  serverSummary?: Record<ServerHealthState, number>
  topology: RunningStatusTopology
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

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function asStringOrNumber(value: unknown): string | number | undefined {
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : undefined
}

function asTimestamp(value: unknown): string | undefined {
  const timestamp = asString(value)
  return timestamp && !Number.isNaN(Date.parse(timestamp)) ? timestamp : undefined
}

function asUnixTimestamp(value: unknown): string | undefined {
  const seconds = asNonNegativeNumber(value)
  if (seconds === undefined || seconds === 0) return undefined
  const timestamp = new Date(seconds * 1000)
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString()
}

function asSafeText(value: unknown): string | undefined {
  const text = asString(value)?.trim()
  return text ? text.slice(0, 500) : undefined
}

function asSafeAdminPath(value: unknown): string | undefined {
  const path = asString(value)
  return path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : undefined
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
  const response = asRecord(value)
  const source = unwrapInfoRecord(value)
  const backend = asRecord(source.backend ?? source.Backend)
  const discovery = asRecord(
    response.admin_discovery ?? response.adminDiscovery ?? source.admin_discovery ?? source.adminDiscovery,
  )
  const clusterSnapshotPath = asSafeAdminPath(discovery.clusterSnapshot ?? discovery.cluster_snapshot)
  const buckets = normalizeCountInfo(source.buckets ?? source.Buckets)
  const objects = normalizeCountInfo(source.objects ?? source.Objects)
  const rawServers = source.servers ?? source.Servers
  const servers = Array.isArray(rawServers)
    ? rawServers.flatMap((server) => {
        const normalized = normalizeServer(server)
        return normalized ? [normalized] : []
      })
    : undefined
  const totalDrivesPerSet = asArray<unknown>(backend.totalDrivesPerSet ?? backend.TotalDrivesPerSet).flatMap(
    (value) => {
      const count = asNonNegativeNumber(value)
      return count === undefined ? [] : [count]
    },
  )

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
            ...(totalDrivesPerSet.length ? { totalDrivesPerSet } : {}),
          },
        }
      : {}),
    ...(clusterSnapshotPath ? { adminDiscovery: { clusterSnapshot: clusterSnapshotPath } } : {}),
  }
}

function normalizeOperationalStatus(value: unknown): OperationalStatus {
  const state = asString(value)?.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
  if (["healthy", "ready", "online", "ok", "supported", "fresh", "available"].includes(state ?? "")) {
    return "healthy"
  }
  if (["stale", "outdated", "expired"].includes(state ?? "")) return "stale"
  if (["not_reported", "notreported", "unsupported", "disabled", "unavailable"].includes(state ?? "")) {
    return "not_reported"
  }
  if (
    ["degraded", "unhealthy", "failed", "failure", "offline", "unreachable", "unresolved", "error", "timeout"].includes(
      state ?? "",
    )
  ) {
    return "degraded"
  }
  return "unknown"
}

function normalizeScope(value: unknown): StatusDiagnostic["scope"] {
  const scope = asRecord(value)
  const bucket = asSafeText(scope.bucket ?? scope.bucket_name ?? scope.bucketName)
  const prefix = asSafeText(scope.prefix ?? scope.path)
  const setValue = asStringOrNumber(scope.set ?? scope.set_index ?? scope.setIndex)
  const timeoutValue = asStringOrNumber(scope.timeout ?? scope.timeout_ms ?? scope.timeoutMs)
  const normalized = {
    ...(bucket ? { bucket } : {}),
    ...(prefix ? { prefix } : {}),
    ...(setValue !== undefined ? { set: String(setValue) } : {}),
    ...(timeoutValue !== undefined
      ? { timeout: typeof timeoutValue === "number" ? `${timeoutValue} ms` : String(timeoutValue) }
      : {}),
  }
  return Object.keys(normalized).length ? normalized : undefined
}

function normalizeDiagnostic(value: unknown): StatusDiagnostic {
  if (typeof value === "string") return { state: normalizeOperationalStatus(value) }

  const record = asRecord(value)
  const nestedStatus = asRecord(record.status ?? record.Status)
  const state = normalizeOperationalStatus(
    record.condition ??
      record.Condition ??
      record.state ??
      record.State ??
      (typeof record.status === "string" ? record.status : undefined) ??
      nestedStatus.state ??
      nestedStatus.State,
  )
  const reason = asSafeText(record.reason ?? record.Reason ?? nestedStatus.reason ?? nestedStatus.Reason)
  const source = asSafeText(record.source ?? record.Source ?? nestedStatus.source ?? nestedStatus.Source)
  const lastSuccessfulUpdate =
    asTimestamp(
      record.last_successful_update ??
        record.lastSuccessfulUpdate ??
        record.last_success ??
        record.lastSuccess ??
        nestedStatus.last_successful_update ??
        nestedStatus.lastSuccessfulUpdate,
    ) ?? asUnixTimestamp(record.last_success_unix_secs ?? record.lastSuccessUnixSecs)
  const lastError = asSafeText(
    record.last_error ?? record.lastError ?? record.error ?? nestedStatus.last_error ?? nestedStatus.lastError,
  )
  const scope = normalizeScope(record.scope ?? record.context ?? nestedStatus.scope ?? nestedStatus.context)
  const historicalStallTimeouts = asNonNegativeNumber(
    record.internode_stall_timeouts_total ?? record.internodeStallTimeoutsTotal,
  )
  const hint = asSafeText(record.hint ?? record.Hint)

  return {
    state,
    ...(reason ? { reason } : {}),
    ...(source ? { source } : {}),
    ...(lastSuccessfulUpdate ? { lastSuccessfulUpdate } : {}),
    ...(lastError ? { lastError } : {}),
    ...(historicalStallTimeouts !== undefined ? { historicalStallTimeouts } : {}),
    ...(hint ? { hint } : {}),
    ...(scope ? { scope } : {}),
  }
}

function aggregateDiagnostics(diagnostics: StatusDiagnostic[], fallback?: StatusDiagnostic): StatusDiagnostic {
  if (!diagnostics.length) return fallback ?? { state: "unknown" }
  const priority: Record<OperationalStatus, number> = {
    degraded: 0,
    stale: 1,
    unknown: 2,
    not_reported: 3,
    healthy: 4,
  }
  return diagnostics.reduce((worst, current) => (priority[current.state] < priority[worst.state] ? current : worst))
}

function firstDiagnosticRecord(...values: unknown[]) {
  return values.find((value) => typeof value === "string" || Object.keys(asRecord(value)).length > 0)
}

export function normalizeClusterDiagnostics(value: unknown): ClusterDiagnostics | undefined {
  const response = asRecord(value)
  const wrappedSnapshot = response.snapshot ?? response.Snapshot
  const snapshot = wrappedSnapshot === undefined ? response : asRecord(wrappedSnapshot)
  if (!Object.keys(snapshot).length) return undefined

  const summary = asRecord(snapshot.summary ?? snapshot.Summary)
  const components = asRecord(
    snapshot.components ?? snapshot.Components ?? snapshot.component_status ?? snapshot.componentStatus,
  )
  const membershipRecord = asRecord(snapshot.membership ?? snapshot.Membership)
  const membership = asArray<unknown>(membershipRecord.nodes ?? membershipRecord.Nodes).flatMap((value) => {
    const node = asRecord(value)
    const nodeId = asSafeText(node.node_id ?? node.nodeId ?? node.NodeId)
    if (!nodeId) return []
    const gridHost = asSafeText(node.grid_host ?? node.gridHost ?? node.GridHost)
    const isLocal = asBoolean(node.is_local ?? node.isLocal ?? node.IsLocal)
    return [{ nodeId, ...(gridHost ? { gridHost } : {}), ...(isLocal !== undefined ? { isLocal } : {}) }]
  })
  const topologyDrives = asArray<unknown>(membershipRecord.drives ?? membershipRecord.Drives).flatMap((value) => {
    const drive = asRecord(value)
    const nodeId = asSafeText(drive.node_id ?? drive.nodeId ?? drive.NodeId)
    if (!nodeId) return []
    const poolIndex = asNonNegativeNumber(drive.pool_index ?? drive.poolIndex ?? drive.PoolIndex)
    const setIndex = asNonNegativeNumber(drive.set_index ?? drive.setIndex ?? drive.SetIndex)
    const diskIndex = asNonNegativeNumber(drive.disk_index ?? drive.diskIndex ?? drive.DiskIndex)
    return [
      {
        nodeId,
        ...(poolIndex !== undefined ? { poolIndex } : {}),
        ...(setIndex !== undefined ? { setIndex } : {}),
        ...(diskIndex !== undefined ? { diskIndex } : {}),
      },
    ]
  })
  const poolState = asRecord(snapshot.pool_state ?? snapshot.poolState ?? snapshot.PoolState)
  const pools = asArray<unknown>(poolState.pools ?? poolState.Pools).flatMap((value) => {
    const pool = asRecord(value)
    if (!Object.keys(pool).length) return []
    const poolIndex = asNonNegativeNumber(pool.pool_index ?? pool.poolIndex ?? pool.PoolIndex)
    const drivesPerSet = asNonNegativeNumber(pool.drives_per_set ?? pool.drivesPerSet ?? pool.DrivesPerSet)
    const endpointCount = asNonNegativeNumber(pool.endpoint_count ?? pool.endpointCount ?? pool.EndpointCount)
    return [
      {
        ...(poolIndex !== undefined ? { poolIndex } : {}),
        ...(drivesPerSet !== undefined ? { drivesPerSet } : {}),
        ...(endpointCount !== undefined ? { endpointCount } : {}),
      },
    ]
  })

  const peerRecord = asRecord(snapshot.peer_health ?? snapshot.peerHealth ?? snapshot.PeerHealth)
  const peers = asArray<unknown>(peerRecord.peers ?? peerRecord.Peers).flatMap((value) => {
    const peer = asRecord(value)
    const nodeId = asSafeText(peer.node_id ?? peer.nodeId ?? peer.NodeId)
    if (!nodeId) return []
    const diagnostic = normalizeDiagnostic(peer.status ?? peer.Status ?? peer)
    const isLocal = asBoolean(peer.is_local ?? peer.isLocal ?? peer.IsLocal)
    return [{ ...diagnostic, nodeId, ...(isLocal !== undefined ? { isLocal } : {}) }]
  })
  const explicitPeerHealth = firstDiagnosticRecord(
    components.peer_health,
    components.peerHealth,
    summary.peer_health,
    summary.peerHealth,
  )
  const peerHealth = explicitPeerHealth
    ? normalizeDiagnostic(explicitPeerHealth)
    : aggregateDiagnostics(peers, { state: "not_reported" })

  const runtime = asRecord(snapshot.runtime_status ?? snapshot.runtimeStatus ?? snapshot.RuntimeStatus)
  const explicitStorage = firstDiagnosticRecord(
    snapshot.storage_readiness,
    snapshot.storageReadiness,
    components.storage_readiness,
    components.storageReadiness,
    components.storage,
  )
  const storageReady = asBoolean(runtime.storage_ready ?? runtime.storageReady)
  const degradedReasons = asArray<unknown>(runtime.degraded_reasons ?? runtime.degradedReasons)
    .flatMap((reason) => asSafeText(reason) ?? [])
    .join(", ")
  const storageReadiness = explicitStorage
    ? normalizeDiagnostic(explicitStorage)
    : storageReady === undefined
      ? { state: "not_reported" as const }
      : {
          state: storageReady ? ("healthy" as const) : ("degraded" as const),
          ...(!storageReady && degradedReasons ? { reason: degradedReasons } : {}),
        }

  const explicitUsage = firstDiagnosticRecord(
    snapshot.usage_freshness,
    snapshot.usageFreshness,
    snapshot.usage_cache,
    snapshot.usageCache,
    components.usage_freshness,
    components.usageFreshness,
    components.usage_cache,
    components.usageCache,
    components.usage,
  )
  const usageFreshness = explicitUsage ? normalizeDiagnostic(explicitUsage) : { state: "not_reported" as const }
  const explicitListing = firstDiagnosticRecord(
    snapshot.listing,
    snapshot.metacache,
    snapshot.listing_metacache,
    snapshot.listingMetacache,
    components.listing,
    components.metacache,
    components.listing_metacache,
    components.listingMetacache,
  )
  const listingHealth = explicitListing ? normalizeDiagnostic(explicitListing) : { state: "not_reported" as const }
  const explicitWorkloadAdmission = firstDiagnosticRecord(
    snapshot.workload_admission_status,
    snapshot.workloadAdmissionStatus,
    components.workload_admission,
    components.workloadAdmission,
  )
  const workloadAdmission = explicitWorkloadAdmission
    ? normalizeDiagnostic(explicitWorkloadAdmission)
    : { state: "not_reported" as const }

  return {
    peerHealth,
    storageReadiness,
    usageFreshness,
    listingHealth,
    workloadAdmission,
    peers,
    membership,
    topologyDrives,
    pools,
  }
}

function getEndpointIdentity(value: string | undefined) {
  if (!value) return undefined
  const trimmed = value.trim().toLowerCase().replace(/\/$/, "")
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`)
    return { host: url.host, hostname: url.hostname }
  } catch {
    const host = trimmed.replace(/^https?:\/\//, "")
    return { host, hostname: host.split(":")[0] }
  }
}

function getMemberIdentities(member: ClusterDiagnostics["membership"][number]) {
  return [getEndpointIdentity(member.nodeId), getEndpointIdentity(member.gridHost)].filter(
    (identity): identity is NonNullable<ReturnType<typeof getEndpointIdentity>> => Boolean(identity),
  )
}

function findMatchingMember(server: ServerInfo, diagnostics: ClusterDiagnostics) {
  const serverIdentity = getEndpointIdentity(server.endpoint)
  if (!serverIdentity) return undefined
  const exactMatches = diagnostics.membership.filter((member) =>
    getMemberIdentities(member).some((identity) => identity.host === serverIdentity.host),
  )
  if (exactMatches.length === 1) return exactMatches[0]

  const hostnameMatches = diagnostics.membership.filter((member) =>
    getMemberIdentities(member).some((identity) => identity.hostname === serverIdentity.hostname),
  )
  return hostnameMatches.length === 1 ? hostnameMatches[0] : undefined
}

function findPeerDiagnostic(server: ServerInfo, diagnostics: ClusterDiagnostics) {
  const member = findMatchingMember(server, diagnostics)
  return member ? diagnostics.peers.find((peer) => peer.nodeId === member.nodeId) : undefined
}

function hasOnlyHealthyDrives(server: ServerInfo) {
  return Boolean(
    server.drives?.length &&
    server.drives.every((drive) => ["ok", "online"].includes(drive.state?.trim().toLowerCase() ?? "")),
  )
}

export function resolveServerHealth(
  server: ServerInfo,
  diagnostics?: ClusterDiagnostics,
): { state: ServerHealthState; reason?: string; source: "legacy" | "peer" } {
  const legacyState = normalizeServerHealthState(server.state)
  if (!diagnostics) return { state: legacyState, source: "legacy" }

  const peer = findPeerDiagnostic(server, diagnostics)
  if (!peer) return { state: legacyState, source: "legacy" }
  if (peer.state === "degraded") {
    return { state: "degraded", ...(peer.reason ? { reason: peer.reason } : {}), source: "peer" }
  }
  if (
    (peer.state === "unknown" || peer.state === "stale" || peer.state === "not_reported") &&
    (legacyState === "unknown" || (legacyState === "degraded" && hasOnlyHealthyDrives(server)))
  ) {
    return { state: "unknown", ...(peer.reason ? { reason: peer.reason } : {}), source: "peer" }
  }
  return { state: legacyState, source: "legacy" }
}

export function resolveUsageFreshness(
  diagnostic: StatusDiagnostic | undefined,
  context: { hasData: boolean; error?: string; lastUpdatedAt?: Date | null },
): StatusDiagnostic {
  if (diagnostic && diagnostic.state !== "unknown") return diagnostic
  if (context.error && context.hasData) {
    return {
      state: "stale",
      reason: context.error,
      ...(context.lastUpdatedAt ? { lastSuccessfulUpdate: context.lastUpdatedAt.toISOString() } : {}),
    }
  }
  if (context.error) return { state: "unknown", reason: context.error }
  return diagnostic ?? { state: "unknown" }
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

export function summarizeServerStates(
  servers: ServerInfo[] | undefined,
  diagnostics?: ClusterDiagnostics,
): Record<ServerHealthState, number> {
  const summary: Record<ServerHealthState, number> = {
    online: 0,
    offline: 0,
    degraded: 0,
    initializing: 0,
    unknown: 0,
  }

  for (const server of servers ?? []) {
    summary[resolveServerHealth(server, diagnostics).state] += 1
  }

  return summary
}

function getUniqueMembership(diagnostics: ClusterDiagnostics | undefined) {
  const members = diagnostics?.membership ?? []
  return Array.from(new Map(members.map((member) => [member.nodeId, member])).values())
}

function findServerIndexForMember(
  member: ClusterDiagnostics["membership"][number],
  members: ClusterDiagnostics["membership"],
  servers: ServerInfo[],
  usedIndexes: Set<number>,
) {
  const memberIdentities = getMemberIdentities(member)
  const available = servers.flatMap((server, index) => {
    if (usedIndexes.has(index)) return []
    const identity = getEndpointIdentity(server.endpoint)
    return identity ? [{ identity, index }] : []
  })
  const exactMatches = available.filter(({ identity }) =>
    memberIdentities.some((memberIdentity) => memberIdentity.host === identity.host),
  )
  if (exactMatches.length) return exactMatches[0].index

  const memberHostnames = new Set(memberIdentities.map((identity) => identity.hostname))
  const hostnameMatches = available.filter(({ identity }) => memberHostnames.has(identity.hostname))
  if (hostnameMatches.length !== 1) return undefined

  const sharedMemberHostname = members.some(
    (candidate) =>
      candidate !== member && getMemberIdentities(candidate).some((identity) => memberHostnames.has(identity.hostname)),
  )
  const sharedServerHostname = servers.some((server, index) => {
    if (index === hostnameMatches[0].index) return false
    const identity = getEndpointIdentity(server.endpoint)
    return identity ? memberHostnames.has(identity.hostname) : false
  })
  return sharedMemberHostname || sharedServerHostname ? undefined : hostnameMatches[0].index
}

function reconcileTopologyServers(system: SystemInfo, diagnostics: ClusterDiagnostics | undefined) {
  const reportedServers = system.servers ?? []
  const membership = getUniqueMembership(diagnostics)
  if (!membership.length) {
    return {
      servers: system.servers,
      reportedServers: system.servers?.length,
      expectedServers: undefined,
    }
  }

  const usedIndexes = new Set<number>()
  let matchedServers = 0
  const servers = membership.map((member): ServerInfo => {
    const serverIndex = findServerIndexForMember(member, membership, reportedServers, usedIndexes)
    if (serverIndex !== undefined) {
      usedIndexes.add(serverIndex)
      matchedServers += 1
      return reportedServers[serverIndex]
    }
    return {
      endpoint: member.gridHost ?? member.nodeId,
      state: "unknown",
      drives: [],
      network: {},
    }
  })

  reportedServers.forEach((server, index) => {
    if (!usedIndexes.has(index)) servers.push(server)
  })

  return {
    servers,
    reportedServers: matchedServers,
    expectedServers: membership.length,
  }
}

function sumDefined(values: Array<number | undefined>) {
  return values.some((value) => value !== undefined)
    ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
    : undefined
}

export function buildRunningStatusView(system: SystemInfo, diagnostics?: ClusterDiagnostics): RunningStatusView {
  const reconciled = reconcileTopologyServers(system, diagnostics)
  const v4ExpectedDrives = diagnostics?.topologyDrives.length
    ? new Set(
        diagnostics.topologyDrives.map(
          (drive) => `${drive.poolIndex ?? ""}:${drive.setIndex ?? ""}:${drive.diskIndex ?? ""}:${drive.nodeId}`,
        ),
      ).size
    : sumDefined(diagnostics?.pools.map((pool) => pool.endpointCount) ?? [])
  const v3ExpectedDrives = system.backend?.totalDrivesPerSet?.reduce((total, count) => total + count, 0)
  const reportedDrives = sumDefined([
    system.backend?.onlineDisks,
    system.backend?.offlineDisks,
    system.backend?.unknownDisks,
  ])
  const hasV4Topology = reconciled.expectedServers !== undefined || v4ExpectedDrives !== undefined
  const expectedDrives = v4ExpectedDrives ?? v3ExpectedDrives
  const source = hasV4Topology ? "v4" : v3ExpectedDrives !== undefined ? "v3" : "reported"
  const unreportedServers =
    reconciled.expectedServers !== undefined && reconciled.reportedServers !== undefined
      ? Math.max(0, reconciled.expectedServers - reconciled.reportedServers)
      : undefined
  const unreportedDrives =
    expectedDrives !== undefined && reportedDrives !== undefined
      ? Math.max(0, expectedDrives - reportedDrives)
      : undefined
  const incomplete = Boolean(
    (reconciled.expectedServers !== undefined && reconciled.reportedServers !== reconciled.expectedServers) ||
    (expectedDrives !== undefined && reportedDrives !== expectedDrives),
  )

  return {
    servers: reconciled.servers,
    serverSummary: reconciled.servers ? summarizeServerStates(reconciled.servers, diagnostics) : undefined,
    topology: {
      source,
      ...(reconciled.expectedServers !== undefined ? { expectedServers: reconciled.expectedServers } : {}),
      ...(reconciled.reportedServers !== undefined ? { reportedServers: reconciled.reportedServers } : {}),
      ...(expectedDrives !== undefined ? { expectedDrives } : {}),
      ...(reportedDrives !== undefined ? { reportedDrives } : {}),
      ...(unreportedServers !== undefined ? { unreportedServers } : {}),
      ...(unreportedDrives !== undefined ? { unreportedDrives } : {}),
      incomplete,
    },
  }
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
