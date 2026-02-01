"use client"

import { RiDatabase2Line } from "@remixicon/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { niceBytes } from "@/lib/functions"

export interface UsageStat {
  label: string
  value: string
}

export function PerformanceUsageCard({
  lastUpdatedLabel,
  totalUsedCapacity,
  usedPercent,
  usageStats,
  t,
}: {
  lastUpdatedLabel: string
  totalUsedCapacity: number
  usedPercent: number
  usageStats: UsageStat[]
  t: (key: string) => string
}) {
  return (
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
                {niceBytes(String(totalUsedCapacity))}
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
  )
}
