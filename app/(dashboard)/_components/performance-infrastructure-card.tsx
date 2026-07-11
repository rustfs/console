"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

function HealthMetric({ label, value, unavailableLabel }: { label: string; value?: number; unavailableLabel: string }) {
  return (
    <div className="min-w-0 border-t pt-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value ?? unavailableLabel}</dd>
    </div>
  )
}

export function PerformanceInfrastructureCard({
  onlineServers,
  offlineServers,
  degradedServers,
  initializingServers,
  unknownServers,
  onlineDisks,
  offlineDisks,
  unknownDisks,
  t,
}: {
  onlineServers?: number
  offlineServers?: number
  degradedServers?: number
  initializingServers?: number
  unknownServers?: number
  onlineDisks?: number
  offlineDisks?: number
  unknownDisks?: number
  t: (key: string) => string
}) {
  const needsAttention = Boolean((offlineServers ?? 0) + (degradedServers ?? 0) + (offlineDisks ?? 0))
  const hasUnknownState = Boolean((initializingServers ?? 0) + (unknownServers ?? 0) + (unknownDisks ?? 0))
  const serverCounts = [onlineServers, offlineServers, degradedServers, initializingServers, unknownServers]
  const diskCounts = [onlineDisks, offlineDisks, unknownDisks]
  const dataUnavailable =
    serverCounts.some((value) => value === undefined) ||
    diskCounts.some((value) => value === undefined) ||
    serverCounts.reduce<number>((total, value) => total + (value ?? 0), 0) === 0 ||
    diskCounts.reduce<number>((total, value) => total + (value ?? 0), 0) === 0
  const status = needsAttention
    ? t("Needs attention")
    : hasUnknownState || dataUnavailable
      ? t("Unknown")
      : t("Healthy")
  const description = needsAttention
    ? t("Offline or degraded resources require attention.")
    : hasUnknownState || dataUnavailable
      ? t("Some resource health data is unavailable or still initializing.")
      : t("All reported servers and disks are online.")

  return (
    <Card className="h-full shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h2 id="cluster-health-title" className="text-base font-semibold">
              {t("Cluster Health")}
            </h2>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge
            variant={needsAttention ? "destructive" : hasUnknownState || dataUnavailable ? "outline" : "secondary"}
            aria-live="polite"
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2" aria-labelledby="cluster-health-title">
          <section aria-labelledby="server-health-title">
            <h3 id="server-health-title" className="text-sm font-medium text-muted-foreground">
              {t("Servers")}
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <HealthMetric label={t("Online")} value={onlineServers} unavailableLabel={t("Unavailable")} />
              <HealthMetric label={t("Offline")} value={offlineServers} unavailableLabel={t("Unavailable")} />
              {degradedServers ? (
                <HealthMetric label={t("Degraded")} value={degradedServers} unavailableLabel={t("Unavailable")} />
              ) : null}
              {initializingServers ? (
                <HealthMetric
                  label={t("Initializing")}
                  value={initializingServers}
                  unavailableLabel={t("Unavailable")}
                />
              ) : null}
              {unknownServers ? (
                <HealthMetric label={t("Unknown")} value={unknownServers} unavailableLabel={t("Unavailable")} />
              ) : null}
            </dl>
          </section>
          <section aria-labelledby="disk-health-title">
            <h3 id="disk-health-title" className="text-sm font-medium text-muted-foreground">
              {t("Disks")}
            </h3>
            <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3">
              <HealthMetric label={t("Online")} value={onlineDisks} unavailableLabel={t("Unavailable")} />
              <HealthMetric label={t("Offline")} value={offlineDisks} unavailableLabel={t("Unavailable")} />
              {unknownDisks ? (
                <HealthMetric label={t("Unknown")} value={unknownDisks} unavailableLabel={t("Unavailable")} />
              ) : null}
            </dl>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
