"use client"

import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine } from "@remixicon/react"
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
    <section className="console-page mx-auto grid min-h-[60dvh] max-w-4xl content-center gap-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-12">
      <p className="font-heading text-7xl font-semibold tracking-tight text-muted-foreground/40" aria-hidden="true">
        403
      </p>
      <div className="space-y-5">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{t("Access Denied")}</h1>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          {t(
            "You do not have permission to access this page. This may be due to insufficient permissions or not being logged in.",
          )}
        </p>
        <Button className="mt-3" onClick={handleBack}>
          <RiArrowLeftLine className="size-4 rtl:rotate-180" aria-hidden />
          {hasSafeHomeRoute ? t("Back to Home") : t("Back to Login")}
        </Button>
      </div>
    </section>
  )
}
