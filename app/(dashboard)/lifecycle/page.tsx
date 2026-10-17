"use client"

import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { BucketScopedHeader } from "@/components/buckets/scoped-header"
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
      <BucketLifecycleTab
        key={bucketName}
        bucketName={bucketName}
        hideTitle
        renderHeader={(actions) => (
          <BucketScopedHeader title={t("Lifecycle")} bucketName={bucketName} href="/lifecycle" actions={actions} />
        )}
      />
    </Page>
  )
}
