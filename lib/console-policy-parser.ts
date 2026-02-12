import { resourceMatch } from "./bucket-policy"
import { CONSOLE_SCOPES } from "./console-permissions"

export interface ConsoleStatement {
  Effect: "Allow" | "Deny"
  Action?: string[]
  NotAction?: string[]
  Resource?: string[]
}

export interface ConsolePolicy {
  Version: string
  Statement: ConsoleStatement[]
}

/**
 * Check if an action matches the policy actions
 * @param policyActions - Array of action patterns (empty array means match all)
 * @param requestAction - The action to check
 * @returns true if the action matches
 */
function matchAction(policyActions: string[] | undefined, requestAction: string): boolean {
  // Empty array or undefined means match all actions
  if (!policyActions || policyActions.length === 0) {
    return true
  }
  return policyActions.some((pattern) => resourceMatch(pattern, requestAction))
}

/**
 * Check if an action matches the NotAction patterns
 * @param notActions - Array of action patterns to exclude
 * @param requestAction - The action to check
 * @returns true if the action should be excluded
 */
function matchNotAction(notActions: string[] | undefined, requestAction: string): boolean {
  if (!notActions || notActions.length === 0) {
    return false
  }
  return notActions.some((pattern) => resourceMatch(pattern, requestAction))
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
  [CONSOLE_SCOPES.VIEW_USER_GROUPS]: ["admin:ListGroups", "admin:AddUserToGroup", "admin:GetGroup", "admin:*"],
  [CONSOLE_SCOPES.VIEW_PERFORMANCE]: ["admin:ServerInfo", "admin:OBDInfo", "admin:ServerTrace", "admin:*"],
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
  [CONSOLE_SCOPES.VIEW_BUCKET_LIFECYCLE]: ["s3:GetLifecycleConfiguration", "s3:PutLifecycleConfiguration", "s3:*"],
  [CONSOLE_SCOPES.VIEW_TIERED_STORAGE]: ["admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_EVENT_DESTINATIONS]: ["admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_SSE_SETTINGS]: ["admin:ConfigUpdate", "admin:*", "kms:*"],
  [CONSOLE_SCOPES.VIEW_LICENSE]: ["admin:ServerInfo", "admin:*"],
}

function matchResource(policyResources: string[] | undefined, requestResource: string): boolean {
  if (!policyResources || policyResources.length === 0) {
    return true
  }
  return policyResources.some((pattern) => resourceMatch(pattern, requestResource))
}

/**
 * Check if an action is a console scope (starts with "console:" or is "consoleAdmin")
 */
function isConsoleScope(action: string): boolean {
  return action.startsWith("console:") || action === CONSOLE_SCOPES.CONSOLE_ADMIN
}

export function hasConsolePermission(
  policy: ConsolePolicy | ConsoleStatement[] | undefined,
  action: string,
  resource: string = "console",
): boolean {
  if (!policy) return false

  const statements = Array.isArray(policy) ? policy : policy.Statement || []
  if (statements.length === 0) return false

  // For console scopes, we should ignore Resource restrictions if Resource doesn't match "console"
  // This allows policies with S3 resources to still grant console permissions
  const isConsoleAction = isConsoleScope(action)
  const shouldCheckResource = (s: ConsoleStatement): boolean => {
    // If action is a console scope and Resource is specified but doesn't match "console",
    // we should still allow if Action matches (console scopes are management permissions)
    if (isConsoleAction && s.Resource && s.Resource.length > 0) {
      // Check if Resource contains console-related resources
      const hasConsoleResource = s.Resource.some((r) => r === "console" || r === "*" || r.includes("console"))
      // If Resource doesn't contain console resources, skip resource check for console actions
      if (!hasConsoleResource) {
        return false
      }
    }
    return true
  }

  // Check Deny statements first
  const denied = statements.some((s) => {
    if (s.Effect !== "Deny") return false

    // If NotAction is present, deny applies to all actions EXCEPT those in NotAction
    if (s.NotAction && s.NotAction.length > 0) {
      // Deny if action is NOT in NotAction list
      if (!matchNotAction(s.NotAction, action)) {
        return shouldCheckResource(s) ? matchResource(s.Resource, resource) : true
      }
      return false
    }

    // If Action is present (or empty array), deny applies to matching actions
    if (matchAction(s.Action, action)) {
      return shouldCheckResource(s) ? matchResource(s.Resource, resource) : true
    }

    return false
  })

  if (denied) return false

  // Check Allow statements
  const allowed = statements.some((s) => {
    if (s.Effect !== "Allow") return false

    // Handle NotAction: allow all actions EXCEPT those in NotAction
    if (s.NotAction && s.NotAction.length > 0) {
      // If Action is also present, first check if action matches Action
      if (s.Action && s.Action.length > 0) {
        // Both Action and NotAction present: action must match Action AND not be in NotAction
        const actionMatches = matchAction(s.Action, action)
        const adminMatch = matchAction(s.Action, CONSOLE_SCOPES.CONSOLE_ADMIN)
        const wildcardMatch = matchAction(s.Action, "console:*")
        const adminStarMatch = matchAction(s.Action, "admin:*")

        if (!(actionMatches || adminMatch || wildcardMatch || adminStarMatch)) {
          // Check implied actions
          const impliedActions = IMPLIED_SCOPES[action]
          if (!impliedActions || !impliedActions.some((implied) => matchAction(s.Action, implied))) {
            return false // Action doesn't match Action list
          }
        }

        // Action matches Action list, now check NotAction exclusion
        if (matchNotAction(s.NotAction, action)) {
          return false // Action is excluded by NotAction
        }
      } else {
        // Only NotAction present: allow all actions except those in NotAction
        if (matchNotAction(s.NotAction, action)) {
          return false // Action is excluded
        }
      }
      // Action is allowed (matches Action if present, and not in NotAction), check resource
      return shouldCheckResource(s) ? matchResource(s.Resource, resource) : true
    }

    // Only Action is present (or empty array), allow applies to matching actions
    const actionMatch = matchAction(s.Action, action)
    const adminMatch = matchAction(s.Action, CONSOLE_SCOPES.CONSOLE_ADMIN)
    const wildcardMatch = matchAction(s.Action, "console:*")
    const adminStarMatch = matchAction(s.Action, "admin:*")

    const explicitMatch =
      actionMatch || adminMatch || wildcardMatch || adminStarMatch
        ? shouldCheckResource(s)
          ? matchResource(s.Resource, resource)
          : true
        : false
    if (explicitMatch) return true

    const impliedActions = IMPLIED_SCOPES[action]
    if (impliedActions) {
      if (impliedActions.some((implied) => matchAction(s.Action, implied))) {
        return shouldCheckResource(s) ? matchResource(s.Resource, resource) : true
      }
    }

    return false
  })

  return allowed
}

export function hasConsoleScopes(
  policy: ConsolePolicy | ConsoleStatement[] | undefined,
  scopes: string[],
  matchAll: boolean = true,
): boolean {
  if (!scopes || scopes.length === 0) return true

  if (matchAll) {
    return scopes.every((scope) => hasConsolePermission(policy, scope))
  } else {
    return scopes.some((scope) => hasConsolePermission(policy, scope))
  }
}
