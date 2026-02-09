export type ConsoleScope = string

export const CONSOLE_SCOPES = {
  CONSOLE_ADMIN: "consoleAdmin",
  VIEW_BROWSER: "console:Browser",
  VIEW_ACCESS_KEYS: "console:AccessKeys",
  VIEW_POLICIES: "console:Policies",
  VIEW_USERS: "console:Users",
  VIEW_USER_GROUPS: "console:UserGroups",
  VIEW_IMPORT_EXPORT: "console:ImportExport",
  VIEW_PERFORMANCE: "console:Performance",
  VIEW_BUCKET_EVENTS: "console:BucketEvents",
  VIEW_BUCKET_REPLICATION: "console:BucketReplication",
  VIEW_BUCKET_LIFECYCLE: "console:BucketLifecycle",
  VIEW_TIERED_STORAGE: "console:TieredStorage",
  VIEW_EVENT_DESTINATIONS: "console:EventDestinations",
  VIEW_SSE_SETTINGS: "console:SSESettings",
  VIEW_LICENSE: "console:License",
} as const

export const PAGE_PERMISSIONS: Record<string, ConsoleScope[]> = {
  "/browser": [CONSOLE_SCOPES.VIEW_BROWSER],
  "/buckets": [CONSOLE_SCOPES.VIEW_BROWSER],
  "/access-keys": [CONSOLE_SCOPES.VIEW_ACCESS_KEYS],
  "/policies": [CONSOLE_SCOPES.VIEW_POLICIES],
  "/users": [CONSOLE_SCOPES.VIEW_USERS],
  "/user-groups": [CONSOLE_SCOPES.VIEW_USER_GROUPS],
  "/import-export": [CONSOLE_SCOPES.VIEW_IMPORT_EXPORT],
  "/status": [CONSOLE_SCOPES.VIEW_PERFORMANCE],
  "/events": [CONSOLE_SCOPES.VIEW_BUCKET_EVENTS],
  "/replication": [CONSOLE_SCOPES.VIEW_BUCKET_REPLICATION],
  "/lifecycle": [CONSOLE_SCOPES.VIEW_BUCKET_LIFECYCLE],
  "/tiers": [CONSOLE_SCOPES.VIEW_TIERED_STORAGE],
  "/events-target": [CONSOLE_SCOPES.VIEW_EVENT_DESTINATIONS],
  "/sse": [CONSOLE_SCOPES.VIEW_SSE_SETTINGS],
  "/license": [CONSOLE_SCOPES.VIEW_LICENSE],
}
