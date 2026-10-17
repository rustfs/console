"use client"

import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { BucketScopedHeader } from "@/components/buckets/scoped-header"
import { BucketList } from "@/components/buckets/list"
import { BucketEventsTab } from "@/components/buckets/events-tab"
import { buildModuleBucketPath } from "@/lib/module-bucket-route"

export default function EventsPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const bucketName = searchParams.get("bucket") ?? ""

  if (!bucketName) {
    return (
      <Page>
        <BucketList
          title={<h1 className="text-2xl font-bold">{t("Events")}</h1>}
          emptyDescription={t("Create a bucket to start storing objects.")}
          getBucketHref={(name) => buildModuleBucketPath("/events", name)}
        />
      </Page>
    )
  }

  return (
    <Page>
      <BucketEventsTab
        key={bucketName}
        bucketName={bucketName}
        hideTitle
        renderHeader={(actions) => (
          <BucketScopedHeader title={t("Events")} bucketName={bucketName} href="/events" actions={actions} />
        )}
      />
    </Page>
  )
}
