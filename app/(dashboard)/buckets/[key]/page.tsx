"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BucketInfo } from "@/components/buckets/info"
import { usePermissions } from "@/hooks/use-permissions"
import { CONSOLE_SCOPES } from "@/lib/console-permissions"
import { BucketLifecycleTab } from "@/components/buckets/lifecycle-tab"
import { BucketReplicationTab } from "@/components/buckets/replication-tab"
import { BucketEventsTab } from "@/components/buckets/events-tab"

export default function BucketSettingsPage() {
  const { t } = useTranslation()
  const params = useParams()
  const { hasPermission } = usePermissions()

  const bucketName = React.useMemo(() => {
    const key = params?.key
    if (typeof key === "string") return decodeURIComponent(key)
    return key?.[0] ? decodeURIComponent(key[0]) : ""
  }, [params?.key])

  const canViewLifecycle = hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_LIFECYCLE)
  const canViewReplication = hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_REPLICATION)
  const canViewEvents = hasPermission(CONSOLE_SCOPES.VIEW_BUCKET_EVENTS)

  return (
    <Page>
      <PageHeader>
        <h1 className="text-2xl font-bold">
          {t("Bucket")}: {bucketName || "..."}
        </h1>
      </PageHeader>

      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger value="overview" className="px-4">
            {t("Overview")}
          </TabsTrigger>
          {canViewLifecycle && (
            <TabsTrigger value="lifecycle" className="px-4">
              {t("Lifecycle")}
            </TabsTrigger>
          )}
          {canViewReplication && (
            <TabsTrigger value="replication" className="px-4">
              {t("Replication")}
            </TabsTrigger>
          )}
          {canViewEvents && (
            <TabsTrigger value="events" className="px-4">
              {t("Events")}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 outline-none">
          {bucketName ? <BucketInfo bucketName={bucketName} /> : null}
        </TabsContent>

        {canViewLifecycle && (
          <TabsContent value="lifecycle" className="space-y-4 outline-none">
            {bucketName ? (
              <BucketLifecycleTab bucketName={bucketName} />
            ) : null}
          </TabsContent>
        )}

        {canViewReplication && (
          <TabsContent value="replication" className="space-y-4 outline-none">
            {bucketName ? (
              <BucketReplicationTab bucketName={bucketName} />
            ) : null}
          </TabsContent>
        )}

        {canViewEvents && (
          <TabsContent value="events" className="space-y-4 outline-none">
            {bucketName ? (
              <BucketEventsTab bucketName={bucketName} />
            ) : null}
          </TabsContent>
        )}
      </Tabs>
    </Page>
  )
}
