export interface LifecycleFilterTag {
  key: string
  value: string
}

export type BucketVersioningMode = "unversioned" | "enabled" | "suspended"

export const MAX_LIFECYCLE_RULES = 1000

export type LifecycleAction = {
  type: "expiration" | "transition"
  version: "current" | "noncurrent"
  days?: number
  date?: string
  storageClass?: string
  expiredObjectDeleteMarker?: boolean
}

type LifecycleRuleActionInput = {
  Expiration?: {
    Days?: number
    Date?: string
    StorageClass?: string
    ExpiredObjectDeleteMarker?: boolean
  }
  NoncurrentVersionExpiration?: { NoncurrentDays?: number }
  Transitions?: Array<{ Days?: number; Date?: string; StorageClass?: string }>
  NoncurrentVersionTransitions?: Array<{ NoncurrentDays?: number; StorageClass?: string }>
}

export function getLifecycleActions(rule: LifecycleRuleActionInput): LifecycleAction[] {
  const actions: LifecycleAction[] = []

  const addAction = (action: LifecycleAction) => {
    actions.push(
      Object.fromEntries(Object.entries(action).filter(([, value]) => value !== undefined)) as LifecycleAction,
    )
  }

  if (rule.Expiration) {
    const { Days, Date, StorageClass, ExpiredObjectDeleteMarker } = rule.Expiration
    if (Days !== undefined || Date !== undefined || ExpiredObjectDeleteMarker !== undefined) {
      addAction({
        type: "expiration",
        version: "current",
        days: Days,
        date: Date,
        storageClass: StorageClass,
        expiredObjectDeleteMarker: ExpiredObjectDeleteMarker,
      })
    }
  }

  if (rule.NoncurrentVersionExpiration?.NoncurrentDays !== undefined) {
    addAction({
      type: "expiration",
      version: "noncurrent",
      days: rule.NoncurrentVersionExpiration.NoncurrentDays,
    })
  }

  for (const transition of rule.Transitions ?? []) {
    addAction({
      type: "transition",
      version: "current",
      days: transition.Days,
      date: transition.Date,
      storageClass: transition.StorageClass,
    })
  }

  for (const transition of rule.NoncurrentVersionTransitions ?? []) {
    addAction({
      type: "transition",
      version: "noncurrent",
      days: transition.NoncurrentDays,
      storageClass: transition.StorageClass,
    })
  }

  return actions
}

export function getBucketVersioningMode(status?: string): BucketVersioningMode {
  if (status === "Enabled") return "enabled"
  if (status === "Suspended") return "suspended"
  return "unversioned"
}

export function findIncompleteLifecycleTag(tags: LifecycleFilterTag[]): number {
  return tags.findIndex((tag) => Boolean(tag.key.trim()) !== Boolean(tag.value.trim()))
}

export function hasCompleteLifecycleTags(tags: LifecycleFilterTag[]): boolean {
  return tags.some((tag) => Boolean(tag.key.trim()) && Boolean(tag.value.trim()))
}

export function buildLifecycleFilter(prefix: string, tags: LifecycleFilterTag[]): Record<string, unknown> {
  const validTags = tags.filter((tag) => tag.key.trim() && tag.value.trim())
  if (!prefix && validTags.length === 0) return { Prefix: "" }

  const [firstTag] = validTags
  if (firstTag && validTags.length === 1 && !prefix) {
    return { Tag: { Key: firstTag.key, Value: firstTag.value } }
  }

  if (validTags.length > 0) {
    return {
      And: {
        Tags: validTags.map((tag) => ({ Key: tag.key, Value: tag.value })),
        ...(prefix ? { Prefix: prefix } : {}),
      },
    }
  }

  return { Prefix: prefix }
}

export function buildCurrentVersionExpirationRules(
  baseId: string,
  days: number,
  filter: Record<string, unknown>,
  cleanupExpiredDeleteMarkers: boolean,
): Record<string, unknown>[] {
  const rules: Record<string, unknown>[] = [
    {
      ID: `${baseId}-expiration`,
      Status: "Enabled",
      Filter: filter,
      Expiration: { Days: days },
    },
  ]

  if (cleanupExpiredDeleteMarkers) {
    rules.push({
      ID: `${baseId}-delete-marker`,
      Status: "Enabled",
      Filter: filter,
      Expiration: { ExpiredObjectDeleteMarker: true },
    })
  }

  return rules
}

export function buildNoncurrentVersionExpirationRule(
  id: string,
  days: number,
  filter: Record<string, unknown>,
  cleanupExpiredDeleteMarkers: boolean,
): Record<string, unknown> {
  return {
    ID: id,
    Status: "Enabled",
    Filter: filter,
    NoncurrentVersionExpiration: { NoncurrentDays: days },
    ...(cleanupExpiredDeleteMarkers ? { Expiration: { ExpiredObjectDeleteMarker: true } } : {}),
  }
}
