"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

function formatBytesValue(value?: number) {
  return value === undefined ? "--" : niceBytes(String(value))
}

function formatNumberValue(value?: number) {
  return value === undefined ? "--" : value.toLocaleString()
}

function formatPercentValue(value?: number) {
  return value === undefined ? "--" : `${value.toFixed(2)}%`
}

function formatDateTime(value?: string) {
  if (!value) return "--"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function PoolsOverviewCard({
  overview,
  operationLabel,
  showDecommissionColumns = false,
}: {
  overview: PoolsOverview
  operationLabel: string
  showDecommissionColumns?: boolean
}) {
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
        <div className="md:col-span-4">
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("ID")}</TableHead>
                <TableHead>{t("Pool")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Total Capacity")}</TableHead>
                <TableHead>{t("Current Size")}</TableHead>
                <TableHead>{t("Used Capacity")}</TableHead>
                <TableHead>{t("Available")}</TableHead>
                <TableHead>{t("Usage")}</TableHead>
                <TableHead>{t("Updated At")}</TableHead>
                {showDecommissionColumns ? (
                  <>
                    <TableHead>{t("Start Time")}</TableHead>
                    <TableHead>{t("Start Size")}</TableHead>
                    <TableHead>{t("Complete")}</TableHead>
                    <TableHead>{t("Failed Status")}</TableHead>
                    <TableHead>{t("Canceled")}</TableHead>
                    <TableHead>{t("Objects")}</TableHead>
                    <TableHead>{t("Objects Failed")}</TableHead>
                    <TableHead>{t("Bytes Moved")}</TableHead>
                    <TableHead>{t("Bytes Failed")}</TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.pools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showDecommissionColumns ? 18 : 9} className="text-center text-muted-foreground">
                    {t("No Data")}
                  </TableCell>
                </TableRow>
              ) : (
                overview.pools.map((pool) => (
                  <TableRow key={pool.id}>
                    <TableCell>{pool.id}</TableCell>
                    <TableCell className="max-w-[360px] truncate" title={pool.name}>
                      {pool.name}
                    </TableCell>
                    <TableCell>{pool.status || "--"}</TableCell>
                    <TableCell>{formatBytesValue(pool.total)}</TableCell>
                    <TableCell>{formatBytesValue(pool.currentSize)}</TableCell>
                    <TableCell>{formatBytesValue(pool.used)}</TableCell>
                    <TableCell>{formatBytesValue(pool.available)}</TableCell>
                    <TableCell>{formatPercentValue(pool.usagePercent)}</TableCell>
                    <TableCell>{formatDateTime(pool.lastUpdate)}</TableCell>
                    {showDecommissionColumns ? (
                      <>
                        <TableCell>{formatDateTime(pool.decommission.startTime)}</TableCell>
                        <TableCell>{formatBytesValue(pool.decommission.startSize)}</TableCell>
                        <TableCell>{pool.decommission.complete ? t("Yes") : t("No")}</TableCell>
                        <TableCell>{pool.decommission.failed ? t("Yes") : t("No")}</TableCell>
                        <TableCell>{pool.decommission.canceled ? t("Yes") : t("No")}</TableCell>
                        <TableCell>{formatNumberValue(pool.decommission.objects)}</TableCell>
                        <TableCell>{formatNumberValue(pool.decommission.objectsFailed)}</TableCell>
                        <TableCell>{formatBytesValue(pool.decommission.bytes)}</TableCell>
                        <TableCell>{formatBytesValue(pool.decommission.bytesFailed)}</TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
