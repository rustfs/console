import navs from "@/config/navs"

export const ADMIN_ONLY_DASHBOARD_ROUTES = ["/oidc"] as const
export const DASHBOARD_ROUTE_FALLBACK = "/403/"

function collectNavRoutes(items: typeof navs): string[] {
  const routes: string[] = []

  for (const item of items) {
    if (item.children?.length) {
      routes.push(...collectNavRoutes(item.children))
    }

    if (!item.to || item.type === "divider") continue
    if (/^https?:/i.test(item.to)) continue
    routes.push(item.to)
  }

  return routes
}

export const MENU_CONTROLLED_DASHBOARD_ROUTES = Array.from(new Set(collectNavRoutes(navs)))

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
