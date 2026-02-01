"use client"

import * as React from "react"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { usePerformanceData } from "@/hooks/use-performance-data"
import { niceBytes } from "@/lib/functions"
import { RiArchiveDrawerFill, RiArchiveLine, RiHardDrive2Line, RiListSettingsFill, RiRefreshLine, RiSecurePaymentFill, RiStackLine } from "@remixicon/react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PerformanceSummaryCards } from "./_components/performance-summary-cards"
import { PerformanceUsageCard } from "./_components/performance-usage-card"
import { PerformanceInfrastructureCard } from "./_components/performance-infrastructure-card"
import { PerformanceBackendCard } from "./_components/performance-backend-card"
import { PerformanceServerList } from "./_components/performance-server-list"

dayjs.extend(relativeTime)

export default function PerformancePage() {
  const { t } = useTranslation()
  const {
    systemInfo,
    metricsInfo,
    datausageinfo,
    storageinfo,
    loading,
    error,
    refetch,
  } = usePerformanceData()

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), [])

  const storageBackend = useMemo(
    () =>
      storageinfo?.backend ??
      (storageinfo as { Backend?: typeof storageinfo.backend })?.Backend,
    [storageinfo]
  )

  const usedPercent = useMemo(() => {
    const total = Number(datausageinfo.total_capacity || 0)
    if (!total) return 0
    const used = Number(datausageinfo.total_used_capacity || 0)
    return Math.min(100, Math.max(0, (used / total) * 100))
  }, [datausageinfo])

  const lastUpdatedLabel = useMemo(() => {
    const last = metricsInfo?.aggregated?.scanner?.current_started
    const time = dayjs(last)
    return time.isValid() ? time.fromNow() : "--"
  }, [metricsInfo])

  const summaryMetrics = useMemo(
    () => [
      {
        label: t("Buckets"),
        display: numberFormatter.format(systemInfo?.buckets?.count ?? 0),
        icon: RiArchiveLine,
        caption: null as string | null,
        href: "/browser",
      },
      {
        label: t("Objects"),
        display: numberFormatter.format(systemInfo?.objects?.count ?? 0),
        icon: RiStackLine,
        caption: null as string | null,
        href: "/browser",
      },
      {
        label: t("Total Capacity"),
        display: datausageinfo.total_capacity
          ? niceBytes(String(datausageinfo.total_capacity))
          : "--",
        icon: RiHardDrive2Line,
        caption: datausageinfo.total_used_capacity
          ? `${t("Used")}: ${niceBytes(String(datausageinfo.total_used_capacity))}`
          : null,
        href: undefined as string | undefined,
      },
    ],
    [systemInfo, datausageinfo, numberFormatter, t]
  )

  const fromLastStartTime = useMemo(() => {
    const times =
      metricsInfo?.aggregated?.scanner?.cycle_complete_times || []
    if (!times.length) return "--"
    const start = dayjs(times[times.length - 1])
    return dayjs().from(start)
  }, [metricsInfo])

  const fromLastScanTime = useMemo(() => {
    const start = dayjs(metricsInfo?.aggregated?.scanner?.current_started)
    if (!start.isValid()) return "--"
    return dayjs().from(start)
  }, [metricsInfo])

  const lastScanTime = useMemo(() => {
    const currentStart = dayjs(
      metricsInfo?.aggregated?.scanner?.current_started
    )
    const cycleTimes =
      metricsInfo?.aggregated?.scanner?.cycle_complete_times || []
    if (!currentStart.isValid()) return "--"
    const lastComplete = dayjs(cycleTimes[cycleTimes.length - 1])
    return lastComplete.isValid() && currentStart.isBefore(lastComplete)
      ? lastComplete.from(currentStart)
      : dayjs().from(currentStart)
  }, [metricsInfo])

  const usageStats = useMemo(
    () => [
      { label: t("Last Normal Operation"), value: fromLastStartTime },
      { label: t("Last Scan Activity"), value: fromLastScanTime },
      { label: t("Uptime"), value: lastScanTime },
    ],
    [t, fromLastStartTime, fromLastScanTime, lastScanTime]
  )

  const onlineServers = useMemo(
    () => (systemInfo?.servers || []).filter((s) => s.state === "online").length,
    [systemInfo]
  )

  const offlineServers = useMemo(
    () =>
      (systemInfo?.servers || []).filter((s) => s.state === "offline").length,
    [systemInfo]
  )

  const backendInfo = useMemo(
    () => [
      {
        icon: RiArchiveDrawerFill,
        title: t("Backend Type"),
        value: systemInfo?.backend?.backendType,
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
    [systemInfo, storageBackend, t]
  )

  if (
    loading &&
    !Object.keys(systemInfo).length &&
    !Object.keys(datausageinfo).length
  ) {
    return (
      <Page>
        <PageHeader>
          <h1 className="text-2xl font-bold">{t("Server Information")}</h1>
        </PageHeader>
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      </Page>
    )
  }

  if (error) {
    return (
      <Page>
        <PageHeader
          actions={
            <Button variant="outline" onClick={refetch}>
              <RiRefreshLine className="mr-2 size-4" aria-hidden />
              {t("Sync")}
            </Button>
          }
        >
          <h1 className="text-2xl font-bold">{t("Server Information")}</h1>
        </PageHeader>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        actions={
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RiRefreshLine className="mr-2 size-4" aria-hidden />
            {t("Sync")}
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">{t("Server Information")}</h1>
      </PageHeader>

      <div className="space-y-8">
        <PerformanceSummaryCards metrics={summaryMetrics} />

        <PerformanceUsageCard
          lastUpdatedLabel={lastUpdatedLabel}
          totalUsedCapacity={datausageinfo.total_used_capacity ?? 0}
          usedPercent={usedPercent}
          usageStats={usageStats}
          t={t}
        />

        <PerformanceInfrastructureCard
          onlineServers={onlineServers}
          offlineServers={offlineServers}
          onlineDisks={systemInfo?.backend?.onlineDisks ?? 0}
          offlineDisks={systemInfo?.backend?.offlineDisks ?? 0}
          t={t}
        />

        <PerformanceBackendCard items={backendInfo} t={t} />

        <PerformanceServerList
          servers={systemInfo?.servers ?? []}
          t={t}
        />
      </div>
    </Page>
  )
}
