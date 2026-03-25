"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useApiReady } from "@/contexts/api-context"
import { useS3Ready } from "@/contexts/s3-context"
import { usePermissions } from "@/hooks/use-permissions"
import { canAccessDashboardRoute } from "@/lib/dashboard-route-meta"

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const { isReady: apiReady } = useApiReady()
  const { isReady: s3Ready } = useS3Ready()
  const { isAdmin, isLoading, hasFetchedPolicy, hasResolvedAdmin, canAccessPath } = usePermissions()

  const isReady = apiReady && s3Ready

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login/?unauthorized=true")
    }
  }, [isAuthenticated, isReady, router])

  useEffect(() => {
    if (!isReady || !isAuthenticated || !hasResolvedAdmin) return
    if (!isAdmin && (isLoading || !hasFetchedPolicy)) return
    if (!canAccessDashboardRoute(pathname, { isAdmin, canAccessPath })) {
      router.replace("/403/")
    }
  }, [
    isReady,
    isAuthenticated,
    hasResolvedAdmin,
    isAdmin,
    isLoading,
    hasFetchedPolicy,
    canAccessPath,
    pathname,
    router,
  ])

  if (!isReady || !isAuthenticated) {
    return null
  }

  if (!hasResolvedAdmin) {
    return null
  }

  if (!isAdmin && (isLoading || !hasFetchedPolicy)) {
    return null
  }

  if (!canAccessDashboardRoute(pathname, { isAdmin, canAccessPath })) {
    return null
  }

  return <>{children}</>
}
