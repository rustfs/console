import { resourceMatch } from "./bucket-policy"
import { CONSOLE_SCOPES } from "./console-permissions"

export interface ConsoleStatement {
  Effect: "Allow" | "Deny"
  Action: string[]
  Resource?: string[]
}

export interface ConsolePolicy {
  Version: string
  Statement: ConsoleStatement[]
}

function matchAction(policyActions: string[], requestAction: string): boolean {
  return policyActions.some((pattern) =>
    resourceMatch(pattern, requestAction)
  )
}

const IMPLIED_SCOPES: Record<string, string[]> = {
  [CONSOLE_SCOPES.VIEW_BROWSER]: [
    "s3:ListAllMyBuckets",
    "s3:ListBucket",
    "s3:GetBucketLocation",
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject",
    "s3:ListObjects",
    "s3:GetObjectTagging",
    "s3:PutObjectTagging",
    "s3:DeleteObjectTagging",
    "s3:GetBucketTagging",
    "s3:PutBucketTagging",
    "s3:DeleteBucketTagging",
    "s3:GetBucketPolicy",
    "s3:PutBucketPolicy",
    "s3:DeleteBucketPolicy",
    "s3:*",
  ],
  [CONSOLE_SCOPES.VIEW_ACCESS_KEYS]: [
    "admin:ListServiceAccounts",
    "admin:CreateServiceAccount",
    "admin:UpdateServiceAccount",
    "admin:RemoveServiceAccount",
    "admin:*",
  ],
  [CONSOLE_SCOPES.VIEW_POLICIES]: [
    "admin:ListUserPolicies",
    "admin:CreatePolicy",
    "admin:DeletePolicy",
    "admin:GetPolicy",
    "admin:*",
  ],
  [CONSOLE_SCOPES.VIEW_USERS]: [
    "admin:ListUsers",
    "admin:CreateUser",
    "admin:GetUser",
    "admin:EnableUser",
    "admin:DisableUser",
    "admin:DeleteUser",
    "admin:*",
  ],
  [CONSOLE_SCOPES.VIEW_USER_GROUPS]: [
    "admin:ListGroups",
    "admin:AddUserToGroup",
    "admin:GetGroup",
    "admin:*",
  ],
  [CONSOLE_SCOPES.VIEW_PERFORMANCE]: [
    "admin:ServerInfo",
    "admin:OBDInfo",
    "admin:ServerTrace",
    "admin:*",
  ],
  [CONSOLE_SCOPES.VIEW_IMPORT_EXPORT]: ["admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_BUCKET_EVENTS]: [
    "s3:GetBucketNotification",
    "s3:PutBucketNotification",
    "s3:ListenNotification",
    "s3:ListenBucketNotification",
    "s3:*",
  ],
  [CONSOLE_SCOPES.VIEW_BUCKET_REPLICATION]: [
    "s3:GetReplicationConfiguration",
    "s3:PutReplicationConfiguration",
    "s3:*",
  ],
  [CONSOLE_SCOPES.VIEW_BUCKET_LIFECYCLE]: [
    "s3:GetLifecycleConfiguration",
    "s3:PutLifecycleConfiguration",
    "s3:*",
  ],
  [CONSOLE_SCOPES.VIEW_TIERED_STORAGE]: ["admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_EVENT_DESTINATIONS]: ["admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_SSE_SETTINGS]: [
    "admin:ConfigUpdate",
    "admin:*",
    "kms:*",
  ],
  [CONSOLE_SCOPES.VIEW_LICENSE]: ["admin:ServerInfo", "admin:*"],
}

function matchResource(
  policyResources: string[] | undefined,
  requestResource: string
): boolean {
  if (!policyResources || policyResources.length === 0) {
    return true
  }
  return policyResources.some((pattern) =>
    resourceMatch(pattern, requestResource)
  )
}

export function hasConsolePermission(
  policy: ConsolePolicy | ConsoleStatement[] | undefined,
  action: string,
  resource: string = "console"
): boolean {
  if (!policy) return false

  const statements = Array.isArray(policy) ? policy : policy.Statement || []
  if (statements.length === 0) return false

  const denied = statements.some(
    (s) =>
      s.Effect === "Deny" &&
      matchAction(s.Action, action) &&
      matchResource(s.Resource, resource)
  )

  if (denied) return false

  const allowed = statements.some((s) => {
    if (s.Effect !== "Allow") return false

    const actionMatch = matchAction(s.Action, action)
    const adminMatch = matchAction(s.Action, CONSOLE_SCOPES.CONSOLE_ADMIN)
    const wildcardMatch = matchAction(s.Action, "console:*")
    const adminStarMatch = matchAction(s.Action, "admin:*")

    const explicitMatch =
      (actionMatch ||
        adminMatch ||
        wildcardMatch ||
        adminStarMatch) &&
      matchResource(s.Resource, resource)
    if (explicitMatch) return true

    const impliedActions = IMPLIED_SCOPES[action]
    if (impliedActions) {
      if (impliedActions.some((implied) => matchAction(s.Action, implied))) {
        return true
      }
    }

    return false
  })

  return allowed
}

export function hasConsoleScopes(
  policy: ConsolePolicy | ConsoleStatement[] | undefined,
  scopes: string[],
  matchAll: boolean = true
): boolean {
  if (!scopes || scopes.length === 0) return true

  if (matchAll) {
    return scopes.every((scope) => hasConsolePermission(policy, scope))
  } else {
    return scopes.some((scope) => hasConsolePermission(policy, scope))
  }
}
