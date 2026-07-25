"use client"

import { RiCheckboxCircleLine, RiErrorWarningLine, RiQuestionLine } from "@remixicon/react"
import type { RunningStatusTopology, StatusDiagnostic } from "@/lib/performance-data"
import { getInfrastructureHealthState } from "./performance-infrastructure-card"

type Translate = (key: string) => string

export function PerformanceStatusSummary({
  onlineServers,
  offlineServers,
  degradedServers,
  initializingServers,
  unknownServers,
  onlineDisks,
  offlineDisks,
  unknownDisks,
  topology,
  peerHealth,
  storageReadiness,
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
  topology: RunningStatusTopology
  peerHealth?: StatusDiagnostic
  storageReadiness?: StatusDiagnostic
  t: Translate
}) {
  const healthState = getInfrastructureHealthState({
    onlineServers,
    offlineServers,
    degradedServers,
    initializingServers,
    unknownServers,
    onlineDisks,
    offlineDisks,
    unknownDisks,
    topology,
    peerHealth,
    storageReadiness,
  })
  const Icon =
    healthState === "attention" ? RiErrorWarningLine : healthState === "unknown" ? RiQuestionLine : RiCheckboxCircleLine
  const label =
    healthState === "attention"
      ? t("Cluster needs attention")
      : healthState === "unknown"
        ? t("Cluster status is incomplete")
        : t("Cluster is healthy")

  return (
    <section
      className="flex flex-col gap-3 border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      aria-labelledby="running-status-summary-title"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="size-5 shrink-0" aria-hidden />
        <h2 id="running-status-summary-title" className="font-semibold">
          {label}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {t("Servers")}: {onlineServers ?? t("Unknown")} {t("Online")} · {t("Disks")}: {onlineDisks ?? t("Unknown")}{" "}
        {t("Online")}
      </p>
    </section>
  )
}
