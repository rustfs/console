"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine } from "@remixicon/react"
import { BucketList } from "@/components/buckets/list"
import { OnDemandMigrationManagement } from "@/components/on-demand-migration/management"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
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
          <PageHeader
            description={
              <p className="text-sm text-muted-foreground">
                {t("Bucket")}: <span className="break-all font-medium text-foreground">{bucketName}</span>
              </p>
            }
            actions={
              <>
                <Button
                  variant="outline"
                  className="min-h-11 sm:min-h-0"
                  nativeButton={false}
                  render={<Link href="/on-demand-migration" />}
                >
                  <RiArrowLeftLine data-icon="inline-start" aria-hidden />
                  <span>{t("Buckets")}</span>
                </Button>
                {actions}
              </>
            }
          >
            <h1 className="text-2xl font-bold">{t("On-demand migration")}</h1>
          </PageHeader>
        )}
      />
    </Page>
  )
}
