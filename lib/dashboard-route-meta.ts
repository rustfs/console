// These routes require the backend admin identity, not a console policy scope.
export const ADMIN_ONLY_DASHBOARD_ROUTES = [] as const
export const DASHBOARD_ROUTE_FALLBACK = "/403/"

/**
 * Ordered list of dashboard routes controlled by the main menu.
 * Keep this in sync with navigation order, including the bucket entry's
 * permission-specific destinations and the pool management children.
 *
 * It intentionally lives here instead of deriving from nav config so auth
 * pages do not pull theme/nav configuration into their client bundles.
 */
export const MENU_CONTROLLED_DASHBOARD_ROUTES: readonly string[] = [
  "/browser",
  "/replication",
  "/events",
  "/lifecycle",
  "/tiers",
  "/events-target",
  "/table-catalog",
  "/access-keys",
  "/policies",
  "/user-groups",
  "/users",
  "/import-export",
  "/oidc",
  "/rebalance",
  "/pool-decommission",
  "/site-replication",
  "/sse",
  "/audit-target",
  "/status",
  "/settings",
  "/license",
]

function matchesRoutePrefix(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`)
}

export function isAdminOnlyDashboardRoute(pathname: string): boolean {
  return ADMIN_ONLY_DASHBOARD_ROUTES.some((routePath) => matchesRoutePrefix(pathname, routePath))
}

export function canAccessDashboardRoute(
  pathname: string,
  options: {
    isAdmin: boolean
    canAccessPath: (path: string) => boolean
  },
): boolean {
  if (isAdminOnlyDashboardRoute(pathname)) {
    return options.isAdmin
  }

  return options.canAccessPath(pathname)
}

export function getFirstAccessibleDashboardRoute(options: {
  isAdmin: boolean
  canAccessPath: (path: string) => boolean
}): string {
  const firstAccessible = MENU_CONTROLLED_DASHBOARD_ROUTES.find((routePath) =>
    canAccessDashboardRoute(routePath, options),
  )

  return firstAccessible ?? DASHBOARD_ROUTE_FALLBACK
}
