"use client"

import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useFirstAccessibleDashboardRoute } from "@/hooks/use-first-accessible-dashboard-route"
import { DASHBOARD_ROUTE_FALLBACK } from "@/lib/dashboard-route-meta"

export default function ForbiddenPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { logoutAndRedirect } = useAuth()
  const { route } = useFirstAccessibleDashboardRoute()
  const fallbackNormalized = DASHBOARD_ROUTE_FALLBACK.replace(/\/+$/, "")
  const routeNormalized = route?.replace(/\/+$/, "")
  const hasSafeHomeRoute = Boolean(routeNormalized && routeNormalized !== fallbackNormalized)

  const handleBack = () => {
    if (!hasSafeHomeRoute || !route) {
      logoutAndRedirect()
      return
    }
    router.replace(route)
  }

  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <Empty className="py-8">
        <EmptyContent className="max-w-sm text-center">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="mx-auto">
              <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
                <circle cx="24" cy="24" r="22" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="2" />
                <path
                  d="M16 21V19a8 8 0 0116 0v2"
                  stroke="#A3A3A3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="16" y="28" width="16" height="4" rx="2" fill="#A3A3A3" />
                <rect x="22" y="32" width="4" height="4" rx="2" fill="#A3A3A3" />
              </svg>
            </EmptyMedia>
            <EmptyTitle>{t("Access Denied")}</EmptyTitle>
            <EmptyDescription>
              {t(
                "You do not have permission to access this page. This may be due to insufficient permissions or not being logged in.",
              )}
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" className="mt-6" onClick={handleBack}>
            {hasSafeHomeRoute ? t("Back to Home") : t("Back to Login")}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
