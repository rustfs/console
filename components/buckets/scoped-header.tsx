"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine } from "@remixicon/react"
import { PageHeader } from "@/components/page-header"
import { BucketNavigation } from "@/components/buckets/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import { getBucketEntryRoute } from "@/lib/bucket-navigation"

export function BucketScopedHeader({
  title,
  bucketName,
  href,
  actions,
}: {
  title: string
  bucketName: string
  href: string
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const { canAccessPath } = usePermissions()
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        description={title}
        actions={
          <>
            <Link
              href={getBucketEntryRoute(canAccessPath) ?? href}
              className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:min-h-9"
            >
              <RiArrowLeftLine className="size-4 rtl:rotate-180" aria-hidden />
              {t("Buckets")}
            </Link>
            {actions}
          </>
        }
      >
        <h1 className="break-all">{bucketName}</h1>
      </PageHeader>
      <BucketNavigation bucketName={bucketName} />
    </div>
  )
}
