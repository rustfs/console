"use client"

import { Suspense, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useApiReady } from "@/contexts/api-context"
import { useS3Ready } from "@/contexts/s3-context"
import { usePermissions } from "@/hooks/use-permissions"
import { canAccessDashboardRoute } from "@/lib/dashboard-route-meta"
import { getLoginRoute } from "@/lib/routes"

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-5" />
          <span>{t("Loading…")}</span>
        </div>
      }
    >
      <DashboardAuthGuardContent>{children}</DashboardAuthGuardContent>
    </Suspense>
  )
}

function DashboardAuthGuardContent({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const accessPath = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`
  const { isAuthenticated, getIsLoggingOut, credentials } = useAuth()
  const identity = JSON.stringify([
    isAuthenticated,
    credentials?.AccessKeyId,
    credentials?.SecretAccessKey,
    credentials?.SessionToken,
  ])
  const [allowedPage, setAllowedPage] = useState<{ path: string; identity: string } | null>(null)
  const { isReady: apiReady } = useApiReady()
  const { isReady: s3Ready } = useS3Ready()
  const {
    isAdmin,
    hasFetchedPolicy,
    hasResolvedAdmin,
    canAccessPath,
    hasPendingChecks,
    permissionVersion,
    permissionServiceStatus,
    retryPermissions,
  } = usePermissions()

  const isReady = apiReady && s3Ready

  useEffect(() => {
    if (isReady && !isAuthenticated && !getIsLoggingOut()) {
      router.replace("/auth/login/?unauthorized=true")
    }
  }, [isAuthenticated, isReady, getIsLoggingOut, router])

  useEffect(() => {
    if (!isReady || !isAuthenticated || !hasResolvedAdmin || getIsLoggingOut()) return
    if (!isAdmin && !hasFetchedPolicy) return
    if (
      !canAccessDashboardRoute(accessPath, { isAdmin, canAccessPath }) &&
      !hasPendingChecks(accessPath) &&
      permissionServiceStatus !== "unavailable"
    ) {
      router.replace("/403/")
    }
  }, [
    isReady,
    isAuthenticated,
    hasResolvedAdmin,
    isAdmin,
    hasFetchedPolicy,
    canAccessPath,
    hasPendingChecks,
    permissionVersion,
    permissionServiceStatus,
    accessPath,
    getIsLoggingOut,
    router,
  ])

  // Background refreshes must not unmount the page that requested them.
  const routeAllowed = canAccessDashboardRoute(accessPath, { isAdmin, canAccessPath })
  const routePending = !routeAllowed && hasPendingChecks(accessPath)
  const unavailable = permissionServiceStatus === "unavailable"
  const ready = isReady && isAuthenticated && hasResolvedAdmin && (isAdmin || hasFetchedPolicy)
  const preservePage =
    ready &&
    !routeAllowed &&
    (routePending || unavailable) &&
    allowedPage?.path === accessPath &&
    allowedPage?.identity === identity
  if (ready && routeAllowed && (allowedPage?.path !== accessPath || allowedPage?.identity !== identity)) {
    setAllowedPage({ path: accessPath, identity })
  } else if (
    allowedPage &&
    (!ready ||
      allowedPage.path !== accessPath ||
      allowedPage.identity !== identity ||
      (!routeAllowed && !routePending && !unavailable))
  ) {
    setAllowedPage(null)
  }
  if (
    isReady &&
    isAuthenticated &&
    hasResolvedAdmin &&
    hasFetchedPolicy &&
    !routeAllowed &&
    !preservePage &&
    permissionServiceStatus === "unavailable"
  ) {
    return (
      <div
        role="alert"
        className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
      >
        <p>{t("Unable to check permissions. Refresh and try again.")}</p>
        <Button variant="outline" onClick={retryPermissions}>
          {t("Refresh")}
        </Button>
      </div>
    )
  }
  if (
    !isReady ||
    !isAuthenticated ||
    !hasResolvedAdmin ||
    (!isAdmin && !hasFetchedPolicy) ||
    (!routeAllowed && routePending && !preservePage)
  ) {
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

  if (!routeAllowed && !preservePage) {
    return null
  }

  return (
    <>
      {preservePage && unavailable && (
        <div role="alert" className="flex items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
          <p>{t("Unable to check permissions. Refresh and try again.")}</p>
          <Button variant="outline" onClick={retryPermissions}>
            {t("Refresh")}
          </Button>
        </div>
      )}
      {children}
    </>
  )
}
