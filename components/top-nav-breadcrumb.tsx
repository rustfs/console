"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import navs from "@/config/navs"

function getLabelByPath(pathSegment: string, t: (k: string) => string): string {
  const path = pathSegment.startsWith("/") ? pathSegment : `/${pathSegment}`
  const nav = navs.find(
    (n) => n.type !== "divider" && n.to && (n.to === path || n.to.replace(/^\//, "") === pathSegment)
  )
  return nav?.label ? t(nav.label) : pathSegment
}

export function TopNavBreadcrumb() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const segments = pathname?.split("/").filter(Boolean) ?? []
  const isHome = !pathname || pathname === "/" || (segments.length === 1 && segments[0] === "performance")
  if (segments.length === 0 && !pathname) return null

  const items: { label: string; href?: string }[] = []

  if (isHome) {
    const homeNav = navs.find((n) => n.to === "/")
    items.push({ label: homeNav?.label ? t(homeNav.label) : t("Home") })
  } else if (segments[0] === "browser") {
    items.push({ label: getLabelByPath("browser", t), href: "/browser" })
    items.push(
      segments.length === 1 ? { label: t("Buckets") } : { label: t("Buckets"), href: "/browser" }
    )
    if (segments.length > 1) {
      const bucketName = decodeURIComponent(segments[1])
      const bucketHref = `/browser/${encodeURIComponent(bucketName)}`
      const hasPath = segments.length > 2
      items.push({ label: bucketName, href: hasPath ? bucketHref : undefined })
      for (let i = 2; i < segments.length; i++) {
        const seg = decodeURIComponent(segments[i])
        const pathSoFar = segments
          .slice(2, i + 1)
          .map((s) => encodeURIComponent(decodeURIComponent(s)))
          .join("/")
        const href = `/browser/${encodeURIComponent(bucketName)}/${pathSoFar}/`
        items.push({ label: seg, href: i < segments.length - 1 ? href : undefined })
      }
    }
  } else if (segments[0] === "buckets" && segments.length >= 2) {
    items.push({ label: getLabelByPath("browser", t), href: "/browser" })
    items.push({ label: t("Buckets"), href: "/browser" })
    const bucketName = decodeURIComponent(segments[1])
    items.push({ label: bucketName })
  } else {
    const first = segments[0]
    const label = getLabelByPath(first, t)
    if (segments.length === 1) {
      items.push({ label })
    } else {
      items.push({ label, href: `/${first}` })
      const tail = segments.slice(1).map((s) => decodeURIComponent(s))
      tail.forEach((seg, i) => {
        const isLast = i === tail.length - 1
        const pathSoFar = segments.slice(0, 2 + i).join("/")
        items.push({
          label: seg,
          href: isLast ? undefined : `/${pathSoFar}`,
        })
      })
    }
  }

  if (items.length <= 1) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{items[0]?.label ?? ""}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
