"use client"

import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useApiReady } from "@/contexts/api-context"
import { useS3Ready } from "@/contexts/s3-context"
import { usePermissions } from "@/hooks/use-permissions"
import { canAccessDashboardRoute } from "@/lib/dashboard-route-meta"
import { getLoginRoute } from "@/lib/routes"

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, getIsLoggingOut } = useAuth()
  const { isReady: apiReady } = useApiReady()
  const { isReady: s3Ready } = useS3Ready()
  const { isAdmin, hasFetchedPolicy, hasResolvedAdmin, canAccessPath } = usePermissions()

  const isReady = apiReady && s3Ready

  useEffect(() => {
    if (isReady && !isAuthenticated && !getIsLoggingOut()) {
      router.replace("/auth/login/?unauthorized=true")
    }
  }, [isAuthenticated, isReady, getIsLoggingOut, router])

  useEffect(() => {
    if (!isReady || !isAuthenticated || !hasResolvedAdmin || getIsLoggingOut()) return
    if (!isAdmin && !hasFetchedPolicy) return
    if (!canAccessDashboardRoute(pathname, { isAdmin, canAccessPath })) {
      router.replace("/403/")
    }
  }, [
    isReady,
    isAuthenticated,
    hasResolvedAdmin,
    isAdmin,
    hasFetchedPolicy,
    canAccessPath,
    pathname,
    getIsLoggingOut,
    router,
  ])

  // Background refreshes must not unmount the page that requested them.
  if (!isReady || !isAuthenticated || !hasResolvedAdmin || (!isAdmin && !hasFetchedPolicy)) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3">
        <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-5" />
          <span>{t("Loading…")}</span>
        </div>
        {!isAuthenticated && (
          <Button
            variant="link"
            className="min-h-11 sm:min-h-0"
            nativeButton={false}
            role="link"
            render={<a href={getLoginRoute()} />}
          >
            {t("Back to Login")}
          </Button>
        )}
      </div>
    )
  }

  if (!canAccessDashboardRoute(pathname, { isAdmin, canAccessPath })) {
    return null
  }

  return <>{children}</>
}
