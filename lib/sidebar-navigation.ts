import type { NavItem } from "@/types/app-config"
import { BUCKET_WORKSPACE_ROUTES, getBucketEntryRoute } from "@/lib/bucket-navigation"

export function isExternalNav(item: NavItem): boolean {
  return Boolean(item.target) || /^https?:/i.test(item.to ?? "")
}

export function getVisibleNavigation(items: NavItem[], canAccessPath: (path: string) => boolean): NavItem[] {
  return items.flatMap((item) => {
    if (item.type === "divider") return [item]
    if (item.key === "buckets") {
      const to = getBucketEntryRoute(canAccessPath)
      return to ? [{ ...item, to }] : []
    }
    if (item.children?.length) {
      const children = getVisibleNavigation(item.children, canAccessPath)
      return children.length ? [{ ...item, children }] : []
    }
    return !item.to || isExternalNav(item) || canAccessPath(item.to) ? [item] : []
  })
}

export function groupNavigation(items: NavItem[]): { label: string; items: NavItem[] }[] {
  const groups: { label: string; items: NavItem[] }[] = []
  let group = { label: "", items: [] as NavItem[] }
  for (const item of items) {
    if (item.type === "divider") {
      if (group.items.length) groups.push(group)
      group = { label: item.label, items: [] }
    } else {
      group.items.push(item)
    }
  }
  if (group.items.length) groups.push(group)
  return groups
}

export function isNavigationItemActive(item: NavItem, pathname: string): boolean {
  if (item.children?.length) return item.children.some((child) => isNavigationItemActive(child, pathname))
  if (isExternalNav(item)) return false
  const paths = item.key === "buckets" ? BUCKET_WORKSPACE_ROUTES : item.to ? [item.to] : []
  return paths.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))
}
