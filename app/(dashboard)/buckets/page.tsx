"use client"

import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { BucketInfo } from "@/components/buckets/info"

export default function BucketSettingsPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()

  const bucketName = searchParams.get("bucket") ?? ""

  return (
    <Page>
      <PageHeader>
        <h1 className="text-2xl font-bold">
          {t("Bucket")}: {bucketName || "..."}
        </h1>
      </PageHeader>

      {bucketName ? <BucketInfo bucketName={bucketName} /> : null}
    </Page>
  )
}
