"use client"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { niceBytes } from "@/lib/functions"
import type { StatusDiagnostic } from "@/lib/performance-data"

export interface UsageStat {
  label: string
  value: string
}

export function PerformanceUsageCard({
  totalCapacity,
  totalFreeCapacity,
  totalUsedCapacity,
  usedPercent,
  usageStats,
  usageFreshness,
  t,
}: {
  totalCapacity?: number
  totalFreeCapacity?: number
  totalUsedCapacity?: number
  usedPercent?: number
  usageStats: UsageStat[]
  usageFreshness?: StatusDiagnostic
  t: (key: string) => string
}) {
  const formatCapacity = (value?: number) => (value === undefined ? t("Unknown") : niceBytes(String(value)))
  const freshnessNeedsAttention = usageFreshness?.state === "degraded" || usageFreshness?.state === "stale"

  return (
    <Card className="capacity-panel shadow-none">
      <CardHeader className="pb-3">
        <h2 id="storage-usage-title" className="text-base font-semibold">
          {t("Storage Usage and Scanner")}
        </h2>
        <CardDescription>{t("Review capacity pressure and scanner activity in one place.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4" aria-labelledby="storage-usage-title">
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("Usable Capacity Used")}</p>
              <p className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatCapacity(totalUsedCapacity)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div
              role={usedPercent === undefined ? "img" : "meter"}
              aria-label={`${t("Usable Capacity Used")}${usedPercent === undefined ? `: ${t("Unknown")}` : ""}`}
              aria-valuemin={usedPercent === undefined ? undefined : 0}
              aria-valuemax={usedPercent === undefined ? undefined : 100}
              aria-valuenow={usedPercent}
              aria-valuetext={usedPercent === undefined ? t("Unknown") : `${usedPercent.toFixed(0)}%`}
              className="grid h-6 grid-cols-[repeat(32,minmax(0,1fr))] gap-0.5"
            >
              {Array.from({ length: 32 }, (_, index) => (
                <span key={index} className="overflow-hidden bg-muted" aria-hidden="true">
                  <span
                    className="block size-full origin-left bg-brand transition-transform duration-300 rtl:origin-right"
                    style={{
                      transform: `scaleX(${usedPercent === undefined ? 0 : Math.max(0, Math.min(1, (usedPercent / 100) * 32 - index))})`,
                    }}
                  />
                </span>
              ))}
            </div>
            <p className="text-end text-xs text-muted-foreground tabular-nums">
              {usedPercent === undefined ? t("Unknown") : `${usedPercent.toFixed(0)}%`}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-b pb-5">
          <div>
            <dt className="text-xs text-muted-foreground">{t("Used")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">{formatCapacity(totalUsedCapacity)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("Available")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">
              {totalFreeCapacity === undefined ? "--" : formatCapacity(totalFreeCapacity)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("Total Capacity")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">{formatCapacity(totalCapacity)}</dd>
          </div>
        </dl>

        {freshnessNeedsAttention ? (
          <div className="flex flex-col gap-2 border-s-2 border-current ps-3 text-muted-foreground">
            <Badge variant={usageFreshness.state === "degraded" ? "destructive" : "default"}>
              {usageFreshness.state === "degraded" ? t("Degraded") : t("Stale")}
            </Badge>
            <p className="break-words text-xs [overflow-wrap:anywhere]">
              {usageFreshness.reason ?? t("Previously reported data may be out of date.")}
            </p>
          </div>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          {usageStats.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
