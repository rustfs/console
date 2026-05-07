"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { niceBytes } from "@/lib/functions"
import type { PoolsOverview } from "@/lib/pool-operations"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

export function PoolsOverviewCard({ overview, operationLabel }: { overview: PoolsOverview; operationLabel: string }) {
  const { t } = useTranslation()
  const usedPercent = useMemo(() => {
    if (!overview.totalCapacity) return 0
    return Math.round((overview.totalUsedCapacity / overview.totalCapacity) * 100)
  }, [overview])

  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{operationLabel}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("Pool overview for the current cluster state.")}</p>
        </div>
        <Badge variant={overview.supportState === "supported" ? "default" : "secondary"}>
          {overview.supportState === "supported" ? t("Supported") : t("Unsupported")}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <Stat label={t("Pool Count")} value={String(overview.poolCount)} />
        <Stat
          label={t("Total Capacity")}
          value={overview.totalCapacity ? niceBytes(String(overview.totalCapacity)) : "--"}
        />
        <Stat
          label={t("Used Capacity")}
          value={overview.totalUsedCapacity ? niceBytes(String(overview.totalUsedCapacity)) : "--"}
        />
        <Stat label={t("Usage")} value={`${usedPercent}%`} />
      </CardContent>
    </Card>
  )
}
