"use client"

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import { hasConsoleScopes, type ConsolePolicy } from "@/lib/console-policy-parser"
import { CONSOLE_SCOPES, PAGE_PERMISSIONS } from "@/lib/console-permissions"
import { useAuth } from "@/contexts/auth-context"
import { useApiOptional } from "@/contexts/api-context"

interface PermissionsContextValue {
  userPolicy: ConsolePolicy | null
  userInfo: Record<string, unknown> | null
  isLoading: boolean
  hasFetchedPolicy: boolean
  fetchUserPolicy: () => Promise<void>
  hasPermission: (action: string | string[], matchAll?: boolean) => boolean
  canAccessPath: (path: string) => boolean
  isAdmin: boolean
  /** True when user has consoleAdmin (or is admin). Only these users can change password per RustFS backend. */
  canChangePassword: boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const api = useApiOptional()
  const { isAdmin, isAuthenticated, credentials } = useAuth()

  const [userPolicy, setUserPolicy] = useState<ConsolePolicy | null>(null)
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetchedPolicy, setHasFetchedPolicy] = useState(false)

  useEffect(() => {
    setUserInfo(null)
    setUserPolicy(null)
    setHasFetchedPolicy(false)
  }, [credentials?.AccessKeyId, credentials?.SessionToken, isAuthenticated])

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
    if (api && isAuthenticated && !isAdmin && !hasFetchedPolicy && !isLoading) {
      fetchUserPolicy()
    }
  }, [api, isAuthenticated, isAdmin, hasFetchedPolicy, isLoading, fetchUserPolicy])

  const canChangePassword = isAdmin || hasPermission(CONSOLE_SCOPES.CONSOLE_ADMIN)

  const value = useMemo(
    () => ({
      userPolicy,
      userInfo,
      isLoading,
      hasFetchedPolicy,
      fetchUserPolicy,
      hasPermission,
      canAccessPath,
      isAdmin,
      canChangePassword,
    }),
    [userPolicy, userInfo, isLoading, hasFetchedPolicy, fetchUserPolicy, hasPermission, canAccessPath, isAdmin, canChangePassword],
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
