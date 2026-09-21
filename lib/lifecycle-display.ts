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
    StorageClass?: string
    ExpiredObjectDeleteMarker?: boolean
  }
  NoncurrentVersionExpiration?: { NoncurrentDays?: number }
  Transitions?: Array<{ Days?: number; Date?: string | Date; StorageClass?: string }>
  NoncurrentVersionTransitions?: Array<{
    NoncurrentDays?: number
    StorageClass?: string
  }>
}

export interface LifecycleAction {
  type: "Expire" | "Transition"
  version: "Current Version" | "Non-current Version"
  days?: number
  date?: string | Date
  tier?: string
  deleteMarker?: boolean
}

export function getLifecycleActions(rule: LifecycleRule): LifecycleAction[] {
  const actions: LifecycleAction[] = []
  if (rule.Expiration) {
    actions.push({
      type: "Expire",
      version: "Current Version",
      days: rule.Expiration.Days,
      date: rule.Expiration.Date,
      deleteMarker: rule.Expiration.ExpiredObjectDeleteMarker,
    })
  }
  if (rule.NoncurrentVersionExpiration) {
    actions.push({
      type: "Expire",
      version: "Non-current Version",
      days: rule.NoncurrentVersionExpiration.NoncurrentDays,
    })
  }
  for (const transition of rule.Transitions ?? []) {
    actions.push({
      type: "Transition",
      version: "Current Version",
      days: transition.Days,
      date: transition.Date,
      tier: transition.StorageClass,
    })
  }
  for (const transition of rule.NoncurrentVersionTransitions ?? []) {
    actions.push({
      type: "Transition",
      version: "Non-current Version",
      days: transition.NoncurrentDays,
      tier: transition.StorageClass,
    })
  }
  return actions
}
