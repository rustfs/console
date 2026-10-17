"use client"

import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { BucketScopedHeader } from "@/components/buckets/scoped-header"
import { BucketList } from "@/components/buckets/list"
import { BucketReplicationTab } from "@/components/buckets/replication-tab"
import { buildModuleBucketPath } from "@/lib/module-bucket-route"

export default function ReplicationPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const bucketName = searchParams.get("bucket") ?? ""

  if (!bucketName) {
    return (
      <Page>
        <BucketList
          title={<h1 className="text-2xl font-bold">{t("Bucket Replication")}</h1>}
          emptyDescription={t("Create a bucket to start storing objects.")}
          getBucketHref={(name) => buildModuleBucketPath("/replication", name)}
        />
      </Page>
    )
  }

  return (
    <Page>
      <BucketReplicationTab
        key={bucketName}
        bucketName={bucketName}
        hideTitle
        renderHeader={(actions) => (
          <BucketScopedHeader
            title={t("Bucket Replication")}
            bucketName={bucketName}
            href="/replication"
            actions={actions}
          />
        )}
      />
    </Page>
  )
}
