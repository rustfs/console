"use client"

import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { usePerformanceData, type PerformanceDataSource } from "@/hooks/use-performance-data"
import { usePermissions } from "@/hooks/use-permissions"
import { formatRelativeTime, resolveUsageFreshness, summarizeServerStates } from "@/lib/performance-data"
import { cn } from "@/lib/utils"
import {
  RiArchiveDrawerFill,
  RiArchiveLine,
  RiListSettingsFill,
  RiRefreshLine,
  RiSecurePaymentFill,
  RiStackLine,
} from "@remixicon/react"
import dayjs from "dayjs"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PerformanceBackendCard } from "../_components/performance-backend-card"
import { PerformanceInfrastructureCard } from "../_components/performance-infrastructure-card"
import { PerformanceServerList } from "../_components/performance-server-list"
import { PerformanceSummaryCards } from "../_components/performance-summary-cards"
import { PerformanceStatusSources } from "../_components/performance-status-sources"
import { PerformanceUsageCard } from "../_components/performance-usage-card"

function formatDuration(seconds: number | undefined, t: (key: string) => string) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return t("Unknown")
  const totalMinutes = Math.floor(seconds / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = [
    days ? `${days} ${t("Days")}` : "",
    hours ? `${hours} ${t("Hours")}` : "",
    !days && minutes ? `${minutes} ${t("Minutes")}` : "",
  ].filter(Boolean)
  return parts.slice(0, 2).join(" ") || `0 ${t("Minutes")}`
}

export default function PerformancePage() {
  const { t, i18n } = useTranslation()
  const { canAccessPath } = usePermissions()
  const {
    systemInfo,
    metricsInfo,
    datausageinfo,
    storageinfo,
    diagnosticsInfo,
    loading,
    refreshing,
    hasLoaded,
    error,
    sourceErrors,
    lastUpdatedAt,
    metricsUpdatedAt,
    usageUpdatedAt,
    refetch,
  } = usePerformanceData()
  const browserHref = canAccessPath("/browser") ? "/browser" : undefined

  const numberFormatter = useMemo(() => new Intl.NumberFormat(i18n.resolvedLanguage), [i18n.resolvedLanguage])
  const storageBackend = storageinfo.backend

  const totalCapacity = datausageinfo.total_capacity
  const totalFreeCapacity = datausageinfo.total_free_capacity
  const totalUsedCapacity = datausageinfo.total_used_capacity
  const usedPercent = useMemo(() => {
    if (totalCapacity === undefined || totalUsedCapacity === undefined) return undefined
    if (totalCapacity === 0) return totalUsedCapacity === 0 ? 0 : undefined
    return Math.min(100, Math.max(0, (totalUsedCapacity / totalCapacity) * 100))
  }, [totalCapacity, totalUsedCapacity])

  const summaryMetrics = useMemo(
    () => [
      {
        label: t("Buckets"),
        display:
          systemInfo.buckets?.count === undefined ? t("Unknown") : numberFormatter.format(systemInfo.buckets.count),
        icon: RiArchiveLine,
        caption: null as string | null,
        href: browserHref,
      },
      {
        label: t("Objects"),
        display:
          systemInfo.objects?.count === undefined ? t("Unknown") : numberFormatter.format(systemInfo.objects.count),
        icon: RiStackLine,
        caption: null as string | null,
        href: browserHref,
      },
    ],
    [browserHref, numberFormatter, systemInfo.buckets, systemInfo.objects, t],
  )

  const scannerStartedAt = metricsInfo.aggregated?.scanner?.current_started
  const scannerCycle = metricsInfo.aggregated?.scanner?.current_cycle
  const scannerCompleteTimes = metricsInfo.aggregated?.scanner?.cycle_complete_times ?? []
  const scannerCompletedAt = scannerCompleteTimes.at(-1)
  const scannerActive = (scannerCycle ?? 0) > 0
  const scannerStatus = scannerActive ? t("Scanning") : scannerCompletedAt ? t("Idle") : t("Never run")
  const scannerDuration = useMemo(() => {
    if (!scannerStartedAt) return undefined
    const started = dayjs(scannerStartedAt)
    if (!started.isValid()) return undefined
    if (scannerActive) return Math.max(0, dayjs(metricsUpdatedAt ?? undefined).diff(started, "second"))
    if (!scannerCompletedAt) return undefined
    const completed = dayjs(scannerCompletedAt)
    return completed.isValid() && completed.isAfter(started)
      ? Math.max(0, completed.diff(started, "second"))
      : undefined
  }, [metricsUpdatedAt, scannerActive, scannerCompletedAt, scannerStartedAt])

  const usageStats = useMemo(
    () => [
      {
        label: t("Last Completed Scan"),
        value: scannerCompletedAt
          ? (formatRelativeTime(scannerCompletedAt, i18n.resolvedLanguage, metricsUpdatedAt?.getTime()) ?? t("Unknown"))
          : t("Unknown"),
      },
      {
        label: t("Scanner Status"),
        value: scannerStatus,
      },
      { label: t("Scan Duration"), value: formatDuration(scannerDuration, t) },
    ],
    [i18n.resolvedLanguage, metricsUpdatedAt, scannerCompletedAt, scannerDuration, scannerStatus, t],
  )

  const serverSummary = useMemo(
    () => (systemInfo.servers ? summarizeServerStates(systemInfo.servers, diagnosticsInfo) : undefined),
    [diagnosticsInfo, systemInfo.servers],
  )

  const usageFreshness = useMemo(
    () =>
      resolveUsageFreshness(diagnosticsInfo?.usageFreshness, {
        hasData:
          datausageinfo.total_capacity !== undefined ||
          datausageinfo.total_free_capacity !== undefined ||
          datausageinfo.total_used_capacity !== undefined,
        error: sourceErrors.usage,
        lastUpdatedAt: usageUpdatedAt,
      }),
    [datausageinfo, diagnosticsInfo?.usageFreshness, sourceErrors.usage, usageUpdatedAt],
  )

  const backendInfo = useMemo(
    () => [
      {
        icon: RiArchiveDrawerFill,
        title: t("Backend Type"),
        value: systemInfo.backend?.backendType ?? storageBackend?.BackendType,
      },
      {
        icon: RiSecurePaymentFill,
        title: t("Standard Storage Parity"),
        value: storageBackend?.StandardSCParity,
      },
      {
        icon: RiListSettingsFill,
        title: t("Reduced Redundancy Parity"),
        value: storageBackend?.RRSCParity,
      },
    ],
    [storageBackend, systemInfo.backend?.backendType, t],
  )

  const unavailableSources = Object.keys(sourceErrors) as PerformanceDataSource[]
  const sourceLabels: Record<PerformanceDataSource, string> = {
    system: t("Cluster information"),
    usage: t("Storage Usage Statistics"),
    storage: t("Storage Configuration"),
    metrics: t("Scanner metrics"),
    diagnostics: t("Cluster diagnostics"),
  }

  const refreshAction = (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {lastUpdatedAt ? (
        <span className="text-xs text-muted-foreground">
          {t("Last refreshed")}: {formatRelativeTime(lastUpdatedAt, i18n.resolvedLanguage) ?? t("Unknown")}
        </span>
      ) : null}
      <Button variant="outline" className="min-h-11 sm:min-h-0" onClick={refetch} disabled={refreshing}>
        <RiRefreshLine
          className={cn("me-2 size-4", refreshing && "animate-spin motion-reduce:animate-none")}
          aria-hidden
        />
        {refreshing ? t("Refreshing…") : t("Refresh")}
      </Button>
    </div>
  )

  if (loading && !hasLoaded) {
    return (
      <Page>
        <PageHeader>
          <h1 className="text-2xl font-bold">{t("Running Status")}</h1>
        </PageHeader>
        <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
          <Spinner className="size-6 motion-reduce:animate-none" role="presentation" aria-hidden />
          <span>{t("Loading…")}</span>
        </div>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <PageHeader actions={refreshAction}>
          <h1 className="text-2xl font-bold">{t("Running Status")}</h1>
        </PageHeader>
        <div className="border border-destructive/50 bg-destructive/10 p-6" role="alert">
          <p className="font-medium text-destructive">{t(error)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Check your connection, then refresh the status page.")}
          </p>
          <Button variant="outline" className="mt-4 min-h-11 sm:min-h-0" onClick={refetch} disabled={refreshing}>
            <RiRefreshLine
              className={cn("me-2 size-4", refreshing && "animate-spin motion-reduce:animate-none")}
              aria-hidden
            />
            {refreshing ? t("Refreshing…") : t("Refresh")}
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader actions={refreshAction}>
        <h1 className="text-2xl font-bold">{t("Running Status")}</h1>
      </PageHeader>

      <div className="space-y-6" aria-busy={refreshing}>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {refreshing
            ? t("Refreshing…")
            : !unavailableSources.length && lastUpdatedAt
              ? t("Status refreshed successfully")
              : ""}
        </span>

        {unavailableSources.length ? (
          <div className="border border-amber-500/40 bg-amber-500/10 p-4" role="status" aria-live="polite">
            <p className="text-sm font-medium">{t("Some status data is unavailable.")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Previously loaded values may be stale.")} {t("Unavailable")}:{" "}
              {unavailableSources.map((source) => sourceLabels[source]).join(", ")}. {t("Refresh to try again.")}
            </p>
          </div>
        ) : null}

        <PerformanceStatusSources
          diagnostics={diagnosticsInfo}
          usageFreshness={diagnosticsInfo ? usageFreshness : undefined}
          t={t}
          locale={i18n.resolvedLanguage}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="order-1">
            <PerformanceInfrastructureCard
              onlineServers={serverSummary?.online}
              offlineServers={serverSummary?.offline}
              degradedServers={serverSummary?.degraded}
              initializingServers={serverSummary?.initializing}
              unknownServers={serverSummary?.unknown}
              onlineDisks={systemInfo.backend?.onlineDisks}
              offlineDisks={systemInfo.backend?.offlineDisks}
              unknownDisks={systemInfo.backend?.unknownDisks}
              t={t}
            />
          </div>

          <div className="order-3 xl:order-2">
            <PerformanceUsageCard
              totalCapacity={totalCapacity}
              totalFreeCapacity={totalFreeCapacity}
              totalUsedCapacity={totalUsedCapacity}
              usedPercent={usedPercent}
              usageStats={usageStats}
              t={t}
            />
          </div>

          <div className="order-2 xl:order-3 xl:col-span-2">
            <PerformanceServerList servers={systemInfo.servers} diagnostics={diagnosticsInfo} t={t} />
          </div>
        </div>

        <PerformanceSummaryCards metrics={summaryMetrics} title={t("Inventory")} />

        <PerformanceBackendCard items={backendInfo} t={t} />
      </div>
    </Page>
  )
}
