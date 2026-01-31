"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import {
  RiRefreshLine,
  RiArchiveLine,
  RiStackLine,
  RiHardDrive2Line,
  RiDatabase2Line,
  RiSignalWifiLine,
  RiScanLine,
  RiTimeLine,
  RiArchiveDrawerFill,
  RiSecurePaymentFill,
  RiListSettingsFill,
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { useSystem } from "@/hooks/use-system"
import { niceBytes } from "@/lib/functions"
import { cn } from "@/lib/utils"

dayjs.extend(relativeTime)

interface ServerInfo {
  endpoint?: string
  state?: string
  version?: string
  uptime?: number
  drives?: Array<{
    uuid?: string
    drive_path?: string
    usedspace?: number
    totalspace?: number
    availspace?: number
    state?: string
  }>
  network?: Record<string, string>
}

interface SystemInfo {
  buckets?: { count?: number }
  objects?: { count?: number }
  servers?: ServerInfo[]
  backend?: {
    backendType?: string
    onlineDisks?: number
    offlineDisks?: number
  }
}

interface DataUsageInfo {
  total_capacity?: number
  total_used_capacity?: number
}

interface StorageInfo {
  backend?: {
    StandardSCParity?: string
    RRSCParity?: string
  }
}

interface MetricsInfo {
  aggregated?: {
    scanner?: {
      current_started?: string
      cycle_complete_times?: string[]
    }
  }
}

export default function PerformancePage() {
  const { t } = useTranslation()
  const systemApi = useSystem()

  const [metricsInfo, setMetricsInfo] = useState<MetricsInfo>({})
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})
  const [datausageinfo, setDatausageinfo] = useState<DataUsageInfo>({})
  const [storageinfo, setStorageinfo] = useState<StorageInfo>({})
  const [loading, setLoading] = useState(false)

  const numberFormatter = useMemo(() => new Intl.NumberFormat(), [])

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
        label: t("Storage Space"),
        display: numberFormatter.format(systemInfo?.buckets?.count ?? 0),
        icon: RiArchiveLine,
        caption: null as string | null,
      },
      {
        label: t("Objects"),
        display: numberFormatter.format(systemInfo?.objects?.count ?? 0),
        icon: RiStackLine,
        caption: null as string | null,
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
    const start = dayjs(
      metricsInfo?.aggregated?.scanner?.current_started
    )
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
      {
        label: t("Last Normal Operation"),
        value: fromLastStartTime,
      },
      {
        label: t("Last Scan Activity"),
        value: fromLastScanTime,
      },
      {
        label: t("Uptime"),
        value: lastScanTime,
      },
    ],
    [t, fromLastStartTime, fromLastScanTime, lastScanTime]
  )

  const onlineServers = useMemo(
    () =>
      (systemInfo?.servers || []).filter(
        (s) => s.state === "online"
      ).length,
    [systemInfo]
  )

  const offlineServers = useMemo(
    () =>
      (systemInfo?.servers || []).filter(
        (s) => s.state === "offline"
      ).length,
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
        value: storageinfo?.backend?.StandardSCParity,
      },
      {
        icon: RiListSettingsFill,
        title: t("Reduced Redundancy Parity"),
        value: storageinfo?.backend?.RRSCParity,
      },
    ],
    [systemInfo, storageinfo, t]
  )

  const countOnlineDrives = (server: ServerInfo, type: string) =>
    (server?.drives || []).filter((d) => d.state === type).length

  const countOnlineNetworks = (
    server: ServerInfo,
    type: string
  ) =>
    Object.values(server?.network || {}).filter(
      (state) => state === type
    ).length

  const getPageData = useCallback(async () => {
    setLoading(true)
    try {
      const [sysRes, usageRes, storageRes, metricsRes] =
        await Promise.all([
          systemApi.getSystemInfo(),
          systemApi.getDataUsageInfo(),
          systemApi.getStorageInfo(),
          systemApi.getSystemMetrics(),
        ])
      setSystemInfo((sysRes as SystemInfo) ?? {})
      setDatausageinfo((usageRes as DataUsageInfo) ?? {})
      setStorageinfo((storageRes as StorageInfo) ?? {})
      setMetricsInfo((metricsRes as MetricsInfo) ?? {})
    } catch (error) {
      console.error("Failed to load performance data:", error)
    } finally {
      setLoading(false)
    }
  }, [systemApi])

  useEffect(() => {
    getPageData()
  }, [getPageData])

  return (
    <Page>
      <PageHeader
        actions={
          <Button variant="outline" onClick={getPageData} disabled={loading}>
            <RiRefreshLine className="mr-2 size-4" aria-hidden />
            {t("Sync")}
          </Button>
        }
      >
        <h1 className="text-2xl font-bold">
          {t("Server Information")}
        </h1>
      </PageHeader>

      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summaryMetrics.map((metric) => (
            <Card key={metric.label} className="shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
                <metric.icon
                  className="size-5 text-muted-foreground"
                  aria-hidden
                />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  {metric.display}
                </p>
                {metric.caption && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.caption}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{t("Usage Report")}</CardTitle>
              <span className="text-sm text-muted-foreground">
                {t("Last Scan Activity")}: {lastUpdatedLabel}
              </span>
            </div>
            <CardDescription>
              {t(
                "Monitor overall storage usage and recent scanner activity at a glance."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <RiDatabase2Line
                  className="size-6 text-primary"
                  aria-hidden
                />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("Used Capacity")}
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    {niceBytes(
                      String(datausageinfo.total_used_capacity ?? 0)
                    )}
                  </p>
                </div>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <Progress value={usedPercent} className="h-2" />
                <p className="text-right text-xs text-muted-foreground">
                  {usedPercent.toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {usageStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border bg-muted/40 p-4"
                >
                  <p className="text-xs uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>{t("Infrastructure Health")}</CardTitle>
            <CardDescription>
              {t(
                "Real-time status of cluster servers and backend storage devices."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("Servers")}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("Online")}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {onlineServers}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("Offline")}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {offlineServers}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("Disks")}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("Online")}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {systemInfo?.backend?.onlineDisks ?? 0}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("Offline")}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {systemInfo?.backend?.offlineDisks ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{t("Backend Services")}</CardTitle>
            <CardDescription>
              {t(
                "Key services and configuration values reported by the cluster."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {backendInfo.map((item) => (
                <Card
                  key={item.title}
                  className="border bg-muted/40 shadow-none"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item.title}
                    </CardTitle>
                    <item.icon
                      className="size-5 text-muted-foreground"
                      aria-hidden
                    />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-foreground">
                      {item.value ?? "-"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("Server List")}</CardTitle>
              <CardDescription>
                {t(
                  "Inspect individual server health, disk utilization, and network status."
                )}
              </CardDescription>
            </div>
            <span className="text-sm text-muted-foreground">
              {t("Total")}: {systemInfo?.servers?.length ?? 0}
            </span>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {(systemInfo?.servers || []).map((server, index) => (
                <AccordionItem
                  key={server.endpoint ?? index}
                  value={String(index)}
                >
                  <AccordionTrigger>
                    <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex h-2 w-2 rounded-full",
                            server.state === "online"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          )}
                        />
                        <span className="font-semibold">
                          {server.endpoint ?? "--"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {t("Disks")}:{" "}
                          {countOnlineDrives(server, "ok")} /{" "}
                          {server.drives?.length ?? 0}
                        </span>
                        <span>
                          {t("Network")}:{" "}
                          {countOnlineNetworks(server, "online")} /{" "}
                          {Object.keys(server.network ?? {}).length}
                        </span>
                        <span>
                          {t("Uptime")}:{" "}
                          {server.uptime != null
                            ? dayjs()
                                .subtract(server.uptime, "second")
                                .fromNow()
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pb-2 text-xs text-muted-foreground">
                      {t("Version")}: {server.version ?? "--"}
                    </p>
                    <ScrollArea className="w-full">
                      <div className="flex gap-4 pb-2">
                        {(server.drives || []).map((drive) => (
                          <Card
                            key={drive.uuid ?? drive.drive_path}
                            className="min-w-[260px] shadow-none"
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                {drive.drive_path ?? "--"}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {niceBytes(String(drive.usedspace ?? 0))} /{" "}
                                {niceBytes(String(drive.totalspace ?? 0))}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Progress
                                value={
                                  drive.totalspace
                                    ? ((drive.usedspace ?? 0) /
                                        drive.totalspace) *
                                      100
                                    : 0
                                }
                                className="mb-3 h-2"
                              />
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>
                                  {t("Used")}:{" "}
                                  <span className="font-medium text-foreground">
                                    {niceBytes(
                                      String(drive.usedspace ?? 0)
                                    )}
                                  </span>
                                </p>
                                <p>
                                  {t("Available")}:{" "}
                                  <span className="font-medium text-foreground">
                                    {niceBytes(
                                      String(drive.availspace ?? 0)
                                    )}
                                  </span>
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
