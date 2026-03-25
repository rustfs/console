"use client"

import { useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePermissions } from "@/hooks/use-permissions"
import { getFirstAccessibleDashboardRoute } from "@/lib/dashboard-route-meta"

export function useFirstAccessibleDashboardRoute() {
  const { isAuthenticated } = useAuth()
  const { isAdmin, canAccessPath, hasFetchedPolicy, hasResolvedAdmin, isLoading } = usePermissions()

  const isReady = isAuthenticated && hasResolvedAdmin && (isAdmin || (!isLoading && hasFetchedPolicy))

  const route = useMemo(() => {
    if (!isReady) return null
    return getFirstAccessibleDashboardRoute({ isAdmin, canAccessPath })
  }, [isReady, isAdmin, canAccessPath])

  return {
    route,
    isReady,
  }
}
