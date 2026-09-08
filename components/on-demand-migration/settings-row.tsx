"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiArrowRightSLine } from "@remixicon/react"
import { BucketSettingRow } from "@/components/buckets/settings-layout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useOnDemandMigration } from "@/hooks/use-on-demand-migration"
import { usePermissions } from "@/hooks/use-permissions"
import { buildModuleBucketPath } from "@/lib/module-bucket-route"
import { getOnDemandMigrationErrorKind, isOnDemandMigrationRouteMissing } from "@/lib/on-demand-migration"
import type { OnDemandMigrationStatus } from "@/types/on-demand-migration"

export function OnDemandMigrationSettingsRow({ bucketName }: { bucketName: string }) {
  const { t } = useTranslation()
  const { getStatus } = useOnDemandMigration()
  const { canCapability, hasFetchedPolicy, hasResolvedAdmin, isAdmin, isLoading } = usePermissions()
  const [status, setStatus] = React.useState<OnDemandMigrationStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [hidden, setHidden] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const requestVersionRef = React.useRef(0)
  const permissionsReady = hasResolvedAdmin && (isAdmin || hasFetchedPolicy) && !isLoading
  const canView = canCapability("bucket.onDemandMigration.view")

  const loadStatus = React.useCallback(async () => {
    if (!permissionsReady || !canView) {
      if (permissionsReady) {
        setHidden(true)
        setLoading(false)
      }
      return
    }
    const version = ++requestVersionRef.current
    setLoading(true)
    try {
      const nextStatus = await getStatus(bucketName)
      if (version !== requestVersionRef.current) return
      setStatus(nextStatus)
      setHidden(false)
      setLoadError("")
    } catch (error) {
      if (version !== requestVersionRef.current) return
      if (isOnDemandMigrationRouteMissing(error) || getOnDemandMigrationErrorKind(error) === "access_denied") {
        setHidden(true)
        setLoadError("")
      } else {
        setHidden(false)
        setLoadError(error instanceof Error ? error.message : String(error))
      }
    } finally {
      if (version === requestVersionRef.current) setLoading(false)
    }
  }, [bucketName, canView, getStatus, permissionsReady])

  React.useEffect(() => {
    void loadStatus()
    return () => {
      requestVersionRef.current += 1
    }
  }, [loadStatus])

  if (hidden) return null

  if (!permissionsReady || loading) {
    return (
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    )
  }

  const state = loadError
    ? { label: t("Unavailable"), variant: "destructive" as const }
    : !status?.configured
      ? { label: t("Not configured"), variant: "outline" as const }
      : !status.module_enabled
        ? { label: t("Server module disabled"), variant: "destructive" as const }
        : !status.enabled
          ? { label: t("Migration paused"), variant: "outline" as const }
          : status.breaker?.state === "open"
            ? { label: t("Source circuit open"), variant: "destructive" as const }
            : { label: t("Migration active"), variant: "secondary" as const }

  return (
    <BucketSettingRow
      title={t("On-demand migration")}
      description={t("Serve missing objects from an external source while migrating them into RustFS.")}
      status={state.label}
      statusVariant={state.variant}
      action={
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-0"
          nativeButton={false}
          render={<Link href={buildModuleBucketPath("/on-demand-migration", bucketName)} />}
        >
          <span>{status?.configured ? t("Manage migration") : t("Open migration settings")}</span>
          <RiArrowRightSLine data-icon="inline-end" aria-hidden />
        </Button>
      }
      error={loadError || undefined}
      errorTitle={t("Unable to load this setting")}
      retryLabel={t("Retry")}
      onRetry={loadStatus}
    />
  )
}
