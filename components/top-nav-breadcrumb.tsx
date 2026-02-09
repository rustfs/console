"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
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
import { buildBucketPath } from "@/lib/bucket-path"

function getLabelByPath(pathSegment: string, t: (k: string) => string): string {
  const path = pathSegment.startsWith("/") ? pathSegment : `/${pathSegment}`
  const nav = navs.find(
    (n) => n.type !== "divider" && n.to && (n.to === path || n.to.replace(/^\//, "") === pathSegment),
  )
  return nav?.label ? t(nav.label) : pathSegment
}

export function TopNavBreadcrumb() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const segments = pathname?.split("/").filter(Boolean) ?? []
  const isHome = !pathname || pathname === "/"
  if (segments.length === 0 && !pathname) return null

  const items: { label: string; href?: string }[] = []

  if (isHome) {
    const homeNav = navs.find((n) => n.to === "/")
    items.push({ label: homeNav?.label ? t(homeNav.label) : t("Home") })
  } else if (segments[0] === "browser") {
    const bucketName = searchParams.get("bucket") ?? ""
    const objectKey = searchParams.get("key") ?? ""
    const objectSegments = objectKey.split("/").filter(Boolean)

    items.push({ label: getLabelByPath("browser", t), href: "/browser" })
    items.push(bucketName ? { label: t("Buckets"), href: "/browser" } : { label: t("Buckets") })
    if (bucketName) {
      items.push({ label: bucketName, href: objectSegments.length > 0 ? buildBucketPath(bucketName) : undefined })
      for (let i = 0; i < objectSegments.length; i++) {
        const seg = objectSegments[i]
        const pathSoFar = objectSegments.slice(0, i + 1).join("/")
        const href = i < objectSegments.length - 1 ? buildBucketPath(bucketName, `${pathSoFar}/`) : undefined
        items.push({ label: seg, href })
      }
    }
  } else if (segments[0] === "buckets") {
    const bucketName = searchParams.get("bucket") ?? ""
    items.push({ label: getLabelByPath("browser", t), href: "/browser" })
    items.push({ label: t("Buckets"), href: "/browser" })
    items.push({ label: bucketName || t("Bucket") })
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
