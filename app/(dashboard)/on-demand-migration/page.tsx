"use client"

import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { BucketList } from "@/components/buckets/list"
import { OnDemandMigrationManagement } from "@/components/on-demand-migration/management"
import { Page } from "@/components/page"
import { BucketScopedHeader } from "@/components/buckets/scoped-header"
import { buildModuleBucketPath } from "@/lib/module-bucket-route"

export default function OnDemandMigrationPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const bucketName = searchParams.get("bucket") ?? ""

  if (!bucketName) {
    return (
      <Page>
        <BucketList
          title={<h1 className="text-2xl font-bold">{t("On-demand migration")}</h1>}
          emptyDescription={t("Create a bucket before configuring an external migration source.")}
          getBucketHref={(name) => buildModuleBucketPath("/on-demand-migration", name)}
        />
      </Page>
    )
  }

  return (
    <Page>
      <OnDemandMigrationManagement
        key={bucketName}
        bucketName={bucketName}
        renderHeader={(actions) => (
          <BucketScopedHeader
            title={t("On-demand migration")}
            bucketName={bucketName}
            href="/on-demand-migration"
            actions={actions}
          />
        )}
      />
    </Page>
  )
}
