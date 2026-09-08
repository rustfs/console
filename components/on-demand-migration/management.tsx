"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  RiAddLine,
  RiCloudLine,
  RiDeleteBin5Line,
  RiEditLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiPlayLine,
  RiRefreshLine,
} from "@remixicon/react"
import { OnDemandMigrationBackfillDialog } from "@/components/on-demand-migration/backfill-dialog"
import { OnDemandMigrationConfigDialog } from "@/components/on-demand-migration/config-dialog"
import { BucketSettingRow, BucketSettingsSection } from "@/components/buckets/settings-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useOnDemandMigration } from "@/hooks/use-on-demand-migration"
import { usePermissions } from "@/hooks/use-permissions"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { formatBytes, formatDateTime, formatInteger } from "@/lib/functions"
import {
  getOnDemandMigrationErrorKind,
  isOnDemandMigrationBackfillActive,
  isOnDemandMigrationRouteMissing,
  sumCounterValues,
} from "@/lib/on-demand-migration"
import type {
  OnDemandMigrationBackfillJob,
  OnDemandMigrationBackfillState,
  OnDemandMigrationGetResponse,
  OnDemandMigrationStatus,
} from "@/types/on-demand-migration"

interface ManagementProps {
  bucketName: string
  renderHeader?: (actions: React.ReactNode) => React.ReactNode
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error)
}

function Metric({
  label,
  value,
  detail,
}: {
  label: React.ReactNode
  value: React.ReactNode
  detail?: React.ReactNode
}) {
  return (
    <div className="min-w-0 p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-lg font-medium tabular-nums">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-muted-foreground">{detail}</dd> : null}
    </div>
  )
}

export function OnDemandMigrationManagement({ bucketName, renderHeader }: ManagementProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { canCapability, hasFetchedPolicy, hasResolvedAdmin, isAdmin, isLoading: permissionsLoading } = usePermissions()
  const { getConfig, getStatus, getBackfill, deleteConfig } = useOnDemandMigration()
  const [configResponse, setConfigResponse] = React.useState<OnDemandMigrationGetResponse | null>(null)
  const [status, setStatus] = React.useState<OnDemandMigrationStatus | null>(null)
  const [job, setJob] = React.useState<OnDemandMigrationBackfillJob | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [supported, setSupported] = React.useState<boolean | null>(null)
  const [accessDenied, setAccessDenied] = React.useState(false)
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false)
  const [backfillDialogOpen, setBackfillDialogOpen] = React.useState(false)
  const [mutation, setMutation] = React.useState<"disable" | null>(null)
  const requestVersionRef = React.useRef(0)

  const permissionsReady = hasResolvedAdmin && (isAdmin || hasFetchedPolicy) && !permissionsLoading
  const canView = canCapability("bucket.onDemandMigration.view")
  const canEdit = canCapability("bucket.onDemandMigration.edit")

  const loadData = React.useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      if (!permissionsReady || !canView) {
        if (permissionsReady) setLoading(false)
        return
      }

      const version = ++requestVersionRef.current
      if (quiet) setRefreshing(true)
      else setLoading(true)

      try {
        const nextStatus = await getStatus(bucketName)
        if (version !== requestVersionRef.current) return
        setSupported(true)
        setAccessDenied(false)

        const configPromise = nextStatus.configured ? getConfig(bucketName) : Promise.resolve(null)
        const backfillPromise = nextStatus.backfill ? getBackfill(bucketName) : Promise.resolve(null)
        const [configResult, backfillResult] = await Promise.allSettled([configPromise, backfillPromise])
        if (version !== requestVersionRef.current) return

        setStatus(nextStatus)
        if (configResult.status === "fulfilled") {
          setConfigResponse(configResult.value)
        } else if (getOnDemandMigrationErrorKind(configResult.reason) === "configuration_missing") {
          setConfigResponse(null)
        } else {
          throw configResult.reason
        }

        if (backfillResult.status === "fulfilled") {
          setJob(backfillResult.value?.job ?? null)
        } else if (getOnDemandMigrationErrorKind(backfillResult.reason) === "backfill_missing") {
          setJob(null)
        } else {
          throw backfillResult.reason
        }
        setLoadError("")
      } catch (error) {
        if (version !== requestVersionRef.current) return
        if (isOnDemandMigrationRouteMissing(error)) {
          setSupported(false)
          setLoadError("")
        } else if (getOnDemandMigrationErrorKind(error) === "access_denied") {
          setAccessDenied(true)
          setLoadError("")
        } else {
          setLoadError(getErrorMessage(error))
        }
      } finally {
        if (version === requestVersionRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [bucketName, canView, getBackfill, getConfig, getStatus, permissionsReady],
  )

  React.useEffect(() => {
    void loadData()
    return () => {
      requestVersionRef.current += 1
    }
  }, [loadData])

  const activeBackfill = isOnDemandMigrationBackfillActive(job?.state ?? status?.backfill?.state)

  React.useEffect(() => {
    if (!activeBackfill || !supported || !canView) return
    const refresh = () => {
      if (document.visibilityState === "visible") void loadData({ quiet: true })
    }
    const interval = window.setInterval(refresh, 4000)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [activeBackfill, canView, loadData, supported])

  const handleDisable = React.useCallback(async () => {
    if (!canEdit || mutation || !configResponse) return
    setMutation("disable")
    try {
      const current = await getConfig(bucketName)
      if (current.updated_at !== configResponse.updated_at) {
        throw new Error(t("Configuration changed on the server. Refresh and review it before disabling migration."))
      }
      await deleteConfig(bucketName)
      message.success(t("On-demand migration disabled"))
      await loadData()
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setMutation(null)
    }
  }, [bucketName, canEdit, configResponse, deleteConfig, getConfig, loadData, message, mutation, t])

  const confirmDisable = () => {
    if (!canEdit || mutation) return
    dialog.error({
      title: t("Disable on-demand migration?"),
      content: t(
        "RustFS will stop consulting the source. Already migrated objects remain local, an active backfill is cancelled, and missing local objects return Not Found.",
      ),
      positiveText: t("Disable migration"),
      negativeText: t("Cancel"),
      onPositiveClick: handleDisable,
    })
  }

  const providerName = React.useMemo(() => {
    const provider = configResponse?.config.source.provider ?? status?.provider
    const names: Record<string, string> = {
      aws: t("Amazon S3"),
      s3: t("S3-compatible storage"),
      minio: "MinIO",
      rustfs: "RustFS",
      r2: "Cloudflare R2",
      gcs: t("Google Cloud Storage (HMAC)"),
      azure: t("Azure Blob Storage (Native)"),
      gcs_native: t("Google Cloud Storage (Native)"),
    }
    return provider ? (names[provider] ?? provider) : "--"
  }, [configResponse?.config.source.provider, status?.provider, t])

  const configurationState = (() => {
    if (!status?.configured) return { label: t("Migration not configured"), variant: "outline" as const }
    if (!status.module_enabled) return { label: t("Server module disabled"), variant: "destructive" as const }
    if (!status.enabled) return { label: t("Migration paused"), variant: "outline" as const }
    if (status.breaker?.state === "open") return { label: t("Source circuit open"), variant: "destructive" as const }
    return { label: t("Migration active"), variant: "secondary" as const }
  })()

  const backfillStateLabel = (state?: OnDemandMigrationBackfillState) => {
    switch (state) {
      case "pending":
        return t("Backfill pending")
      case "running":
        return t("Backfill running")
      case "paused":
        return t("Backfill paused")
      case "cancelled":
        return t("Backfill cancelled")
      case "completed":
        return t("Backfill completed")
      case "completed_with_failures":
        return t("Backfill completed with failures")
      case "failed":
        return t("Backfill failed")
      default:
        return t("No backfill yet")
    }
  }

  const backfillState = job?.state ?? status?.backfill?.state
  const backfillVariant =
    backfillState === "failed" || backfillState === "completed_with_failures"
      ? "destructive"
      : activeBackfill
        ? "secondary"
        : "outline"
  const counters = status?.counters
  const pulledObjects = sumCounterValues(counters?.pulled_objects_total)
  const pullFailures = sumCounterValues(counters?.pull_failures_total)
  const ratio = status?.served_by_source_ratio
  const ratioLabel =
    typeof ratio === "number" && Number.isFinite(ratio)
      ? new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 }).format(ratio)
      : "—"
  const currentJob =
    job ??
    (status?.backfill
      ? ({
          ...status.backfill,
          format_version: 1,
          config_updated_at: status.updated_at ?? "",
          prefix: null,
          skip_existing: "always",
          dry_run: false,
          continuation_token: null,
          last_key: null,
          last_error: null,
          failed_keys: [],
          started_at: status.backfill.updated_at,
          owner: null,
        } satisfies OnDemandMigrationBackfillJob)
      : null)

  const actions = (
    <Button
      variant="outline"
      className="min-h-11 sm:min-h-0"
      onClick={() => loadData({ quiet: true })}
      disabled={loading || refreshing || Boolean(mutation)}
    >
      {refreshing ? <Spinner data-icon="inline-start" /> : <RiRefreshLine data-icon="inline-start" aria-hidden />}
      <span>{t("Refresh")}</span>
    </Button>
  )

  if (!permissionsReady || loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t("Loading on-demand migration settings")}>
        {renderHeader?.(null)}
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    )
  }

  if (!canView || accessDenied) {
    return (
      <>
        {renderHeader?.(null)}
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiCloudLine aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{t("On-demand migration is unavailable")}</EmptyTitle>
            <EmptyDescription>
              {t("You do not have permission to view this bucket's migration settings.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    )
  }

  if (supported === false) {
    return (
      <>
        {renderHeader?.(null)}
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiCloudLine aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{t("On-demand migration is not available on this server")}</EmptyTitle>
            <EmptyDescription>
              {t("Upgrade RustFS to a version that provides the on-demand migration admin API.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    )
  }

  if (loadError) {
    return (
      <>
        {renderHeader?.(actions)}
        <Alert variant="destructive">
          <RiErrorWarningLine aria-hidden />
          <AlertTitle>{t("Unable to load on-demand migration")}</AlertTitle>
          <AlertDescription>
            <p>{loadError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => loadData()}>
              <RiRefreshLine data-icon="inline-start" aria-hidden />
              {t("Retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      {renderHeader?.(actions)}

      {status && !status.module_enabled ? (
        <Alert variant="destructive">
          <RiErrorWarningLine aria-hidden />
          <AlertTitle>{t("On-demand migration is not enabled on this server")}</AlertTitle>
          <AlertDescription>
            {t(
              "Saved settings remain visible, but reads and new backfills are inactive until the module is enabled on every node.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {status?.configured ? (
        <Alert>
          <RiInformationLine aria-hidden />
          <AlertTitle>{t("Plan a read-only source cutover")}</AlertTitle>
          <AlertDescription>
            {t(
              "RustFS pulls objects only when they are read or backfilled. New PUT and DELETE operations in RustFS are not synchronized to the source, and later source changes do not update local copies.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <BucketSettingsSection
        id="migration-configuration"
        title={t("Configuration")}
        description={t("Connect this bucket to an external source without interrupting reads.")}
      >
        {status?.configured ? (
          <BucketSettingRow
            title={t("Source")}
            description={t("Missing local objects are served from this source and then stored locally.")}
            status={configurationState.label}
            statusVariant={configurationState.variant}
            action={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-0"
                  onClick={() => setConfigDialogOpen(true)}
                  disabled={!canEdit || !configResponse || !status.module_enabled || Boolean(mutation)}
                >
                  <RiEditLine data-icon="inline-start" aria-hidden />
                  {t("Edit")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-0"
                  onClick={confirmDisable}
                  disabled={!canEdit || !configResponse || Boolean(mutation)}
                >
                  {mutation === "disable" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RiDeleteBin5Line data-icon="inline-start" aria-hidden />
                  )}
                  {mutation === "disable" ? t("Disabling") : t("Disable")}
                </Button>
              </div>
            }
          >
            <dl className="grid gap-x-6 gap-y-3 pt-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t("Provider")}</dt>
                <dd>{providerName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Endpoint host")}</dt>
                <dd className="break-all font-mono text-xs">{status.endpoint_host ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {configResponse?.config.source.provider === "azure" ? t("Source container") : t("Source Bucket")}
                </dt>
                <dd className="break-all">{configResponse?.config.source.bucket ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Local prefix")}</dt>
                <dd className="break-all font-mono text-xs">{configResponse?.config.filter.prefix ?? t("All keys")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Source prefix")}</dt>
                <dd className="break-all font-mono text-xs">
                  {configResponse?.config.filter.source_prefix ?? t("No added prefix")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("Updated")}</dt>
                <dd>{formatDateTime(configResponse?.updated_at ?? status.updated_at)}</dd>
              </div>
            </dl>
          </BucketSettingRow>
        ) : (
          <Empty className="min-h-48 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiCloudLine aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{t("No migration source configured")}</EmptyTitle>
              <EmptyDescription>
                {t("Connect an existing AWS S3, S3-compatible, Azure Blob, or Google Cloud Storage bucket.")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                className="min-h-11 sm:min-h-0"
                onClick={() => setConfigDialogOpen(true)}
                disabled={!canEdit || status?.module_enabled === false}
                title={!canEdit ? t("Requires admin:SetBucketOnDemandMigration") : undefined}
              >
                <RiAddLine data-icon="inline-start" aria-hidden />
                {t("Enable on-demand migration")}
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </BucketSettingsSection>

      {status?.configured ? (
        <BucketSettingsSection
          id="migration-runtime"
          title={t("Runtime status")}
          description={t("Live counters from the RustFS node that answered this request.")}
        >
          <dl className="grid divide-y sm:grid-cols-2 sm:[&>*]:border-e sm:[&>*:nth-child(even)]:border-e-0 lg:grid-cols-3 lg:[&>*:nth-child(even)]:border-e lg:[&>*:nth-child(3n)]:border-e-0">
            <Metric
              label={t("Source-hit ratio")}
              value={ratioLabel}
              detail={t("Unavailable when the server has no bucket GET total.")}
            />
            <Metric
              label={t("Migrated data")}
              value={counters ? formatBytes(counters.pulled_bytes_total) : "—"}
              detail={counters ? t("Lifetime on this node") : t("No live runtime state on this node")}
            />
            <Metric
              label={t("Migrated objects")}
              value={counters ? formatInteger(pulledObjects) : "—"}
              detail={
                pullFailures > 0
                  ? `${t("Failed objects")}: ${formatInteger(pullFailures)}`
                  : t("No recorded pull failures")
              }
            />
            <Metric label={t("In-flight pulls")} value={formatInteger(status.inflight_pulls)} />
            <Metric label={t("Queue depth")} value={formatInteger(status.queue_depth)} />
            <Metric
              label={t("Circuit breaker")}
              value={
                <Badge
                  variant={status.breaker?.state === "open" ? "destructive" : status.breaker ? "outline" : "ghost"}
                >
                  {status.breaker?.state === "closed"
                    ? t("Breaker closed")
                    : status.breaker?.state === "half_open"
                      ? t("Breaker half-open")
                      : status.breaker?.state === "open"
                        ? t("Breaker open")
                        : t("No runtime state")}
                </Badge>
              }
              detail={
                status.last_source_error
                  ? `${t("Last source error")}: ${status.last_source_error.class} · ${formatDateTime(status.last_source_error.at)}`
                  : t("No source error recorded")
              }
            />
          </dl>
        </BucketSettingsSection>
      ) : null}

      {status?.configured ? (
        <BucketSettingsSection
          id="migration-backfill"
          title={t("Background backfill")}
          description={t("Scan the source and pull objects that have not been requested yet.")}
        >
          <BucketSettingRow
            title={t("Latest job")}
            description={
              activeBackfill
                ? t(
                    "The source scan is active. Totals are not known until listing finishes, so progress is shown as counters.",
                  )
                : t("Start a job when you are ready to migrate the remaining source objects.")
            }
            status={backfillStateLabel(backfillState)}
            statusVariant={backfillVariant}
            action={
              <Button
                variant={activeBackfill ? "outline" : "default"}
                size="sm"
                className="min-h-11 sm:min-h-0"
                onClick={() => setBackfillDialogOpen(true)}
                disabled={
                  !canEdit ||
                  !configResponse ||
                  (!activeBackfill && (!status.enabled || !status.module_enabled)) ||
                  Boolean(mutation)
                }
                title={!canEdit ? t("Requires admin:SetBucketOnDemandMigration") : undefined}
              >
                <RiPlayLine data-icon="inline-start" aria-hidden />
                {activeBackfill ? t("View backfill") : t("Start backfill")}
              </Button>
            }
          >
            {currentJob ? (
              <dl className="grid gap-x-6 gap-y-3 pt-1 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <dt className="text-muted-foreground">{t("Listed")}</dt>
                  <dd className="tabular-nums">{formatInteger(currentJob.listed)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Pulled")}</dt>
                  <dd className="tabular-nums">{formatInteger(currentJob.pulled)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Skipped")}</dt>
                  <dd className="tabular-nums">{formatInteger(currentJob.skipped_existing)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Failed objects")}</dt>
                  <dd className={currentJob.failed > 0 ? "text-destructive tabular-nums" : "tabular-nums"}>
                    {formatInteger(currentJob.failed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Data")}</dt>
                  <dd className="tabular-nums">{formatBytes(currentJob.bytes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Updated")}</dt>
                  <dd>{formatDateTime(currentJob.updated_at)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("No background backfill has been started for this bucket.")}
              </p>
            )}
            {currentJob?.last_error ? (
              <Alert variant="destructive" className="mt-3">
                <AlertTitle>{t("Last backfill error")}</AlertTitle>
                <AlertDescription>
                  {currentJob.last_error.class} · {formatDateTime(currentJob.last_error.at)}
                </AlertDescription>
              </Alert>
            ) : null}
          </BucketSettingRow>
        </BucketSettingsSection>
      ) : null}

      <OnDemandMigrationConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        bucketName={bucketName}
        config={configResponse?.config ?? null}
        moduleEnabled={status?.module_enabled ?? true}
        backfillActive={activeBackfill}
        onSaved={loadData}
      />
      <OnDemandMigrationBackfillDialog
        open={backfillDialogOpen}
        onOpenChange={setBackfillDialogOpen}
        bucketName={bucketName}
        moduleEnabled={status?.module_enabled ?? true}
        job={currentJob}
        onChanged={loadData}
      />
    </>
  )
}
