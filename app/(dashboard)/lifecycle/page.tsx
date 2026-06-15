"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { BucketList } from "@/components/buckets/list"
import { BucketLifecycleTab } from "@/components/buckets/lifecycle-tab"
import { buildModuleBucketPath } from "@/lib/module-bucket-route"

export default function LifecyclePage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const bucketName = searchParams.get("bucket") ?? ""

  if (!bucketName) {
    return (
      <Page>
        <BucketList
          title={<h1 className="text-2xl font-bold">{t("Lifecycle")}</h1>}
          emptyDescription={t("Create a bucket to start storing objects.")}
          getBucketHref={(name) => buildModuleBucketPath("/lifecycle", name)}
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/lifecycle" />}>
            <RiArrowLeftLine className="size-4" aria-hidden />
            <span>{t("Buckets")}</span>
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">
          {t("Lifecycle")}: {bucketName}
        </h1>
      </PageHeader>

      <BucketLifecycleTab bucketName={bucketName} hideTitle />
    </Page>
  )
}
