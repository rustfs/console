import type {
  SiteReplicationBucketStats,
  SiteReplicationInfo,
  SiteReplicationPendingOperation,
  SiteReplicationRetryStats,
  SiteReplicationStatus,
  SiteReplicationTimedErrors,
  SiteReplicationVolume,
} from "@/types/site-replication"

export type SiteReplicationHealthLevel = "healthy" | "degraded" | "critical" | "unknown"

export type SiteReplicationConnectionState = "online" | "offline" | "unknown"

export interface SiteReplicationConnection {
  state: SiteReplicationConnectionState
  lastOnline?: string
  downtimeNs: number
  error?: string
}

export type SiteReplicationHealthIssue =
  | { kind: "peer-offline"; deploymentId: string; error?: string }
  | { kind: "pending-operation"; operation: SiteReplicationPendingOperation }
  | { kind: "retry-backlog"; retryStats: SiteReplicationRetryStats }
  | { kind: "recent-failures"; count: number }
  | { kind: "drift"; count: number }

export type SiteReplicationDriftEntity = "bucket" | "policy" | "user" | "group" | "ilmExpiryRule"

export type SiteReplicationBucketMismatch =
  | "markedDeleted"
  | "tags"
  | "versioning"
  | "objectLock"
  | "policy"
  | "encryption"
  | "replication"
  | "quota"
  | "cors"

export interface SiteReplicationDriftItem {
  entity: SiteReplicationDriftEntity
  name: string
  /** Deployment IDs of the sites that do not hold the entity. */
  missingOn: string[]
  /** Settings that differ between sites; `policy` entities report "content". */
  mismatches: (SiteReplicationBucketMismatch | "content")[]
}

export interface SiteReplicationHealth {
  level: SiteReplicationHealthLevel
  issues: SiteReplicationHealthIssue[]
  connections: Record<string, SiteReplicationConnection>
  /** Null when an unreachable peer makes the comparison meaningless. */
  drift: SiteReplicationDriftItem[] | null
}

const BUCKET_MISMATCH_FLAGS: [keyof SiteReplicationBucketStats, SiteReplicationBucketMismatch][] = [
  ["bucketMarkedDeleted", "markedDeleted"],
  ["tagMismatch", "tags"],
  ["versioningConfigMismatch", "versioning"],
  ["objectLockConfigMismatch", "objectLock"],
  ["policyMismatch", "policy"],
  ["sseConfigMismatch", "encryption"],
  ["replicationCfgMismatch", "replication"],
  ["quotaCfgMismatch", "quota"],
  ["corsCfgMismatch", "cors"],
]

function resolveConnection(
  status: SiteReplicationStatus | null,
  deploymentId: string,
  isLocal: boolean,
): SiteReplicationConnection {
  if (isLocal) {
    return { state: "online", downtimeNs: 0 }
  }

  const peerError = status?.peerErrors[deploymentId]
  const metric = status?.metrics.metrics[deploymentId]
  if (peerError || metric?.online === false) {
    return {
      state: "offline",
      lastOnline: metric?.lastOnline,
      downtimeNs: metric?.totalDowntimeNs ?? 0,
      error: peerError?.error || undefined,
    }
  }
  if (metric) {
    return { state: "online", lastOnline: metric.lastOnline, downtimeNs: metric.totalDowntimeNs }
  }

  // Servers before rustfs/rustfs#7024 only report the local metric entry.
  return { state: "unknown", downtimeNs: 0 }
}

/**
 * Object replication failures counted by the node that answered the status
 * request. Only the local metric entry carries them; summing every entry keeps
 * the result independent of whether the local site could be identified.
 */
export function siteReplicationFailures(status: SiteReplicationStatus | null): SiteReplicationTimedErrors {
  const add = (left: SiteReplicationVolume, right: SiteReplicationVolume) => ({
    count: left.count + right.count,
    bytes: left.bytes + right.bytes,
  })
  const empty = { count: 0, bytes: 0 }

  return Object.values(status?.metrics.metrics ?? {}).reduce(
    (total, metric) => ({
      lastMinute: add(total.lastMinute, metric.failed.lastMinute),
      lastHour: add(total.lastHour, metric.failed.lastHour),
      totals: add(total.totals, metric.failed.totals),
    }),
    { lastMinute: empty, lastHour: empty, totals: empty },
  )
}

function missingSites(siteIds: string[], holders: Iterable<string>) {
  const held = new Set(holders)
  return siteIds.filter((deploymentId) => !held.has(deploymentId))
}

function collectDrift(status: SiteReplicationStatus, siteIds: string[]): SiteReplicationDriftItem[] {
  const drift: SiteReplicationDriftItem[] = []

  // The server already prunes in-sync buckets and policies from these maps.
  for (const [name, perSite] of Object.entries(status.bucketStats)) {
    const stats = Object.values(perSite)
    const missingOn = missingSites(
      siteIds,
      Object.entries(perSite)
        .filter(([, item]) => item.hasBucket)
        .map(([deploymentId]) => deploymentId),
    )
    const mismatches = BUCKET_MISMATCH_FLAGS.filter(([flag]) => stats.some((item) => item[flag])).map(
      ([, mismatch]) => mismatch,
    )
    if (missingOn.length || mismatches.length) {
      drift.push({ entity: "bucket", name, missingOn, mismatches })
    }
  }

  for (const [name, perSite] of Object.entries(status.policyStats)) {
    const missingOn = missingSites(
      siteIds,
      Object.entries(perSite)
        .filter(([, item]) => item.hasPolicy)
        .map(([deploymentId]) => deploymentId),
    )
    const mismatched = Object.values(perSite).some((item) => item.policyMismatch)
    if (missingOn.length || mismatched) {
      drift.push({ entity: "policy", name, missingOn, mismatches: mismatched ? ["content"] : [] })
    }
  }

  const presence: [SiteReplicationDriftEntity, Record<string, string[]>][] = [
    ["user", status.userSites],
    ["group", status.groupSites],
    ["ilmExpiryRule", status.ilmExpiryRuleSites],
  ]
  for (const [entity, sitesByName] of presence) {
    for (const [name, holders] of Object.entries(sitesByName)) {
      const missingOn = missingSites(siteIds, holders)
      if (missingOn.length) {
        drift.push({ entity, name, missingOn, mismatches: [] })
      }
    }
  }

  return drift
}

/**
 * Turn the site replication info and status payloads into the answer an
 * operator needs first: is replication working, and if not, why.
 *
 * `critical` means a peer cannot be reached, so nothing replicates to it.
 * `degraded` means replication runs but something needs attention: an
 * unfinished lifecycle operation, failing peer deliveries, object
 * replication failures in the last hour, or configuration drift.
 */
export function assessSiteReplicationHealth(input: {
  info: SiteReplicationInfo | null
  status: SiteReplicationStatus | null
  localDeploymentId: string
}): SiteReplicationHealth {
  const { info, status, localDeploymentId } = input
  const siteIds = (info?.sites ?? []).map((peer) => peer.deploymentId).filter(Boolean)
  const connections = Object.fromEntries(
    siteIds.map((deploymentId) => [
      deploymentId,
      resolveConnection(status, deploymentId, deploymentId === localDeploymentId),
    ]),
  )

  const issues: SiteReplicationHealthIssue[] = []
  for (const [deploymentId, connection] of Object.entries(connections)) {
    if (connection.state === "offline") {
      issues.push({ kind: "peer-offline", deploymentId, error: connection.error })
    }
  }

  const pendingOperation = status?.pendingOperation ?? info?.pendingOperation
  if (pendingOperation) {
    issues.push({ kind: "pending-operation", operation: pendingOperation })
  }

  const retryStats = status?.retryStats ?? info?.retryStats
  if (retryStats && (retryStats.pending > 0 || retryStats.failed > 0)) {
    issues.push({ kind: "retry-backlog", retryStats })
  }

  const recentFailures = siteReplicationFailures(status).lastHour.count
  if (recentFailures > 0) {
    issues.push({ kind: "recent-failures", count: recentFailures })
  }

  // An unreachable peer reports empty metadata, which would flag every
  // bucket and user as missing there.
  const allPeersReachable = Object.values(connections).every((connection) => connection.state === "online")
  const drift = status && allPeersReachable ? collectDrift(status, siteIds) : null
  if (drift?.length) {
    issues.push({ kind: "drift", count: drift.length })
  }

  let level: SiteReplicationHealthLevel
  if (issues.some((issue) => issue.kind === "peer-offline")) {
    level = "critical"
  } else if (issues.length) {
    level = "degraded"
  } else {
    level = status && allPeersReachable ? "healthy" : "unknown"
  }

  return { level, issues, connections, drift }
}
