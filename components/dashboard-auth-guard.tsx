"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useApiReady } from "@/contexts/api-context"
import { useS3Ready } from "@/contexts/s3-context"
import { usePermissions } from "@/hooks/use-permissions"

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const { isReady: apiReady } = useApiReady()
  const { isReady: s3Ready } = useS3Ready()
  const { isAdmin, userPolicy, isLoading, hasFetchedPolicy, fetchUserPolicy, canAccessPath } = usePermissions()

  const isReady = apiReady && s3Ready

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login?unauthorized=true")
    }
  }, [isAuthenticated, isReady, router])

  useEffect(() => {
    if (!isReady || !isAuthenticated || isAdmin) return
    if (!userPolicy && !isLoading) {
      void fetchUserPolicy()
    }
  }, [isReady, isAuthenticated, isAdmin, userPolicy, isLoading, fetchUserPolicy])

  useEffect(() => {
    if (!isReady || !isAuthenticated || isAdmin) return
    if (isLoading || !hasFetchedPolicy) return
    if (!canAccessPath(pathname)) {
      router.replace("/403")
    }
  }, [isReady, isAuthenticated, isAdmin, isLoading, userPolicy, hasFetchedPolicy, canAccessPath, pathname, router])

  if (!isReady || !isAuthenticated) {
    return null
  }

  if (!isAdmin && (isLoading || !hasFetchedPolicy)) {
    return null
  }

  if (!isAdmin && !canAccessPath(pathname)) {
    return null
  }

  return <>{children}</>
}
