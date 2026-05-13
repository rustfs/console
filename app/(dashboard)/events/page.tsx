"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
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
      <PageHeader
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/events" />}>
            <RiArrowLeftLine className="size-4" />
            <span>{t("Buckets")}</span>
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">
          {t("Events")}: {bucketName}
        </h1>
      </PageHeader>

      <BucketEventsTab bucketName={bucketName} hideTitle />
    </Page>
  )
}
