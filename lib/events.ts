/**
 * Events (bucket notifications) shared types, constants and helpers.
 */

export interface NotificationItem {
  id: string
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
  Lambda:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  SQS: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  SNS:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  Topic:
    "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100",
}

export function getDisplayEvents(events: string[]): string[] {
  return [...new Set(events.map((e) => EVENT_DISPLAY_MAP[e] ?? e))]
}
