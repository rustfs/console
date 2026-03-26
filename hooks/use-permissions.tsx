"use client"

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import { hasConsoleScopes, type ConsolePolicy } from "@/lib/console-policy-parser"
import { hasConsoleCapability, type ConsoleCapability } from "@/lib/permission-capabilities"
import type { PermissionResourceContext } from "@/lib/permission-resources"
import { CONSOLE_SCOPES, PAGE_PERMISSIONS } from "@/lib/console-permissions"
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
  canAccessPath: (path: string) => boolean
  isAdmin: boolean
  /** True when user has consoleAdmin (or is admin). Only these users can change password per RustFS backend. */
  canChangePassword: boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const api = useApiOptional()
  const { isAdmin, isAuthenticated, credentials, setIsAdmin } = useAuth()

  const [userPolicy, setUserPolicy] = useState<ConsolePolicy | null>(null)
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasResolvedAdmin, setHasResolvedAdmin] = useState(false)
  const [hasFetchedPolicy, setHasFetchedPolicy] = useState(false)

  useEffect(() => {
    setUserInfo(null)
    setUserPolicy(null)
    setHasResolvedAdmin(false)
    setHasFetchedPolicy(false)
    if (isAuthenticated) {
      setIsAdmin(false)
    }
  }, [credentials?.AccessKeyId, credentials?.SessionToken, isAuthenticated, setIsAdmin])

  const fetchAdminStatus = useCallback(async () => {
    if (!api) return

    try {
      const info = (await api.get("/is-admin")) as { is_admin?: boolean }
      setIsAdmin(info?.is_admin ?? false)
    } catch (e) {
      console.error("Failed to resolve admin status", e)
      setIsAdmin(false)
    } finally {
      setHasResolvedAdmin(true)
    }
  }, [api, setIsAdmin])

  const fetchUserPolicy = useCallback(async () => {
    if (!api) return

    setIsLoading(true)
    try {
      const info = (await api.get("/accountinfo")) as Record<string, unknown>
      setUserInfo(info)
      const policyStr = info?.policy as string
      if (policyStr) {
        setUserPolicy(JSON.parse(policyStr) as ConsolePolicy)
      } else {
        setUserPolicy(null)
      }
    } catch (e) {
      console.error("Failed to fetch user policy", e)
      setUserPolicy(null)
    } finally {
      setIsLoading(false)
      setHasFetchedPolicy(true)
    }
  }, [api])

  const hasPermission = useCallback(
    (action: string | string[], matchAll: boolean = true) => {
      if (isAdmin) return true
      if (!userPolicy) return false

      const actions = Array.isArray(action) ? action : [action]
      return hasConsoleScopes(userPolicy, actions, matchAll)
    },
    [isAdmin, userPolicy],
  )

  const canCapability = useCallback(
    (capability: ConsoleCapability, context: PermissionResourceContext = {}) => {
      if (isAdmin) return true
      return hasConsoleCapability(userPolicy, capability, context)
    },
    [isAdmin, userPolicy],
  )

  const canAccessPath = useCallback(
    (path: string) => {
      if (isAdmin) return true

      let requiredScopes = PAGE_PERMISSIONS[path]
      if (!requiredScopes) {
        const match = Object.keys(PAGE_PERMISSIONS).find((key) => path.startsWith(key))
        if (match) {
          requiredScopes = PAGE_PERMISSIONS[match]
        }
      }

      if (!requiredScopes) return true

      return hasPermission(requiredScopes)
    },
    [isAdmin, hasPermission],
  )

  useEffect(() => {
    if (api && isAuthenticated && !hasResolvedAdmin) {
      void fetchAdminStatus()
    }
  }, [api, isAuthenticated, hasResolvedAdmin, fetchAdminStatus])

  useEffect(() => {
    if (api && isAuthenticated && hasResolvedAdmin && !isAdmin && !hasFetchedPolicy && !isLoading) {
      fetchUserPolicy()
    }
  }, [api, isAuthenticated, hasResolvedAdmin, isAdmin, hasFetchedPolicy, isLoading, fetchUserPolicy])

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
      canAccessPath,
      isAdmin,
      canChangePassword,
    ],
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext)
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider")
  }
  return ctx
}
