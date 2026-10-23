"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"
import type {
  SiteReplicationAddResponse,
  SiteReplicationAddSiteInput,
  SiteReplicationBucketStats,
  SiteReplicationEditResponse,
  SiteReplicationEntityStats,
  SiteReplicationInfo,
  SiteReplicationMetric,
  SiteReplicationMetricsSummary,
  SiteReplicationPeerError,
  SiteReplicationPeerInfo,
  SiteReplicationPendingOperation,
  SiteReplicationPolicyStats,
  SiteReplicationQueueStat,
  SiteReplicationRemoveInput,
  SiteReplicationRemoveResponse,
  SiteReplicationResyncOperation,
  SiteReplicationResyncResponse,
  SiteReplicationRetryStats,
  SiteReplicationSiteSummary,
  SiteReplicationStateInfo,
  SiteReplicationStatus,
  SiteReplicationSyncState,
  SiteReplicationTimedErrors,
  SiteReplicationVolume,
  SiteReplicationWorkerStat,
} from "@/types/site-replication"

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function mapRecord<T>(value: unknown, normalize: (item: unknown) => T): Record<string, T> {
  return Object.fromEntries(Object.entries(asRecord(value)).map(([key, item]) => [key, normalize(item)]))
}

function normalizeSyncState(value: unknown): SiteReplicationSyncState {
  const normalized = asString(value).toLowerCase()
  if (normalized === "enable" || normalized === "disable") {
    return normalized
  }
  return "unknown"
}

function normalizeWorkerStat(value: unknown): SiteReplicationWorkerStat {
  const record = asRecord(value)

  return {
    curr: asNumber(record.curr),
    avg: asNumber(record.avg),
    max: asNumber(record.max),
  }
}

function normalizeVolume(value: unknown): SiteReplicationVolume {
  const record = asRecord(value)

  return { count: asNumber(record.count), bytes: asNumber(record.bytes) }
}

function normalizeTimedErrors(value: unknown): SiteReplicationTimedErrors {
  const record = asRecord(value)

  return {
    lastMinute: normalizeVolume(record.lastMinute),
    lastHour: normalizeVolume(record.lastHour),
    totals: normalizeVolume(record.totals),
  }
}

function normalizeQueueStat(value: unknown): SiteReplicationQueueStat {
  const record = asRecord(value)

  return {
    curr: normalizeVolume(record.curr),
    avg: normalizeVolume(record.avg),
    max: normalizeVolume(record.max),
  }
}

// Both fields are omitted by the server while nothing is outstanding, so an
// absent value means "healthy", not "unknown".
function normalizePendingOperation(value: unknown): SiteReplicationPendingOperation | undefined {
  const record = asRecord(value)
  const operation = asString(record.operation)
  if (!operation) {
    return undefined
  }

  return {
    operation,
    id: asString(record.id),
    pendingPeers: asStringArray(record.pendingPeers),
    ackedPeers: asStringArray(record.ackedPeers),
    updatedAt: asString(record.updatedAt) || undefined,
  }
}

function normalizeRetryStats(value: unknown): SiteReplicationRetryStats | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }
  const record = asRecord(value)

  return {
    pending: asNumber(record.pending),
    failed: asNumber(record.failed),
    lastError: asString(record.lastError),
  }
}

function normalizePeerError(value: unknown): SiteReplicationPeerError {
  const record = asRecord(value)

  return { name: asString(record.name), endpoint: asString(record.endpoint), error: asString(record.error) }
}

function normalizeBucketStats(value: unknown): SiteReplicationBucketStats {
  const record = asRecord(value)

  return {
    hasBucket: asBoolean(record.HasBucket),
    bucketMarkedDeleted: asBoolean(record.BucketMarkedDeleted),
    tagMismatch: asBoolean(record.TagMismatch),
    versioningConfigMismatch: asBoolean(record.VersioningConfigMismatch),
    objectLockConfigMismatch: asBoolean(record.OLockConfigMismatch),
    policyMismatch: asBoolean(record.PolicyMismatch),
    sseConfigMismatch: asBoolean(record.SSEConfigMismatch),
    replicationCfgMismatch: asBoolean(record.ReplicationCfgMismatch),
    quotaCfgMismatch: asBoolean(record.QuotaCfgMismatch),
    corsCfgMismatch: asBoolean(record.CorsCfgMismatch),
  }
}

function normalizePolicyStats(value: unknown): SiteReplicationPolicyStats {
  const record = asRecord(value)

  return { hasPolicy: asBoolean(record.HasPolicy), policyMismatch: asBoolean(record.PolicyMismatch) }
}

function normalizeEntityStats<T>(value: unknown, normalize: (item: unknown) => T): SiteReplicationEntityStats<T> {
  return mapRecord(value, (entity) => mapRecord(entity, normalize))
}

// User, group, and ILM expiry rule entries only exist on the sites that hold
// the entity, so the inner keys are the holding deployment IDs.
function normalizeEntitySites(value: unknown): Record<string, string[]> {
  return mapRecord(value, (entity) => Object.keys(asRecord(entity)))
}

function normalizePeerInfo(value: unknown): SiteReplicationPeerInfo {
  const record = asRecord(value)
  const bandwidth = asRecord(record.defaultbandwidth)

  return {
    endpoint: asString(record.endpoint),
    name: asString(record.name),
    deploymentId: asString(record.deploymentID),
    syncState: normalizeSyncState(record.sync),
    defaultBandwidth: {
      limit: asNumber(bandwidth.bandwidthLimitPerBucket),
      set: asBoolean(bandwidth.set),
      updatedAt: asString(bandwidth.updatedAt) || undefined,
    },
    replicateIlmExpiry: asBoolean(record["replicate-ilm-expiry"]),
    objectNamingMode: asString(record.objectNamingMode),
    skipTlsVerify: asBoolean(record.skipTlsVerify ?? record.skip_tls_verify),
    caCertPem: asString(record.caCertPem ?? record.ca_cert_pem),
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function buildPeerPayload(peer: SiteReplicationPeerInfo) {
  return {
    endpoint: peer.endpoint,
    name: peer.name,
    deploymentID: peer.deploymentId,
    sync: peer.syncState,
    defaultbandwidth: {
      bandwidthLimitPerBucket: peer.defaultBandwidth.limit,
      set: peer.defaultBandwidth.set,
      updatedAt: peer.defaultBandwidth.updatedAt,
    },
    "replicate-ilm-expiry": peer.replicateIlmExpiry,
    objectNamingMode: peer.objectNamingMode,
    skipTlsVerify: peer.skipTlsVerify,
    caCertPem: peer.caCertPem,
    apiVersion: peer.apiVersion,
  }
}

function normalizePeerMap(value: unknown): Record<string, SiteReplicationPeerInfo> {
  const record = asRecord(value)

  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, normalizePeerInfo(item)]))
}

function normalizeSiteSummary(value: unknown): SiteReplicationSiteSummary {
  const record = asRecord(value)

  return {
    replicatedBuckets: asNumber(record.ReplicatedBuckets),
    replicatedTags: asNumber(record.ReplicatedTags),
    replicatedBucketPolicies: asNumber(record.ReplicatedBucketPolicies),
    replicatedIamPolicies: asNumber(record.ReplicatedIAMPolicies),
    replicatedUsers: asNumber(record.ReplicatedUsers),
    replicatedGroups: asNumber(record.ReplicatedGroups),
    replicatedLockConfig: asNumber(record.ReplicatedLockConfig),
    replicatedSseConfig: asNumber(record.ReplicatedSSEConfig),
    replicatedVersioningConfig: asNumber(record.ReplicatedVersioningConfig),
    replicatedQuotaConfig: asNumber(record.ReplicatedQuotaConfig),
    replicatedUserPolicyMappings: asNumber(record.ReplicatedUserPolicyMappings),
    replicatedGroupPolicyMappings: asNumber(record.ReplicatedGroupPolicyMappings),
    replicatedIlmExpiryRules: asNumber(record.ReplicatedILMExpiryRules),
    replicatedCorsConfig: asNumber(record.ReplicatedCorsConfig),
    totalBucketsCount: asNumber(record.TotalBucketsCount),
    totalTagsCount: asNumber(record.TotalTagsCount),
    totalBucketPoliciesCount: asNumber(record.TotalBucketPoliciesCount),
    totalIamPoliciesCount: asNumber(record.TotalIAMPoliciesCount),
    totalLockConfigCount: asNumber(record.TotalLockConfigCount),
    totalSseConfigCount: asNumber(record.TotalSSEConfigCount),
    totalVersioningConfigCount: asNumber(record.TotalVersioningConfigCount),
    totalQuotaConfigCount: asNumber(record.TotalQuotaConfigCount),
    totalUsersCount: asNumber(record.TotalUsersCount),
    totalGroupsCount: asNumber(record.TotalGroupsCount),
    totalUserPolicyMappingCount: asNumber(record.TotalUserPolicyMappingCount),
    totalGroupPolicyMappingCount: asNumber(record.TotalGroupPolicyMappingCount),
    totalIlmExpiryRulesCount: asNumber(record.TotalILMExpiryRulesCount),
    totalCorsConfigCount: asNumber(record.TotalCorsConfigCount),
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function normalizeSiteSummaryMap(value: unknown): Record<string, SiteReplicationSiteSummary> {
  const record = asRecord(value)

  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, normalizeSiteSummary(item)]))
}

function normalizeStateInfo(value: unknown): SiteReplicationStateInfo {
  const record = asRecord(value)

  return {
    name: asString(record.name),
    peers: normalizePeerMap(record.peers),
    updatedAt: asString(record.updatedAt) || undefined,
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function normalizeStateInfoMap(value: unknown): Record<string, SiteReplicationStateInfo> {
  const record = asRecord(value)

  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, normalizeStateInfo(item)]))
}

function normalizeMetric(value: unknown): SiteReplicationMetric {
  const record = asRecord(value)

  return {
    deploymentId: asString(record.deploymentID),
    endpoint: asString(record.endpoint),
    totalDowntimeNs: asNumber(record.totalDowntime),
    lastOnline: asString(record.lastOnline) || undefined,
    online: asBoolean(record.isOnline),
    replicatedSize: asNumber(record.replicatedSize),
    replicatedCount: asNumber(record.replicatedCount),
    failed: normalizeTimedErrors(record.failed),
  }
}

function normalizeMetricMap(value: unknown): Record<string, SiteReplicationMetric> {
  const record = asRecord(value)

  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, normalizeMetric(item)]))
}

function normalizeMetricsSummary(value: unknown): SiteReplicationMetricsSummary {
  const record = asRecord(value)

  return {
    activeWorkers: normalizeWorkerStat(record.activeWorkers),
    replicaSize: asNumber(record.replicaSize),
    replicaCount: asNumber(record.replicaCount),
    queued: normalizeQueueStat(record.queued),
    metrics: normalizeMetricMap(record.replMetrics),
  }
}

function normalizeInfo(value: unknown): SiteReplicationInfo {
  const record = asRecord(value)
  const sites = Array.isArray(record.sites) ? record.sites.map(normalizePeerInfo) : []

  return {
    enabled: asBoolean(record.enabled),
    name: asString(record.name),
    sites,
    serviceAccountAccessKey: asString(record.serviceAccountAccessKey),
    pendingOperation: normalizePendingOperation(record.pendingOperation),
    retryStats: normalizeRetryStats(record.retryStats),
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function normalizeStatus(value: unknown): SiteReplicationStatus {
  const record = asRecord(value)

  return {
    enabled: asBoolean(record.enabled),
    maxBuckets: asNumber(record.MaxBuckets),
    maxUsers: asNumber(record.MaxUsers),
    maxGroups: asNumber(record.MaxGroups),
    maxPolicies: asNumber(record.MaxPolicies),
    maxIlmExpiryRules: asNumber(record.MaxILMExpiryRules),
    sites: normalizePeerMap(record.Sites),
    statsSummary: normalizeSiteSummaryMap(record.StatsSummary),
    peerStates: normalizeStateInfoMap(record.PeerStates),
    peerErrors: mapRecord(record.PeerErrors, normalizePeerError),
    pendingOperation: normalizePendingOperation(record.PendingOperation),
    retryStats: normalizeRetryStats(record.RetryStats),
    metrics: normalizeMetricsSummary(record.Metrics),
    bucketStats: normalizeEntityStats(record.BucketStats, normalizeBucketStats),
    policyStats: normalizeEntityStats(record.PolicyStats, normalizePolicyStats),
    userSites: normalizeEntitySites(record.UserStats),
    groupSites: normalizeEntitySites(record.GroupStats),
    ilmExpiryRuleSites: normalizeEntitySites(record.ILMExpiryStats),
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function normalizeAddResponse(value: unknown): SiteReplicationAddResponse {
  const record = asRecord(value)

  return {
    success: asBoolean(record.success),
    status: asString(record.status),
    errorDetail: asString(record.errorDetail),
    initialSyncErrorMessage: asString(record.initialSyncErrorMessage),
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function normalizeEditResponse(value: unknown): SiteReplicationEditResponse {
  const record = asRecord(value)

  return {
    success: asBoolean(record.success),
    status: asString(record.status),
    errorDetail: asString(record.errorDetail),
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function normalizeRemoveResponse(value: unknown): SiteReplicationRemoveResponse {
  const record = asRecord(value)

  return {
    status: asString(record.status),
    errorDetail: asString(record.errorDetail),
    apiVersion: asString(record.apiVersion) || undefined,
  }
}

function normalizeResyncResponse(value: unknown): SiteReplicationResyncResponse {
  const record = asRecord(value)
  const buckets = Array.isArray(record.buckets)
    ? record.buckets.map((bucket) => {
        const item = asRecord(bucket)
        return {
          bucket: asString(item.bucket),
          status: asString(item.status),
          errorDetail: asString(item.errorDetail),
        }
      })
    : []

  return {
    opType: asString(record.op),
    resyncId: asString(record.id),
    status: asString(record.status),
    state: asString(record.state),
    buckets,
    totalBuckets: asNumber(record.totalBuckets),
    completedBuckets: asNumber(record.completedBuckets),
    failedBuckets: asNumber(record.failedBuckets),
    replicatedObjects: asNumber(record.replicatedObjects),
    failedObjects: asNumber(record.failedObjects),
    updatedAt: asString(record.updatedAt) || undefined,
    errorDetail: asString(record.errorDetail),
  }
}

function buildQuery(query: Record<string, string | undefined>) {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ""
}

export function useSiteReplication() {
  const api = useApi()

  const getSiteReplicationInfo = useCallback(async () => {
    const response = await api.get("/site-replication/info")
    return normalizeInfo(response)
  }, [api])

  const getSiteReplicationStatus = useCallback(
    async (query?: Record<string, string>) => {
      const response = await api.get("/site-replication/status", { params: query })
      return normalizeStatus(response)
    },
    [api],
  )

  const addSiteReplication = useCallback(
    async (sites: SiteReplicationAddSiteInput[], options?: { replicateIlmExpiry?: boolean }) => {
      const payload = sites.map((site) => ({
        name: site.name,
        endpoints: site.endpoint,
        accessKey: site.accessKey,
        secretKey: site.secretKey,
        skipTlsVerify: site.skipTlsVerify,
        caCertPem: site.caCertPem,
      }))

      const query = buildQuery({
        replicateILMExpiry: options?.replicateIlmExpiry ? "true" : undefined,
      })

      const response = await api.put(`/site-replication/add${query}`, payload)
      return normalizeAddResponse(response)
    },
    [api],
  )

  const editSiteReplication = useCallback(
    async (
      peer: SiteReplicationPeerInfo,
      options?: { enableIlmExpiryReplication?: boolean; disableIlmExpiryReplication?: boolean },
    ) => {
      const query = buildQuery({
        enableILMExpiryReplication: options?.enableIlmExpiryReplication ? "true" : undefined,
        disableILMExpiryReplication: options?.disableIlmExpiryReplication ? "true" : undefined,
      })

      const response = await api.put(`/site-replication/edit${query}`, buildPeerPayload(peer))

      return normalizeEditResponse(response)
    },
    [api],
  )

  const setSiteReplicationIlmExpiry = useCallback(
    async (enabled: boolean) => {
      const response = await api.put(
        `/site-replication/edit${buildQuery({
          enableILMExpiryReplication: enabled ? "true" : undefined,
          disableILMExpiryReplication: enabled ? undefined : "true",
        })}`,
        {},
      )

      return normalizeEditResponse(response)
    },
    [api],
  )

  const removeSiteReplication = useCallback(
    async ({ siteNames, removeAll = false }: SiteReplicationRemoveInput) => {
      const response = await api.put("/site-replication/remove", {
        sites: siteNames,
        all: removeAll,
      })

      return normalizeRemoveResponse(response)
    },
    [api],
  )

  const resyncSiteReplication = useCallback(
    async (operation: SiteReplicationResyncOperation, peer: SiteReplicationPeerInfo) => {
      const response = await api.put(`/site-replication/resync/op${buildQuery({ operation })}`, buildPeerPayload(peer))

      return normalizeResyncResponse(response)
    },
    [api],
  )

  return {
    getSiteReplicationInfo,
    getSiteReplicationStatus,
    addSiteReplication,
    editSiteReplication,
    setSiteReplicationIlmExpiry,
    removeSiteReplication,
    resyncSiteReplication,
  }
}
