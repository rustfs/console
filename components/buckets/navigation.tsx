"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { usePermissions } from "@/hooks/use-permissions"
import { getBucketNavigationItems, isBucketNavigationItemActive } from "@/lib/bucket-navigation"
import { cn } from "@/lib/utils"

function revealCurrentItem(link: HTMLAnchorElement | null) {
  link?.scrollIntoView({ block: "nearest", inline: "nearest" })
}

export function BucketNavigation({ bucketName }: { bucketName: string }) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const { canAccessPath, isAdmin, hasResolvedAdmin, hasFetchedPolicy } = usePermissions()
  if (!hasResolvedAdmin || (!isAdmin && !hasFetchedPolicy)) return null

  const items = getBucketNavigationItems(bucketName, canAccessPath)
  if (!items.length) return null

  return (
    <nav aria-label={t("Bucket navigation")} className="min-w-0 overflow-x-auto border-b">
      <ul className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = isBucketNavigationItemActive(item.route, pathname)
          return (
            <li key={item.route}>
              <Link
                ref={active ? revealCurrentItem : undefined}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 px-4 py-3 text-sm whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:min-h-9 sm:py-2",
                  active ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground",
                )}
              >
                {t(item.label)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
