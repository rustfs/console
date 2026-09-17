/**
 * Events (bucket notifications) shared types, constants and helpers.
 */

export interface NotificationItem {
  id: string
  sourceId?: string
  type: "Lambda" | "SQS" | "SNS" | "Topic"
  arn: string
  events: string[]
  prefix?: string
  suffix?: string
  filterRules?: Array<{ Name: string; Value: string }>
}

export const EVENT_DISPLAY_MAP: Record<string, string> = {
  "s3:ObjectCreated:*": "PUT",
  "s3:ObjectAccessed:*": "GET",
  "s3:ObjectRemoved:*": "DELETE",
  "s3:Replication:*": "REPLICA",
  "s3:ObjectRestore:*": "RESTORE",
  "s3:ObjectTransition:*": "RESTORE",
  "s3:Scanner:ManyVersions": "SCANNER",
  "s3:Scanner:BigPrefix": "SCANNER",
}

export const TYPE_BADGE_CLASSES: Record<NotificationItem["type"], string> = {
  Lambda: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  SQS: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  SNS: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  Topic: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100",
}

export function getDisplayEvents(events: string[]): string[] {
  return [...new Set(events.map((e) => EVENT_DISPLAY_MAP[e] ?? e))]
}

/** Event options offered when adding or editing a subscription. */
export const EVENT_OPTIONS = [
  { value: "PUT", labelKey: "PUT - Object upload" },
  { value: "GET", labelKey: "GET - Object access" },
  { value: "DELETE", labelKey: "DELETE - Object deletion" },
  { value: "REPLICA", labelKey: "REPLICA - Object migration" },
  { value: "RESTORE", labelKey: "ILM - Object converted" },
  {
    value: "SCANNER",
    labelKey: "SCANNER - Object has too many versions/prefix has too many subfolders",
  },
] as const

/** S3 event names stored in the bucket notification configuration for each event option. */
export const EVENT_MAPPING: Record<string, string[]> = {
  PUT: ["s3:ObjectCreated:*"],
  GET: ["s3:ObjectAccessed:*"],
  DELETE: ["s3:ObjectRemoved:*"],
  REPLICA: ["s3:Replication:*"],
  RESTORE: ["s3:ObjectRestore:*", "s3:ObjectTransition:*"],
  SCANNER: ["s3:Scanner:ManyVersions", "s3:Scanner:BigPrefix"],
}

export const NOTIFICATION_CONFIG_KEYS = [
  "LambdaFunctionConfigurations",
  "QueueConfigurations",
  "TopicConfigurations",
] as const

export type NotificationConfigKey = (typeof NOTIFICATION_CONFIG_KEYS)[number]

export interface NotificationRuleConfig {
  Id?: string
  LambdaFunctionArn?: string
  QueueArn?: string
  TopicArn?: string
  Events?: string[]
  Filter?: { Key?: { FilterRules?: Array<{ Name: string; Value: string }> } }
}

const ARN_FIELD_BY_TYPE: Record<NotificationItem["type"], "LambdaFunctionArn" | "QueueArn" | "TopicArn"> = {
  Lambda: "LambdaFunctionArn",
  SQS: "QueueArn",
  SNS: "TopicArn",
  Topic: "TopicArn",
}

export function getNotificationType(arn: string): NotificationItem["type"] {
  if (arn.includes(":lambda:")) return "Lambda"
  if (arn.includes(":sqs:")) return "SQS"
  return "Topic"
}

export function getNotificationConfigKey(type: NotificationItem["type"]): NotificationConfigKey {
  if (type === "Lambda") return "LambdaFunctionConfigurations"
  if (type === "SQS") return "QueueConfigurations"
  return "TopicConfigurations"
}

/** Converts form selections into the S3 event names sent to the server. */
export function toS3Events(selection: string[]): string[] {
  return [...new Set(selection.flatMap((value) => EVENT_MAPPING[value] ?? [value]))]
}

/** Converts stored S3 event names back into form selections, keeping unrecognised events as-is. */
export function getEventSelection(events: string[]): string[] {
  const selection: string[] = []
  for (const event of events) {
    const value = Object.keys(EVENT_MAPPING).find((option) => EVENT_MAPPING[option].includes(event)) ?? event
    if (!selection.includes(value)) selection.push(value)
  }
  return selection
}

/**
 * Replaces a single rule inside a bucket notification configuration, keeping the
 * rest of the configuration untouched. Returns null when the target rule cannot
 * be resolved unambiguously, so callers can ask the user to refresh.
 */
export function updateNotificationRule(
  current: Record<string, unknown>,
  subscription: NotificationItem,
  changes: { arn: string; events: string[]; filterRules: Array<{ Name: string; Value: string }> },
): Record<string, unknown> | null {
  if (!subscription.sourceId) return null

  const sourceKey = getNotificationConfigKey(subscription.type)
  const sourceRules = (current[sourceKey] as NotificationRuleConfig[] | undefined) ?? []
  const existing = sourceRules.find((rule) => rule.Id === subscription.sourceId)
  if (!existing || sourceRules.filter((rule) => rule.Id === subscription.sourceId).length !== 1) return null

  const destinationType = getNotificationType(changes.arn)
  const destinationKey = getNotificationConfigKey(destinationType)
  const updated: NotificationRuleConfig = { ...existing, Events: changes.events }
  delete updated.LambdaFunctionArn
  delete updated.QueueArn
  delete updated.TopicArn
  delete updated.Filter
  updated[ARN_FIELD_BY_TYPE[destinationType]] = changes.arn
  if (changes.filterRules.length) {
    updated.Filter = { Key: { FilterRules: changes.filterRules } }
  }

  const remaining = sourceRules.filter((rule) => rule.Id !== subscription.sourceId)

  if (destinationKey === sourceKey) {
    return { ...current, [sourceKey]: [...remaining, updated] }
  }

  const destinationRules = (current[destinationKey] as NotificationRuleConfig[] | undefined) ?? []
  return { ...current, [sourceKey]: remaining, [destinationKey]: [...destinationRules, updated] }
}
