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
  apiVersion?: string
}

export interface SiteReplicationInfo {
  enabled: boolean
  name: string
  sites: SiteReplicationPeerInfo[]
  serviceAccountAccessKey: string
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

export interface SiteReplicationMetric {
  deploymentId: string
  endpoint: string
  totalDowntimeNs: number
  lastOnline?: string
  online: boolean
  replicatedSize: number
  replicatedCount: number
}

export interface SiteReplicationWorkerStat {
  curr: number
  avg: number
  max: number
}

export interface SiteReplicationMetricsSummary {
  activeWorkers: SiteReplicationWorkerStat
  replicaSize: number
  replicaCount: number
  metrics: Record<string, SiteReplicationMetric>
}

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
  metrics: SiteReplicationMetricsSummary
  apiVersion?: string
}

export interface SiteReplicationAddSiteInput {
  name: string
  endpoint: string
  accessKey: string
  secretKey: string
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

export type SiteReplicationResyncOperation = "start" | "cancel"

export interface SiteReplicationResyncBucketStatus {
  bucket: string
  status: string
  errorDetail: string
}

export interface SiteReplicationResyncResponse {
  opType: string
  resyncId: string
  status: string
  buckets: SiteReplicationResyncBucketStatus[]
  errorDetail: string
}
