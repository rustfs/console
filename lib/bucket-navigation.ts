const BUCKET_NAVIGATION_ITEMS = [
  { route: "/browser", label: "Objects" },
  { route: "/buckets", label: "Bucket Settings" },
  { route: "/replication", label: "Bucket Replication" },
  { route: "/events", label: "Events" },
  { route: "/lifecycle", label: "Lifecycle" },
] as const

export const BUCKET_WORKSPACE_ROUTES: readonly string[] = [
  ...BUCKET_NAVIGATION_ITEMS.map((item) => item.route),
  "/on-demand-migration",
]

export function getBucketEntryRoute(canAccessPath: (path: string) => boolean): string | null {
  return ["/browser", "/replication", "/events", "/lifecycle"].find(canAccessPath) ?? null
}

export function getBucketNavigationItems(bucketName: string, canAccessPath: (path: string) => boolean) {
  if (!bucketName) return []

  const query = new URLSearchParams({ bucket: bucketName }).toString()
  return BUCKET_NAVIGATION_ITEMS.filter((item) => canAccessPath(item.route)).map((item) => ({
    ...item,
    href: `${item.route}?${query}`,
  }))
}

export function isBucketNavigationItemActive(route: string, pathname: string): boolean {
  if (route === "/buckets" && (pathname === "/on-demand-migration" || pathname === "/on-demand-migration/")) {
    return true
  }
  return pathname === route || pathname.startsWith(`${route}/`)
}
