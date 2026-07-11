"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { BucketInfo } from "@/components/buckets/info"
import { BucketList } from "@/components/buckets/list"

export default function BucketSettingsPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()

  const bucketName = searchParams.get("bucket") ?? ""

  if (!bucketName) {
    return (
      <Page>
        <BucketList
          title={<h1 className="text-2xl font-bold">{t("Bucket Settings")}</h1>}
          emptyDescription={t("Create a bucket to start storing objects.")}
          getBucketHref={(name) => `/buckets?bucket=${encodeURIComponent(name)}`}
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        description={
          <p className="text-sm text-muted-foreground">
            {t("Bucket")}: <span className="break-all font-medium text-foreground">{bucketName}</span>
          </p>
        }
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/browser" />}>
            <RiArrowLeftLine className="size-4" aria-hidden />
            <span>{t("Buckets")}</span>
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">{t("Bucket Settings")}</h1>
      </PageHeader>

      <BucketInfo key={bucketName} bucketName={bucketName} />
    </Page>
  )
}
