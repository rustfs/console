"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine } from "@remixicon/react"
import { PageHeader } from "@/components/page-header"

export function BucketScopedHeader({
  title,
  bucketName,
  href,
  actions,
}: {
  title: string
  bucketName: string
  href: string
  actions: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <nav aria-label={t("Bucket")} className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
        <Link
          href={href}
          className="inline-flex min-h-10 items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <RiArrowLeftLine className="size-4 rtl:rotate-180" aria-hidden />
          {t("Buckets")}
        </Link>
        <span className="text-border" aria-hidden>
          /
        </span>
        <span className="break-all font-mono font-medium">{bucketName}</span>
      </nav>
      <PageHeader actions={actions}>
        <h1>{title}</h1>
      </PageHeader>
    </div>
  )
}
