"use client"

import { RiDatabase2Line } from "@remixicon/react"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { niceBytes } from "@/lib/functions"

export interface UsageStat {
  label: string
  value: string
}

export function PerformanceUsageCard({
  totalCapacity,
  totalUsedCapacity,
  usedPercent,
  usageStats,
  t,
}: {
  totalCapacity?: number
  totalUsedCapacity?: number
  usedPercent?: number
  usageStats: UsageStat[]
  t: (key: string) => string
}) {
  const availableCapacity =
    totalCapacity !== undefined && totalUsedCapacity !== undefined
      ? Math.max(totalCapacity - totalUsedCapacity, 0)
      : undefined
  const formatCapacity = (value?: number) => (value === undefined ? t("Unknown") : niceBytes(String(value)))

  return (
    <Card className="h-full shadow-none">
      <CardHeader className="pb-3">
        <h2 id="storage-usage-title" className="text-base font-semibold">
          {t("Storage Usage and Scanner")}
        </h2>
        <CardDescription>{t("Review capacity pressure and scanner activity in one place.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4" aria-labelledby="storage-usage-title">
          <div className="flex items-center gap-4">
            <RiDatabase2Line className="size-6 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("Used Capacity")}</p>
              <p className="text-2xl font-semibold text-foreground tabular-nums">{formatCapacity(totalUsedCapacity)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Progress
              value={usedPercent ?? null}
              aria-label={`${t("Used Capacity")}: ${usedPercent === undefined ? t("Unknown") : `${usedPercent.toFixed(0)}%`}`}
              className="h-2"
            />
            <p className="text-end text-xs text-muted-foreground tabular-nums">
              {usedPercent === undefined ? t("Unknown") : `${usedPercent.toFixed(0)}%`}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-y py-4">
          <div>
            <dt className="text-xs text-muted-foreground">{t("Used")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">{formatCapacity(totalUsedCapacity)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("Available")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">{formatCapacity(availableCapacity)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("Total Capacity")}</dt>
            <dd className="mt-1 text-sm font-medium tabular-nums">{formatCapacity(totalCapacity)}</dd>
          </div>
        </dl>

        <dl className="grid gap-4 sm:grid-cols-3">
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
