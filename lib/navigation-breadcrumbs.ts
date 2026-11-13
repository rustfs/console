import type { NavItem } from "@/types/app-config"
import { buildBucketPath } from "@/lib/bucket-path"
import { BUCKET_WORKSPACE_ROUTES, getBucketEntryRoute } from "@/lib/bucket-navigation"

export interface NavigationBreadcrumb {
  label: string
  href?: string
}

const bucketLabels: Record<string, string> = {
  "/buckets": "Bucket Settings",
  "/replication": "Bucket Replication",
  "/events": "Events",
  "/lifecycle": "Lifecycle",
  "/on-demand-migration": "On-demand migration",
}

export function getNavigationBreadcrumbs({
  pathname,
  searchParams,
  navs,
  t,
  canAccessPath,
}: {
  pathname: string
  searchParams: Pick<URLSearchParams, "get">
  navs: NavItem[]
  t: (key: string) => string
  canAccessPath: (path: string) => boolean
}): NavigationBreadcrumb[] {
  const segments = pathname.split("/").filter(Boolean)
  if (!segments.length) return [{ label: t("Home") }]
  const route = `/${segments[0]}`
  if (BUCKET_WORKSPACE_ROUTES.some((path) => path === route)) {
    const bucketName = searchParams.get("bucket") ?? ""
    const entry = getBucketEntryRoute(canAccessPath)
    const items: NavigationBreadcrumb[] = [{ label: t("Buckets"), href: bucketName ? (entry ?? undefined) : undefined }]
    if (!bucketName) return items

    if (route === "/browser") {
      const parts = (searchParams.get("key") ?? "").split("/").filter(Boolean)
      items.push({ label: bucketName, href: parts.length ? buildBucketPath(bucketName) : undefined })
      parts.forEach((label, index) => {
        items.push({
          label,
          href: index < parts.length - 1 ? buildBucketPath(bucketName, parts.slice(0, index + 1)) : undefined,
        })
      })
    } else {
      items.push({
        label: bucketName,
        href: canAccessPath("/browser") ? buildBucketPath(bucketName) : undefined,
      })
      items.push({ label: t(bucketLabels[route]) })
    }
    return items
  }

  const parent = navs.find((item) => item.children?.some((child) => child.to === route))
  const nav = parent?.children?.find((item) => item.to === route) ?? navs.find((item) => item.to === route)
  const items: NavigationBreadcrumb[] = parent ? [{ label: t(parent.label) }] : []
  items.push({ label: nav ? t(nav.label) : segments[0], href: segments.length > 1 ? route : undefined })
  segments.slice(1).forEach((segment, index) => {
    items.push({
      label: decodeURIComponent(segment),
      href: index < segments.length - 2 ? `/${segments.slice(0, index + 2).join("/")}` : undefined,
    })
  })
  return items
}
