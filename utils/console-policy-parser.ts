
import { resourceMatch } from './bucket-policy'
import { CONSOLE_SCOPES } from './console-permissions'

export interface ConsoleStatement {
  Effect: 'Allow' | 'Deny'
  Action: string[]
  Resource?: string[]
}

export interface ConsolePolicy {
  Version: string
  Statement: ConsoleStatement[]
}

/**
 * Helper to match action against patterns (supports wildcards)
 */
function matchAction(policyActions: string[], requestAction: string): boolean {
  return policyActions.some(pattern => resourceMatch(pattern, requestAction))
}

/**
 * Helper to match resource against patterns (supports wildcards)
 */
function matchResource(policyResources: string[] | undefined, requestResource: string): boolean {
  if (!policyResources || policyResources.length === 0) {
    // If no resource is specified, we assume it matches (or strictly it should be invalid, but for console actions often resource is implied)
    // However, safest is to require resource match if resources are present.
    // Let's assume '*' if undefined for console actions flexibility, or stricter?
    // AWS IAM requires Resource. Let's assume if undefined, it doesn't match unless the action is special.
    // But for simplicity in this project, if Resource is missing in statement, maybe we ignore resource check?
    // Let's stick to: if provided in policy, must match. If not provided, match.
    return true
  }
  return policyResources.some(pattern => resourceMatch(pattern, requestResource))
}

/**
 * Check if the policy allows the given action on the given resource.
 * @param policy The user's policy (merged statements)
 * @param action The action to check (e.g. 'console:Browser')
 * @param resource The resource to check (default 'console')
 */
export function hasConsolePermission(
  policy: ConsolePolicy | ConsoleStatement[] | undefined,
  action: string,
  resource: string = 'console'
): boolean {
  if (!policy) return false
  
  const statements = Array.isArray(policy) ? policy : policy.Statement || []
  if (statements.length === 0) return false

  // 1. Check for specific Deny
  const denied = statements.some(s =>
    s.Effect === 'Deny' &&
    matchAction(s.Action, action) &&
    matchResource(s.Resource, resource)
  )

  if (denied) return false

  // 2. Check for Allow
  // Special case: if action is consoleAdmin (in policy), it grants everything?
  // The user said: "if user's policy contains consoleAdmin... means user has all console permissions"
  // This likely means if they have 'consoleAdmin' action ALLOWED, they get everything.
  // But we are checking for a specific action (e.g. 'console:Browser').
  // So we should check if the policy allows 'console:Browser' OR 'consoleAdmin' OR 'console:*'.
  
  // We check if ANY allow statement matches the requested action OR 'consoleAdmin' (if that's considered a super-permission)
  const allowed = statements.some(s => {
    if (s.Effect !== 'Allow') return false
    
    // Check if statement allows the specific action
    const actionMatch = matchAction(s.Action, action)
    
    // Check if statement allows consoleAdmin (superuser for console)
    const adminMatch = matchAction(s.Action, CONSOLE_SCOPES.CONSOLE_ADMIN)
    
    // Check if statement allows console:* (common pattern)
    const wildcardMatch = matchAction(s.Action, 'console:*')

    return (actionMatch || adminMatch || wildcardMatch) && matchResource(s.Resource, resource)
  })

  return allowed
}

/**
 * Check if user has ALL of the required scopes
 */
export function hasConsoleScopes(
  policy: ConsolePolicy | ConsoleStatement[] | undefined,
  scopes: string[],
  matchAll: boolean = true
): boolean {
  if (!scopes || scopes.length === 0) return true
  
  if (matchAll) {
    return scopes.every(scope => hasConsolePermission(policy, scope))
  } else {
    return scopes.some(scope => hasConsolePermission(policy, scope))
  }
}
