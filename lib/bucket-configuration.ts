export type BucketConfigurationKind =
  | "lifecycle"
  | "replication"
  | "policy"
  | "encryption"
  | "cors"
  | "tagging"
  | "objectLock"
  | "quota"

const MISSING_CONFIGURATION_CODES: Record<BucketConfigurationKind, Set<string>> = {
  lifecycle: new Set(["NoSuchLifecycleConfiguration"]),
  replication: new Set(["ReplicationConfigurationNotFoundError", "NoSuchReplicationConfiguration"]),
  policy: new Set(["NoSuchBucketPolicy"]),
  encryption: new Set(["ServerSideEncryptionConfigurationNotFoundError"]),
  cors: new Set(["NoSuchCORSConfiguration"]),
  tagging: new Set(["NoSuchTagSet"]),
  objectLock: new Set(["ObjectLockConfigurationNotFoundError", "NoSuchObjectLockConfiguration"]),
  quota: new Set(["NoSuchBucketQuota"]),
}

export function isMissingBucketConfiguration(error: unknown, kind: BucketConfigurationKind): boolean {
  if (!error || typeof error !== "object") return false

  const candidate = error as {
    name?: unknown
    code?: unknown
    Code?: unknown
    Error?: { Code?: unknown }
    status?: unknown
    statusCode?: unknown
    $metadata?: { httpStatusCode?: unknown }
  }
  const codes = [candidate.name, candidate.code, candidate.Code, candidate.Error?.Code].filter(
    (value): value is string => typeof value === "string",
  )

  if (codes.some((code) => MISSING_CONFIGURATION_CODES[kind].has(code))) return true

  if (kind !== "quota") return false
  const statuses = [candidate.status, candidate.statusCode, candidate.$metadata?.httpStatusCode]
  return statuses.some((status) => status === 404)
}

export function removeMatchingBucketRule<T extends { ID?: string }>(rules: T[], target: T): T[] | null {
  const matches = target.ID
    ? rules.filter((rule) => rule.ID === target.ID)
    : rules.filter((rule) => JSON.stringify(rule) === JSON.stringify(target))

  if (matches.length !== 1) return null

  return target.ID
    ? rules.filter((rule) => rule.ID !== target.ID)
    : rules.filter((rule) => JSON.stringify(rule) !== JSON.stringify(target))
}

export function normalizeReplicationRulesForRolelessConfig<T extends { Destination?: { Bucket?: string } }>(
  rules: T[],
  currentRole?: string,
): T[] {
  const role = currentRole?.trim()
  if (!role) return rules

  return rules.map((rule) => ({
    ...rule,
    Destination: {
      ...rule.Destination,
      Bucket: role,
    },
  }))
}

export function createLatestRequestGate() {
  let version = 0
  return {
    begin: () => ++version,
    isCurrent: (candidate: number) => candidate === version,
    invalidate: () => {
      version += 1
    },
  }
}
