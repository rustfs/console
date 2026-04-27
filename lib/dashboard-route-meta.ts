// These routes require the backend admin identity, not a console policy scope.
export const ADMIN_ONLY_DASHBOARD_ROUTES = [] as const
export const DASHBOARD_ROUTE_FALLBACK = "/403/"

/**
 * Ordered list of dashboard routes controlled by the main menu.
 * Keep this in sync with the visible dashboard navigation order.
 *
 * It intentionally lives here instead of deriving from nav config so auth
 * pages do not pull theme/nav configuration into their client bundles.
 */
export const MENU_CONTROLLED_DASHBOARD_ROUTES: readonly string[] = [
  "/browser",
  "/access-keys",
  "/policies",
  "/users",
  "/user-groups",
  "/import-export",
  "/status",
  "/tiers",
  "/events-target",
  "/sse",
  "/oidc",
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
