"use client"

import { useMemo, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { niceBytes } from "@/lib/functions"
import type { PoolsOverview } from "@/lib/pool-operations"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl font-medium tabular-nums">{value}</p>
    </div>
  )
}

export function PoolsOverviewCard({
  overview,
  operationLabel,
  actions,
}: {
  overview: PoolsOverview
  operationLabel: string
  actions?: ReactNode
}) {
  const { t } = useTranslation()
  const usedPercent = useMemo(() => {
    if (!overview.totalCapacity) return 0
    return Math.round((overview.totalUsedCapacity / overview.totalCapacity) * 100)
  }, [overview])

  return (
    <section className="grid gap-8 border-y py-6 lg:grid-cols-[minmax(0,1fr)_auto]" aria-label={operationLabel}>
      <div className="flex flex-col items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t("Pool")}</h2>
          <p className="text-sm text-muted-foreground">{t("Pool overview for the current cluster state.")}</p>
        </div>
        <Badge variant={overview.supportState === "supported" ? "default" : "secondary"}>
          {overview.supportState === "supported" ? t("Supported") : t("Unsupported")}
        </Badge>
      </div>
      {actions ? <div className="flex flex-wrap items-start gap-2">{actions}</div> : null}
      <div className="grid grid-cols-2 items-end gap-x-10 gap-y-6 sm:grid-cols-4 lg:col-span-2">
        <Stat label={t("Pool Count")} value={String(overview.poolCount)} />
        <Stat label={t("Total Capacity")} value={niceBytes(String(overview.totalCapacity))} />
        <Stat label={t("Used Capacity")} value={niceBytes(String(overview.totalUsedCapacity))} />
        <Stat label={t("Usage")} value={`${usedPercent}%`} />
      </div>
    </section>
  )
}
