export type SiteReplicationSyncState = "enable" | "disable" | "unknown"

export interface SiteReplicationBucketBandwidth {
  limit: number
  set: boolean
  updatedAt?: string
}

export interface SiteReplicationPeerInfo {
  endpoint: string
  name: string
  deploymentId: string
  syncState: SiteReplicationSyncState
  defaultBandwidth: SiteReplicationBucketBandwidth
  replicateIlmExpiry: boolean
  objectNamingMode: string
  skipTlsVerify: boolean
  caCertPem: string
  apiVersion?: string
}

export interface SiteReplicationPendingOperation {
  operation: string
  id: string
  pendingPeers: string[]
  ackedPeers: string[]
  updatedAt?: string
}

export interface SiteReplicationRetryStats {
  pending: number
  failed: number
  lastError: string
}

export interface SiteReplicationInfo {
  enabled: boolean
  name: string
  sites: SiteReplicationPeerInfo[]
  serviceAccountAccessKey: string
  pendingOperation?: SiteReplicationPendingOperation
  retryStats?: SiteReplicationRetryStats
  apiVersion?: string
}

export interface SiteReplicationSiteSummary {
  replicatedBuckets: number
  replicatedTags: number
  replicatedBucketPolicies: number
  replicatedIamPolicies: number
  replicatedUsers: number
  replicatedGroups: number
  replicatedLockConfig: number
  replicatedSseConfig: number
  replicatedVersioningConfig: number
  replicatedQuotaConfig: number
  replicatedUserPolicyMappings: number
  replicatedGroupPolicyMappings: number
  replicatedIlmExpiryRules: number
  replicatedCorsConfig: number
  totalBucketsCount: number
  totalTagsCount: number
  totalBucketPoliciesCount: number
  totalIamPoliciesCount: number
  totalLockConfigCount: number
  totalSseConfigCount: number
  totalVersioningConfigCount: number
  totalQuotaConfigCount: number
  totalUsersCount: number
  totalGroupsCount: number
  totalUserPolicyMappingCount: number
  totalGroupPolicyMappingCount: number
  totalIlmExpiryRulesCount: number
  totalCorsConfigCount: number
  apiVersion?: string
}

export interface SiteReplicationStateInfo {
  name: string
  peers: Record<string, SiteReplicationPeerInfo>
  updatedAt?: string
  apiVersion?: string
}

export interface SiteReplicationVolume {
  count: number
  bytes: number
}

export interface SiteReplicationTimedErrors {
  lastMinute: SiteReplicationVolume
  lastHour: SiteReplicationVolume
  totals: SiteReplicationVolume
}

export interface SiteReplicationMetric {
  deploymentId: string
  endpoint: string
  totalDowntimeNs: number
  lastOnline?: string
  online: boolean
  replicatedSize: number
  replicatedCount: number
  failed: SiteReplicationTimedErrors
}

export interface SiteReplicationWorkerStat {
  curr: number
  avg: number
  max: number
}

export interface SiteReplicationQueueStat {
  curr: SiteReplicationVolume
  avg: SiteReplicationVolume
  max: SiteReplicationVolume
}

export interface SiteReplicationMetricsSummary {
  activeWorkers: SiteReplicationWorkerStat
  replicaSize: number
  replicaCount: number
  queued: SiteReplicationQueueStat
  metrics: Record<string, SiteReplicationMetric>
}

export interface SiteReplicationPeerError {
  name: string
  endpoint: string
  error: string
}

export interface SiteReplicationBucketStats {
  hasBucket: boolean
  bucketMarkedDeleted: boolean
  tagMismatch: boolean
  versioningConfigMismatch: boolean
  objectLockConfigMismatch: boolean
  policyMismatch: boolean
  sseConfigMismatch: boolean
  replicationCfgMismatch: boolean
  quotaCfgMismatch: boolean
  corsCfgMismatch: boolean
}

export interface SiteReplicationPolicyStats {
  hasPolicy: boolean
  policyMismatch: boolean
}

/** Per-entity details keyed by entity name, then by deployment ID. */
export type SiteReplicationEntityStats<T> = Record<string, Record<string, T>>

export interface SiteReplicationStatus {
  enabled: boolean
  maxBuckets: number
  maxUsers: number
  maxGroups: number
  maxPolicies: number
  maxIlmExpiryRules: number
  sites: Record<string, SiteReplicationPeerInfo>
  statsSummary: Record<string, SiteReplicationSiteSummary>
  peerStates: Record<string, SiteReplicationStateInfo>
  peerErrors: Record<string, SiteReplicationPeerError>
  pendingOperation?: SiteReplicationPendingOperation
  retryStats?: SiteReplicationRetryStats
  metrics: SiteReplicationMetricsSummary
  bucketStats: SiteReplicationEntityStats<SiteReplicationBucketStats>
  policyStats: SiteReplicationEntityStats<SiteReplicationPolicyStats>
  /** Deployment IDs that hold each user, group, or ILM expiry rule. */
  userSites: Record<string, string[]>
  groupSites: Record<string, string[]>
  ilmExpiryRuleSites: Record<string, string[]>
  apiVersion?: string
}

export interface SiteReplicationAddSiteInput {
  name: string
  endpoint: string
  accessKey: string
  secretKey: string
  skipTlsVerify: boolean
  caCertPem: string
}

export interface SiteReplicationAddResponse {
  success: boolean
  status: string
  errorDetail: string
  initialSyncErrorMessage: string
  apiVersion?: string
}

export interface SiteReplicationEditResponse {
  success: boolean
  status: string
  errorDetail: string
  apiVersion?: string
}

export interface SiteReplicationRemoveInput {
  siteNames: string[]
  removeAll?: boolean
}

export interface SiteReplicationRemoveResponse {
  status: string
  errorDetail: string
  apiVersion?: string
}

export type SiteReplicationResyncOperation = "start" | "cancel" | "status"

export interface SiteReplicationResyncBucketStatus {
  bucket: string
  status: string
  errorDetail: string
}

export interface SiteReplicationResyncResponse {
  opType: string
  resyncId: string
  status: string
  state: string
  buckets: SiteReplicationResyncBucketStatus[]
  totalBuckets: number
  completedBuckets: number
  failedBuckets: number
  replicatedObjects: number
  failedObjects: number
  updatedAt?: string
  errorDetail: string
}
