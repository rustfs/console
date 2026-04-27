import { resourceMatch } from "./bucket-policy"
import { CONSOLE_SCOPES } from "./console-permissions"

export interface ConsoleStatement {
  Effect: "Allow" | "Deny"
  Action?: string[]
  NotAction?: string[]
  Resource?: string[]
  NotResource?: string[]
}

export interface ConsolePolicy {
  Version: string
  Statement: ConsoleStatement[]
}

/**
 * Check if an action matches the policy actions
 * RustFS policy parser treats bare "*" as S3 wildcard only, not a cross-service wildcard.
 * Some action names in the console still need to understand a few backend aliases.
 * @param requestAction - The action to check
 * @returns true if the action matches
 */
const ACTION_ALIASES: Record<string, string> = {
  "*": "s3:*",
  "s3:GetLifecycleConfiguration": "s3:GetBucketLifecycle",
  "s3:GetBucketLifecycleConfiguration": "s3:GetBucketLifecycle",
  "s3:PutLifecycleConfiguration": "s3:PutBucketLifecycle",
  "s3:PutBucketLifecycleConfiguration": "s3:PutBucketLifecycle",
  "s3:DeleteBucketLifecycle": "s3:PutBucketLifecycle",
  "s3:DeleteBucketTagging": "s3:PutBucketTagging",
  "s3:DeleteBucketReplication": "s3:PutReplicationConfiguration",
}

function normalizeAction(action: string): string {
  return ACTION_ALIASES[action] ?? action
}

function isAdminAction(action: string): boolean {
  return normalizeAction(action).startsWith("admin:")
}

function matchAction(policyActions: string[] | undefined, requestAction: string): boolean {
  // Undefined or empty means no match.
  if (!policyActions || policyActions.length === 0) {
    return false
  }

  const normalizedRequestAction = normalizeAction(requestAction)
  return policyActions.some((pattern) => resourceMatch(normalizeAction(pattern), normalizedRequestAction))
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

  const normalizedRequestAction = normalizeAction(requestAction)
  return notActions.some((pattern) => resourceMatch(normalizeAction(pattern), normalizedRequestAction))
}

const IMPLIED_SCOPES: Record<string, string[]> = {
  [CONSOLE_SCOPES.VIEW_BROWSER]: [
    "s3:ListAllMyBuckets",
    "s3:ListBucket",
    "s3:GetBucketLocation",
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject",
    "s3:GetObjectTagging",
    "s3:PutObjectTagging",
    "s3:DeleteObjectTagging",
    "s3:GetBucketTagging",
    "s3:PutBucketTagging",
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
  [CONSOLE_SCOPES.VIEW_SITE_REPLICATION]: [
    "admin:SiteReplicationInfo",
    "admin:SiteReplicationAdd",
    "admin:SiteReplicationRemove",
    "admin:SiteReplicationResync",
    "admin:SiteReplicationOperation",
    "admin:*",
  ],
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
  [CONSOLE_SCOPES.VIEW_BUCKET_LIFECYCLE]: ["s3:GetBucketLifecycle", "s3:PutBucketLifecycle", "s3:*"],
  [CONSOLE_SCOPES.VIEW_TIERED_STORAGE]: ["admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_EVENT_DESTINATIONS]: ["admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_SSE_SETTINGS]: ["admin:ConfigUpdate", "admin:*", "kms:*"],
  [CONSOLE_SCOPES.VIEW_OIDC_SETTINGS]: ["admin:ServerInfo", "admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_SETTINGS]: ["admin:ServerInfo", "admin:ConfigUpdate", "admin:*"],
  [CONSOLE_SCOPES.VIEW_LICENSE]: ["admin:ServerInfo", "admin:*"],
}

function isConsoleResource(resource: string): boolean {
  return resource === "console" || resource === "*" || resource.includes("console")
}

function shouldIgnoreConsoleResourceCheck(statement: ConsoleStatement, action: string): boolean {
  if (!isConsoleScope(action)) {
    return false
  }

  const statementResources = [...(statement.Resource ?? []), ...(statement.NotResource ?? [])]
  return statementResources.length > 0 && !statementResources.some(isConsoleResource)
}

function matchStatementResource(statement: ConsoleStatement, requestResource: string, action: string): boolean {
  if (isAdminAction(action)) {
    return true
  }

  if (shouldIgnoreConsoleResourceCheck(statement, action)) {
    return true
  }

  const resourceMatched =
    !statement.Resource || statement.Resource.length === 0
      ? true
      : statement.Resource.some((pattern) => resourceMatch(pattern, requestResource))

  if (!resourceMatched) {
    return false
  }

  const notResourceMatched =
    !!statement.NotResource &&
    statement.NotResource.length > 0 &&
    statement.NotResource.some((pattern) => resourceMatch(pattern, requestResource))

  return !notResourceMatched
}

function matchesRequestedAction(policyActions: string[] | undefined, action: string): boolean {
  if (matchAction(policyActions, action)) {
    return true
  }

  if (!isConsoleScope(action)) {
    return false
  }

  if (
    matchAction(policyActions, CONSOLE_SCOPES.CONSOLE_ADMIN) ||
    matchAction(policyActions, "console:*") ||
    matchAction(policyActions, "admin:*")
  ) {
    return true
  }

  const impliedActions = IMPLIED_SCOPES[action]
  return !!impliedActions && impliedActions.some((implied) => matchAction(policyActions, implied))
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

  // Check Deny statements first
  const denied = statements.some((s) => {
    if (s.Effect !== "Deny") return false

    // If NotAction is present, deny applies to all actions EXCEPT those in NotAction
    if (s.NotAction && s.NotAction.length > 0) {
      // Deny if action is NOT in NotAction list
      if (!matchNotAction(s.NotAction, action)) {
        return matchStatementResource(s, resource, action)
      }
      return false
    }

    // If Action is present (or empty array), deny applies to matching actions
    if (matchesRequestedAction(s.Action, action)) {
      return matchStatementResource(s, resource, action)
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
        if (!matchesRequestedAction(s.Action, action)) {
          return false // Action doesn't match Action list
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
      return matchStatementResource(s, resource, action)
    }

    // Only Action is present (or empty array), allow applies to matching actions
    const explicitMatch = matchesRequestedAction(s.Action, action) ? matchStatementResource(s, resource, action) : false
    if (explicitMatch) return true

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
