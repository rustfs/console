"use client"

import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { BucketInfo } from "@/components/buckets/info"
import { BucketList } from "@/components/buckets/list"
import { BucketScopedHeader } from "@/components/buckets/scoped-header"

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
      <BucketScopedHeader title={t("Bucket Settings")} bucketName={bucketName} href="/browser" />

      <BucketInfo key={bucketName} bucketName={bucketName} />
    </Page>
  )
}
