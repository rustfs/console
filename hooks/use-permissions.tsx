"use client"

import { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import {
  hasConsoleScopes,
  hasConsolePermission,
  hasConsoleActionPotential,
  type ConsolePolicy,
} from "@/lib/console-policy-parser"
import {
  hasConsoleCapability,
  isForceCleanupTarget,
  capabilityCheckGroups,
  capabilityDecision,
  type CapabilityCheck,
  type ConsoleCapability,
} from "@/lib/permission-capabilities"
import {
  EffectivePermissionClient,
  type ActionPermissionCheck,
  type PermissionRequest,
  type PermissionServiceStatus,
} from "@/lib/effective-permissions"
import { permissionEndpoint } from "@/lib/permission-endpoint"
import type { PermissionResourceContext } from "@/lib/permission-resources"
import { CONSOLE_SCOPES, PAGE_PERMISSIONS } from "@/lib/console-permissions"
import { scheduleMicrotask } from "@/lib/schedule-microtask"
import { useAuth } from "@/contexts/auth-context"
import { useApiOptional } from "@/contexts/api-context"

interface PermissionsContextValue {
  userPolicy: ConsolePolicy | null
  userInfo: Record<string, unknown> | null
  isLoading: boolean
  hasResolvedAdmin: boolean
  hasFetchedPolicy: boolean
  fetchUserPolicy: () => Promise<void>
  hasPermission: (action: string | string[], matchAll?: boolean) => boolean
  canCapability: (capability: ConsoleCapability, context?: PermissionResourceContext) => boolean
  mayCapability: (capability: ConsoleCapability, context?: PermissionResourceContext) => boolean
  checkCapability: (capability: ConsoleCapability, context?: PermissionResourceContext) => Promise<boolean>
  canAction: (action: string, context?: PermissionResourceContext) => boolean
  checkAction: (action: string, context?: PermissionResourceContext) => Promise<boolean>
  loadAction: (check: ActionPermissionCheck) => Promise<void>
  registerActionChecks: (checks: ActionPermissionCheck[]) => () => void
  hasPendingChecks: (path?: string) => boolean
  permissionServiceStatus: PermissionServiceStatus
  retryPermissions: () => void
  permissionVersion: number
  canAccessPath: (path: string) => boolean
  isAdmin: boolean
  /** True when user has consoleAdmin (or is admin). Only these users can change password per RustFS backend. */
  canChangePassword: boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

function bucketRouteCheck(path: string): ActionPermissionCheck | null {
  const pathname = path.split(/[?#]/, 1)[0]
  const route = pathname.split("/")[1]
  if (!["browser", "buckets", "replication", "events", "lifecycle"].includes(route)) return null
  const params = new URLSearchParams(path.split("?")[1]?.split("#")[0])
  const scoped = pathname.match(/^\/(browser|buckets|replication|events|lifecycle)\/([^/?#]+)/)
  let bucket: string
  try {
    bucket = scoped ? decodeURIComponent(scoped[2]) : (params.get("bucket") ?? "")
  } catch {
    return null
  }
  if (!bucket) return null
  const objectPath = params.get("key") ?? ""
  if (route === "browser" && objectPath && !objectPath.endsWith("/"))
    return { action: "s3:GetObject", context: { bucket, objectKey: objectPath } }
  const action =
    route === "replication"
      ? "s3:GetReplicationConfiguration"
      : route === "events"
        ? "s3:GetBucketNotification"
        : route === "lifecycle"
          ? "s3:GetBucketLifecycle"
          : route === "buckets"
            ? "s3:GetBucketLocation"
            : "s3:ListBucket"
  return { action, context: { bucket, ...(route === "browser" && { prefix: objectPath }) } }
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const api = useApiOptional()
  const { isAdmin, isAuthenticated, credentials, setIsAdmin } = useAuth()

  const [userPolicy, setUserPolicy] = useState<ConsolePolicy | null>(null)
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasResolvedAdmin, setHasResolvedAdmin] = useState(false)
  const [hasFetchedPolicy, setHasFetchedPolicy] = useState(false)
  const requestEpochRef = useRef(0)
  const [permissionRevision, setPermissionRevision] = useState(0)
  const identityKey = JSON.stringify([
    isAuthenticated,
    credentials?.AccessKeyId,
    credentials?.SecretAccessKey,
    credentials?.SessionToken,
  ])
  const permissionClient = useMemo(() => {
    const [authenticated] = JSON.parse(identityKey) as [boolean]
    const transport =
      authenticated && api && typeof api.post === "function"
        ? (checks: PermissionRequest[]) =>
            api.post(
              permissionEndpoint(api.resolveUrl("")),
              { checks },
              { suppress403Redirect: true, suppressBodyLogging: true },
            )
        : null
    return new EffectivePermissionClient(transport, () => setPermissionRevision((revision) => revision + 1))
  }, [api, identityKey])
  const activePermissionClient = useRef(permissionClient)
  const legacyPolicy = useRef({ client: permissionClient, userPolicy, isAdmin, isOwner })
  useLayoutEffect(() => {
    activePermissionClient.current = permissionClient
    permissionClient.activate()
    return () => permissionClient.dispose()
  }, [permissionClient])
  useLayoutEffect(() => {
    legacyPolicy.current = { client: permissionClient, userPolicy, isAdmin, isOwner }
  }, [permissionClient, userPolicy, isAdmin, isOwner])

  useEffect(() => {
    requestEpochRef.current += 1
    setUserInfo(null)
    setUserPolicy(null)
    setIsOwner(false)
    setIsLoading(false)
    setHasResolvedAdmin(false)
    setHasFetchedPolicy(false)
    if (isAuthenticated) {
      setIsAdmin(false)
    }
  }, [
    api,
    credentials?.AccessKeyId,
    credentials?.SecretAccessKey,
    credentials?.SessionToken,
    isAuthenticated,
    setIsAdmin,
  ])

  const fetchAdminStatus = useCallback(async () => {
    if (!api) return
    const requestEpoch = requestEpochRef.current

    try {
      const info = (await api.get("/is-admin")) as { is_admin?: boolean }
      if (requestEpoch !== requestEpochRef.current) return
      setIsAdmin(info?.is_admin ?? false)
    } catch (e) {
      if (requestEpoch !== requestEpochRef.current) return
      console.error("Failed to resolve admin status", e)
      setIsAdmin(false)
    } finally {
      if (requestEpoch === requestEpochRef.current) setHasResolvedAdmin(true)
    }
  }, [api, setIsAdmin])

  const fetchUserPolicy = useCallback(async () => {
    if (!api) return
    const requestEpoch = requestEpochRef.current

    setIsLoading(true)
    // /is-admin includes IAM administrators; /account/info reports caller.is_owner.
    const ownerRequest = api.get("/account/info", { suppress403Redirect: true }).then(
      (info) => {
        if (requestEpoch === requestEpochRef.current) setIsOwner((info as { is_admin?: unknown })?.is_admin === true)
      },
      () => {
        if (requestEpoch === requestEpochRef.current) setIsOwner(false)
      },
    )
    try {
      const info = (await api.get("/accountinfo")) as Record<string, unknown>
      if (requestEpoch !== requestEpochRef.current) return
      setUserInfo(info)
      const policyStr = info?.policy as string
      if (policyStr) {
        setUserPolicy(JSON.parse(policyStr) as ConsolePolicy)
      } else {
        setUserPolicy(null)
      }
      permissionClient.invalidate()
    } catch (e) {
      if (requestEpoch !== requestEpochRef.current) return
      console.error("Failed to fetch user policy", e)
      setUserPolicy(null)
    } finally {
      if (requestEpoch === requestEpochRef.current) {
        setIsLoading(false)
        setHasFetchedPolicy(true)
      }
    }
    await ownerRequest
  }, [api, permissionClient])

  const loadAction = useCallback(
    async (check: ActionPermissionCheck) => {
      await permissionClient.load(check)
    },
    [permissionClient],
  )
  const registerActionChecks = useCallback(
    (checks: ActionPermissionCheck[]) => {
      const release = permissionClient.pin(checks)
      for (const check of checks) void permissionClient.load(check)
      return release
    },
    [permissionClient],
  )

  const hasPendingChecks = useCallback(
    (path?: string) => {
      const check = path ? bucketRouteCheck(path) : null
      if (!path) return permissionClient.hasPending()
      if (!check) return false
      const upload =
        check.action === "s3:ListBucket"
          ? { action: "s3:PutObject", context: { bucket: check.context?.bucket, authType: "REST-HEADER" as const } }
          : null
      return permissionClient.hasPending(check) || Boolean(upload && permissionClient.hasPending(upload))
    },
    [permissionClient],
  )
  const retryPermissions = useCallback(() => permissionClient.invalidate(), [permissionClient])

  const legacyAction = useCallback(
    (action: string, context: PermissionResourceContext = {}) => {
      if (activePermissionClient.current !== permissionClient) return false
      const snapshot = legacyPolicy.current
      if (snapshot.client !== permissionClient) return false
      if (snapshot.isAdmin) return true
      const resource = context.keyId
        ? context.keyId
        : context.bucket
          ? `arn:aws:s3:::${context.bucket}${context.objectKey === undefined ? "" : `/${context.objectKey}`}`
          : "*"
      return hasConsolePermission(snapshot.userPolicy ?? undefined, action, resource)
    },
    [permissionClient],
  )

  const canAction = useCallback(
    (action: string, context: PermissionResourceContext = {}) => {
      const check = { action, context }
      // Registration is deduplicated and deferred; no React state is changed during rendering.
      void permissionClient.load(check)
      if (permissionClient.status === "unsupported") {
        if (!isAuthenticated) return false
        if (isAdmin) return true
        const resource =
          context.keyId ??
          (context.bucket
            ? `arn:aws:s3:::${context.bucket}${context.objectKey === undefined ? "" : `/${context.objectKey}`}`
            : "*")
        return hasConsolePermission(userPolicy ?? undefined, action, resource)
      }
      return permissionClient.peek(check)?.decision === "allowed"
    },
    [isAuthenticated, isAdmin, userPolicy, permissionClient],
  )

  const checkAction = useCallback(
    async (action: string, context: PermissionResourceContext = {}) => {
      if (activePermissionClient.current !== permissionClient) return false
      const result = await permissionClient.load({ action, context }, true)
      if (activePermissionClient.current !== permissionClient) return false
      return permissionClient.status === "unsupported" ? legacyAction(action, context) : result.decision === "allowed"
    },
    [legacyAction, permissionClient],
  )

  const hasPermission = useCallback(
    (action: string | string[], matchAll: boolean = true) => {
      const actions = Array.isArray(action) ? action : [action]
      const allowed = (item: string) =>
        item.startsWith("console:") || item === CONSOLE_SCOPES.CONSOLE_ADMIN
          ? isAdmin || hasConsoleScopes(userPolicy ?? undefined, [item])
          : canAction(item)
      return matchAll ? actions.every(allowed) : actions.some(allowed)
    },
    [isAdmin, userPolicy, canAction],
  )

  const canCapability = useCallback(
    (capability: ConsoleCapability, context: PermissionResourceContext = {}) => {
      if (capability === "objects.forceCleanup" && !isForceCleanupTarget(context)) return false
      const groups = capabilityCheckGroups(capability, context)
      for (const { checks } of groups) for (const check of checks) void permissionClient.load(check)
      if (permissionClient.status === "unsupported") {
        if (capability === "objects.forceCleanup")
          return isOwner || hasConsoleCapability(userPolicy, capability, context)
        return isAdmin || hasConsoleCapability(userPolicy, capability, context)
      }
      return capabilityDecision(groups, (check) => permissionClient.peek(check)) === "allowed"
    },
    [isAdmin, isOwner, userPolicy, permissionClient],
  )

  const mayCapability = useCallback(
    (capability: ConsoleCapability, context: PermissionResourceContext = {}) => {
      if (capability === "objects.forceCleanup" && !isForceCleanupTarget(context)) return false
      const groups = capabilityCheckGroups(capability, context)
      for (const { checks } of groups) for (const check of checks) void permissionClient.load(check)
      if (permissionClient.status === "unsupported")
        return (
          isAdmin ||
          groups.every(({ checks, mode }) =>
            mode === "any"
              ? checks.some(({ action }) => hasConsoleActionPotential(userPolicy, action))
              : checks.every(({ action }) => hasConsoleActionPotential(userPolicy, action)),
          )
        )
      return groups.every(({ checks, mode }) => {
        const possible = (check: ActionPermissionCheck) => {
          const result = permissionClient.peek(check)
          return result?.decision === "allowed" || (result?.decision === "unknown" && result.potential === true)
        }
        return mode === "any" ? checks.some(possible) : checks.every(possible)
      })
    },
    [isAdmin, userPolicy, permissionClient],
  )

  const checkCapability = useCallback(
    async (capability: ConsoleCapability, context: PermissionResourceContext = {}) => {
      if (activePermissionClient.current !== permissionClient) return false
      if (capability === "objects.forceCleanup" && !isForceCleanupTarget(context)) return false
      const groups = capabilityCheckGroups(capability, context)
      const checks = groups.flatMap((group) => group.checks)
      const results = await Promise.all(checks.map((check) => permissionClient.load(check, true)))
      if (activePermissionClient.current !== permissionClient) return false
      if (permissionClient.status === "unsupported") {
        const snapshot = legacyPolicy.current
        if (snapshot.client !== permissionClient) return false
        if (capability === "objects.forceCleanup")
          return snapshot.isOwner || hasConsoleCapability(snapshot.userPolicy, capability, context)
        return snapshot.isAdmin || hasConsoleCapability(snapshot.userPolicy, capability, context)
      }
      const byCheck = new Map(checks.map((check, index) => [JSON.stringify(check), results[index]]))
      return capabilityDecision(groups, (check) => byCheck.get(JSON.stringify(check))) === "allowed"
    },
    [permissionClient],
  )

  const canAccessPath = useCallback(
    (path: string) => {
      if (isAdmin) return true

      const pathname = path.split(/[?#]/, 1)[0]

      let requiredScopes = PAGE_PERMISSIONS[pathname]
      if (!requiredScopes) {
        const match = Object.keys(PAGE_PERMISSIONS).find((key) => pathname.startsWith(key))
        if (match) {
          requiredScopes = PAGE_PERMISSIONS[match]
        }
      }

      if (!requiredScopes) return true

      if (hasPermission(requiredScopes)) return true
      if (permissionClient.status === "unsupported") return false
      // Bucket-policy-only callers may have no matching identity-policy scope.
      // Query the bucket from the route rather than treating a global wildcard as a resource.
      const check = bucketRouteCheck(path)
      if (!check) return false
      const readable = canAction(check.action, check.context)
      const writable =
        check.action === "s3:ListBucket" && mayCapability("objects.upload", { bucket: check.context?.bucket })
      return readable || writable
    },
    [isAdmin, hasPermission, permissionClient, canAction, mayCapability],
  )

  useEffect(() => {
    let cancelled = false
    if (api && isAuthenticated && !hasResolvedAdmin) {
      scheduleMicrotask(() => {
        if (!cancelled) void fetchAdminStatus()
      })
    }

    return () => {
      cancelled = true
    }
  }, [api, isAuthenticated, hasResolvedAdmin, fetchAdminStatus])

  useEffect(() => {
    if (api && isAuthenticated && hasResolvedAdmin && !hasFetchedPolicy && !isLoading) {
      fetchUserPolicy()
    }
  }, [api, isAuthenticated, hasResolvedAdmin, hasFetchedPolicy, isLoading, fetchUserPolicy])

  const canChangePassword = isAdmin || hasPermission(CONSOLE_SCOPES.CONSOLE_ADMIN)

  const value = useMemo(
    () => ({
      userPolicy,
      userInfo,
      isLoading,
      hasResolvedAdmin,
      hasFetchedPolicy,
      fetchUserPolicy,
      hasPermission,
      canCapability,
      mayCapability,
      checkCapability,
      canAction,
      checkAction,
      loadAction,
      registerActionChecks,
      hasPendingChecks,
      permissionServiceStatus: permissionClient.status,
      retryPermissions,
      permissionVersion: permissionRevision,
      canAccessPath,
      isAdmin,
      canChangePassword,
    }),
    [
      userPolicy,
      userInfo,
      isLoading,
      hasResolvedAdmin,
      hasFetchedPolicy,
      fetchUserPolicy,
      hasPermission,
      canCapability,
      mayCapability,
      checkCapability,
      canAction,
      checkAction,
      loadAction,
      registerActionChecks,
      hasPendingChecks,
      retryPermissions,
      permissionRevision,
      permissionClient.status,
      canAccessPath,
      isAdmin,
      canChangePassword,
    ],
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function useActionChecks(checks: ActionPermissionCheck[]): void {
  const { registerActionChecks } = usePermissions()
  const serialized = JSON.stringify(checks)
  useEffect(() => {
    const entries = JSON.parse(serialized) as ActionPermissionCheck[]
    return registerActionChecks(entries)
  }, [registerActionChecks, serialized])
}

export function useCapabilityChecks(checks: CapabilityCheck[]): void {
  const actions = checks.flatMap(({ capability, context }) =>
    capabilityCheckGroups(capability, context).flatMap((group) => group.checks),
  )
  useActionChecks(actions)
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider")
  }
  return ctx
}
