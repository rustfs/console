"use client"

import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { usePerformanceData, type PerformanceDataSource } from "@/hooks/use-performance-data"
import { usePermissions } from "@/hooks/use-permissions"
import {
  buildRunningStatusView,
  formatRelativeTime,
  resolveUsageFreshness,
  localScannerView,
  scannerAttemptLabels,
} from "@/lib/performance-data"
import { formatDateTimeWithOffset, formatDuration, niceBytes } from "@/lib/functions"
import { cn } from "@/lib/utils"
import {
  RiArchiveDrawerFill,
  RiArchiveLine,
  RiListSettingsFill,
  RiRefreshLine,
  RiSecurePaymentFill,
  RiStackLine,
} from "@remixicon/react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PerformanceBackendCard } from "../_components/performance-backend-card"
import { PerformanceInfrastructureCard } from "../_components/performance-infrastructure-card"
import { PerformanceServerList } from "../_components/performance-server-list"
import { PerformanceSummaryCards } from "../_components/performance-summary-cards"
import { PerformanceStatusSources } from "../_components/performance-status-sources"
import { PerformanceStatusSummary } from "../_components/performance-status-summary"
import { PerformanceUsageCard } from "../_components/performance-usage-card"

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
    usageUpdatedAt,
    metricsUpdatedAt,
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

  const inventory = systemInfo.inventory
  const count = (value: number | undefined) => (value === undefined ? t("Unknown") : numberFormatter.format(value))
  const coverage = (measured: number | undefined, total: number | undefined) =>
    measured !== undefined && total !== undefined && measured <= total
      ? `${count(measured)} / ${count(total)}`
      : t("Unknown")
  const summaryMetrics = inventory
    ? [
        {
          label: t("Current buckets"),
          display: count(inventory.currentBuckets),
          icon: RiArchiveLine,
          caption: null,
          href: browserHref,
        },
        {
          label: t("Measured buckets"),
          display: coverage(inventory.measuredBuckets, inventory.currentBuckets),
          icon: RiArchiveLine,
          caption: null,
        },
        { label: t("Measured objects"), display: count(inventory.measuredObjects), icon: RiStackLine, caption: null },
        {
          label: t("Measured size"),
          display: inventory.measuredBytes === undefined ? t("Unknown") : niceBytes(String(inventory.measuredBytes)),
          icon: RiStackLine,
          caption: null,
        },
      ]
    : [
        {
          label: t("Reported buckets"),
          display: count(systemInfo.buckets?.count),
          icon: RiArchiveLine,
          caption: null,
          href: browserHref,
        },
        { label: t("Reported objects"), display: count(systemInfo.objects?.count), icon: RiStackLine, caption: null },
      ]

  const scanner = metricsInfo.clusterScanner
  const localScanner = sourceErrors.metrics ? undefined : localScannerView(metricsInfo)
  const current = !sourceErrors.metrics ? scanner?.current : undefined
  const state = sourceErrors.metrics ? "unknown" : scanner?.state
  const lastAttempt = scanner?.lastAttempt
  const sinceStart =
    current?.startedAt && scanner?.sampledAt
      ? (Date.parse(scanner.sampledAt) - Date.parse(current.startedAt)) / 1000
      : undefined
  const scannerLabel = { scanning: t("Scanning"), idle: t("Idle"), unknown: t("Unknown") }
  const lastAttemptDescription =
    lastAttempt &&
    [
      lastAttempt.cycle === undefined ? undefined : "#" + count(lastAttempt.cycle),
      ...scannerAttemptLabels(lastAttempt.result, lastAttempt.partialReason).map((key) => t(key)),
      lastAttempt.durationSeconds === undefined ? undefined : formatDuration(lastAttempt.durationSeconds, t),
    ]
      .filter(Boolean)
      .join(" · ")
  const usageStats = [
    { label: t("Cluster scanner status"), value: state ? scannerLabel[state] : t("Not reported") },
    { label: t("Scanner status on this node"), value: localScanner && scannerLabel[localScanner.state] },
    {
      label: t("Cycle reported by this node"),
      value: localScanner?.cycle === undefined ? undefined : count(localScanner.cycle),
    },
    {
      label: t("Last completed scan on this node"),
      value: localScanner?.completedAt && formatDateTimeWithOffset(localScanner.completedAt),
    },
    {
      label: t("Last successful update"),
      value:
        sourceErrors.metrics && metricsUpdatedAt
          ? t("Stale") + " · " + formatDateTimeWithOffset(metricsUpdatedAt)
          : undefined,
    },
    { label: t("Responding nodes"), value: scanner && coverage(scanner.nodesResponded, scanner.nodesTotal) },
    { label: t("Sample time"), value: scanner?.sampledAt && formatDateTimeWithOffset(scanner.sampledAt) },
    { label: t("Current cycle"), value: current?.cycle === undefined ? undefined : count(current.cycle) },
    { label: t("Scanner leader"), value: current?.leader },
    { label: t("Started"), value: current?.startedAt && formatDateTimeWithOffset(current.startedAt) },
    {
      label: t("Scan Duration"),
      value: sinceStart !== undefined && sinceStart >= 0 ? formatDuration(sinceStart, t) : undefined,
    },
    {
      label: t("Objects scanned"),
      value: current?.objectsScanned === undefined ? undefined : count(current.objectsScanned),
    },
    { label: t("Last scan attempt"), value: lastAttemptDescription },
    {
      label: t("Last successful scan"),
      value: scanner?.lastSuccessAt ? formatDateTimeWithOffset(scanner.lastSuccessAt) : t("Not reported"),
    },
  ].filter((stat): stat is { label: string; value: string } => stat.value !== undefined)

  const runningStatus = useMemo(
    () => buildRunningStatusView(systemInfo, diagnosticsInfo),
    [diagnosticsInfo, systemInfo],
  )
  const serverSummary = runningStatus.serverSummary

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

        <PerformanceStatusSummary
          onlineServers={serverSummary?.online}
          offlineServers={serverSummary?.offline}
          degradedServers={serverSummary?.degraded}
          initializingServers={serverSummary?.initializing}
          unknownServers={serverSummary?.unknown}
          onlineDisks={systemInfo.backend?.onlineDisks}
          offlineDisks={systemInfo.backend?.offlineDisks}
          unknownDisks={systemInfo.backend?.unknownDisks}
          topology={runningStatus.topology}
          peerHealth={diagnosticsInfo?.peerHealth}
          storageReadiness={diagnosticsInfo?.storageReadiness}
          t={t}
        />

        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-8">
            <PerformanceInfrastructureCard
              onlineServers={serverSummary?.online}
              offlineServers={serverSummary?.offline}
              degradedServers={serverSummary?.degraded}
              initializingServers={serverSummary?.initializing}
              unknownServers={serverSummary?.unknown}
              onlineDisks={systemInfo.backend?.onlineDisks}
              offlineDisks={systemInfo.backend?.offlineDisks}
              unknownDisks={systemInfo.backend?.unknownDisks}
              topology={runningStatus.topology}
              peerHealth={diagnosticsInfo?.peerHealth}
              storageReadiness={diagnosticsInfo?.storageReadiness}
              t={t}
            />
            <PerformanceServerList
              servers={runningStatus.servers}
              diagnostics={diagnosticsInfo}
              topology={runningStatus.topology}
              t={t}
            />
          </div>
          <aside className="min-w-0 space-y-8" aria-label={t("Storage Usage Statistics")}>
            <PerformanceUsageCard
              totalCapacity={totalCapacity}
              totalFreeCapacity={totalFreeCapacity}
              totalUsedCapacity={totalUsedCapacity}
              usedPercent={usedPercent}
              usageStats={usageStats}
              usageFreshness={diagnosticsInfo ? usageFreshness : undefined}
              t={t}
            />
            <PerformanceSummaryCards
              metrics={summaryMetrics}
              title={t("Inventory")}
              previous={
                sourceErrors.system && lastUpdatedAt
                  ? {
                      label: t("Stale"),
                      description: t("Last successful update"),
                      time: lastUpdatedAt.toISOString(),
                      displayTime: formatDateTimeWithOffset(lastUpdatedAt),
                    }
                  : undefined
              }
              detail={
                inventory
                  ? [
                      inventory.snapshotAt &&
                        t("Snapshot time") + " · " + formatDateTimeWithOffset(inventory.snapshotAt),
                      inventory.converged === false && t("Usage has not converged"),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : t("Snapshot coverage and time were not reported")
              }
            />
          </aside>
        </div>

        <PerformanceBackendCard items={backendInfo} t={t} />

        <PerformanceStatusSources
          diagnostics={diagnosticsInfo}
          usageFreshness={diagnosticsInfo ? usageFreshness : undefined}
          t={t}
        />
      </div>
    </Page>
  )
}
