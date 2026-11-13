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
import navs, { footerNavs } from "@/config/navs"
import { usePermissions } from "@/hooks/use-permissions"
import { getNavigationBreadcrumbs } from "@/lib/navigation-breadcrumbs"

export function TopNavBreadcrumb() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { canAccessPath } = usePermissions()
  const items = getNavigationBreadcrumbs({
    pathname,
    searchParams,
    navs: [...navs, ...footerNavs],
    t,
    canAccessPath,
  })

  if (items.length <= 1) {
    return (
      <Breadcrumb className="min-w-0 overflow-hidden">
        <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{items[0]?.label ?? ""}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  return (
    <Breadcrumb className="min-w-0 overflow-hidden">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className="min-w-0">
              {i === items.length - 1 ? (
                <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
              ) : item.href ? (
                <BreadcrumbLink className="truncate" render={<Link href={item.href}>{item.label}</Link>} />
              ) : (
                <span className="truncate font-normal text-foreground">{item.label}</span>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
