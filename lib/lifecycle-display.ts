export interface LifecycleRule {
  ID?: string
  Status?: string
  Filter?: {
    Prefix?: string
    Tag?: { Key: string; Value: string }
    And?: { Prefix?: string; Tags?: Array<{ Key: string; Value: string }> }
  }
  Expiration?: {
    Days?: number
    Date?: string | Date
    ExpiredObjectDeleteMarker?: boolean
  }
  NoncurrentVersionExpiration?: {
    NoncurrentDays?: number
    NewerNoncurrentVersions?: number
  }
  Transitions?: Array<{ Days?: number; Date?: string | Date; StorageClass?: string }>
  NoncurrentVersionTransitions?: Array<{ NoncurrentDays?: number; StorageClass?: string }>
}

export interface LifecycleAction {
  type: "Expire" | "Transition"
  version: "Current Version" | "Non-current Version"
  days?: number
  date?: string | Date
  tier?: string
  deleteMarker?: boolean
  newerNoncurrentVersions?: number
}

function hasExpirationAction(expiration?: LifecycleRule["Expiration"]) {
  return (
    expiration?.Days !== undefined ||
    expiration?.Date !== undefined ||
    expiration?.ExpiredObjectDeleteMarker !== undefined
  )
}

function hasNoncurrentExpirationAction(expiration?: LifecycleRule["NoncurrentVersionExpiration"]) {
  return (
    expiration?.NoncurrentDays !== undefined ||
    (expiration?.NewerNoncurrentVersions !== undefined && expiration.NewerNoncurrentVersions > 0)
  )
}

export function getLifecycleActions(rule: LifecycleRule): LifecycleAction[] {
  const actions: LifecycleAction[] = []
  if (hasExpirationAction(rule.Expiration)) {
    actions.push({
      type: "Expire",
      version: "Current Version",
      days: rule.Expiration?.Days,
      date: rule.Expiration?.Date,
      deleteMarker: rule.Expiration?.ExpiredObjectDeleteMarker,
    })
  }
  if (hasNoncurrentExpirationAction(rule.NoncurrentVersionExpiration)) {
    actions.push({
      type: "Expire",
      version: "Non-current Version",
      days: rule.NoncurrentVersionExpiration?.NoncurrentDays,
      newerNoncurrentVersions: rule.NoncurrentVersionExpiration?.NewerNoncurrentVersions,
    })
  }
  for (const transition of rule.Transitions ?? []) {
    if (transition.Days === undefined && transition.Date === undefined && transition.StorageClass === undefined)
      continue
    actions.push({
      type: "Transition",
      version: "Current Version",
      days: transition.Days,
      date: transition.Date,
      tier: transition.StorageClass,
    })
  }
  for (const transition of rule.NoncurrentVersionTransitions ?? []) {
    if (transition.NoncurrentDays === undefined && transition.StorageClass === undefined) continue
    actions.push({
      type: "Transition",
      version: "Non-current Version",
      days: transition.NoncurrentDays,
      tier: transition.StorageClass,
    })
  }
  return actions
}
