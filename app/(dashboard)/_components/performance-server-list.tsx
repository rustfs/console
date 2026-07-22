"use client"

import * as React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { niceBytes } from "@/lib/functions"
import { resolveServerHealth, type ClusterDiagnostics, type ServerHealthState } from "@/lib/performance-data"
import { cn } from "@/lib/utils"
import type { ServerInfo } from "@/hooks/use-performance-data"

type Translate = (key: string) => string

function countOnlineDrives(server: ServerInfo) {
  return (server.drives ?? []).filter((drive) => {
    const state = drive.state?.toLowerCase()
    return state === "ok" || state === "online"
  }).length
}

function countOnlineNetworks(server: ServerInfo) {
  return Object.values(server.network ?? {}).filter((state) => state.toLowerCase() === "online").length
}

function getStateLabel(state: ServerHealthState, t: Translate) {
  switch (state) {
    case "online":
      return t("Online")
    case "offline":
      return t("Offline")
    case "degraded":
      return t("Degraded")
    case "initializing":
      return t("Initializing")
    default:
      return t("Unknown")
  }
}

function getStatePriority(state: ServerHealthState) {
  return { offline: 0, degraded: 1, unknown: 2, initializing: 3, online: 4 }[state]
}

function getStateVariant(state: ServerHealthState): "secondary" | "destructive" | "outline" {
  if (state === "online") return "secondary"
  if (state === "offline" || state === "degraded") return "destructive"
  return "outline"
}

function formatUptime(seconds: number | undefined, t: Translate) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return t("Unknown")
  const totalMinutes = Math.floor(seconds / 60)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = [
    days ? `${days} ${t("Days")}` : "",
    hours ? `${hours} ${t("Hours")}` : "",
    !days && minutes ? `${minutes} ${t("Minutes")}` : "",
  ].filter(Boolean)
  return parts.slice(0, 2).join(" ") || `0 ${t("Minutes")}`
}

function formatBytes(value: number | undefined, t: Translate) {
  return value === undefined || !Number.isFinite(value) || value < 0 ? t("Unknown") : niceBytes(String(value))
}

function getDriveUsagePercent(drive: NonNullable<ServerInfo["drives"]>[number]) {
  if (!Number.isFinite(drive.totalspace) || !drive.totalspace || drive.totalspace <= 0) return undefined
  if (!Number.isFinite(drive.usedspace) || drive.usedspace === undefined || drive.usedspace < 0) return undefined
  const used = drive.usedspace
  return Math.min(100, Math.max(0, (used / drive.totalspace) * 100))
}

function getDriveState(drive: NonNullable<ServerInfo["drives"]>[number]) {
  const state = drive.state?.toLowerCase()
  if (state === "ok" || state === "online") return "online" as const
  if (state === "offline" || state === "faulty" || state === "error") return "offline" as const
  return "unknown" as const
}

type PerformanceServerSort = "attention" | "endpoint-asc" | "endpoint-desc" | "uptime-desc" | "uptime-asc"
type PerformanceServerFilter = "all" | ServerHealthState

function compareEndpoint(left: ServerInfo, right: ServerInfo, direction: "asc" | "desc") {
  const normalizedLeft = left.endpoint?.trim()
  const normalizedRight = right.endpoint?.trim()

  if (!normalizedLeft && !normalizedRight) return 0
  if (!normalizedLeft) return 1
  if (!normalizedRight) return -1

  const result = normalizedLeft.localeCompare(normalizedRight, undefined, {
    numeric: true,
    sensitivity: "base",
  })

  return direction === "asc" ? result : -result
}

function compareUptime(left: ServerInfo, right: ServerInfo, direction: "asc" | "desc") {
  const hasLeft = Number.isFinite(left.uptime) && (left.uptime ?? -1) >= 0
  const hasRight = Number.isFinite(right.uptime) && (right.uptime ?? -1) >= 0

  if (!hasLeft && !hasRight) return 0
  if (!hasLeft) return 1
  if (!hasRight) return -1

  return direction === "asc" ? left.uptime! - right.uptime! : right.uptime! - left.uptime!
}

const filterOrder: ServerHealthState[] = ["offline", "degraded", "initializing", "unknown", "online"]

export function PerformanceServerList({
  servers,
  diagnostics,
  t,
}: {
  servers?: ServerInfo[]
  diagnostics?: ClusterDiagnostics
  t: Translate
}) {
  const [sortBy, setSortBy] = React.useState<PerformanceServerSort>("attention")
  const [filterBy, setFilterBy] = React.useState<PerformanceServerFilter>("all")
  const reportedServers = React.useMemo(() => servers ?? [], [servers])

  const stateCounts = React.useMemo(() => {
    const counts: Record<ServerHealthState, number> = {
      online: 0,
      offline: 0,
      degraded: 0,
      initializing: 0,
      unknown: 0,
    }
    for (const server of reportedServers) counts[resolveServerHealth(server, diagnostics).state] += 1
    return counts
  }, [diagnostics, reportedServers])

  const visibleServers = React.useMemo(() => {
    const rows = reportedServers
      .map((server, originalIndex) => ({ server, originalIndex, health: resolveServerHealth(server, diagnostics) }))
      .filter(({ health }) => filterBy === "all" || health.state === filterBy)

    return rows.sort((left, right) => {
      switch (sortBy) {
        case "endpoint-asc":
          return compareEndpoint(left.server, right.server, "asc") || left.originalIndex - right.originalIndex
        case "endpoint-desc":
          return compareEndpoint(left.server, right.server, "desc") || left.originalIndex - right.originalIndex
        case "uptime-desc":
          return compareUptime(left.server, right.server, "desc") || left.originalIndex - right.originalIndex
        case "uptime-asc":
          return compareUptime(left.server, right.server, "asc") || left.originalIndex - right.originalIndex
        case "attention":
        default:
          return (
            getStatePriority(left.health.state) - getStatePriority(right.health.state) ||
            compareEndpoint(left.server, right.server, "asc") ||
            left.originalIndex - right.originalIndex
          )
      }
    })
  }, [diagnostics, filterBy, reportedServers, sortBy])

  const filters: PerformanceServerFilter[] = [
    "all",
    ...filterOrder.filter((state) => stateCounts[state] > 0 || filterBy === state),
  ]
  const sortLabels: Record<PerformanceServerSort, string> = {
    attention: t("Needs attention first"),
    "endpoint-asc": t("Endpoint, ascending"),
    "endpoint-desc": t("Endpoint, descending"),
    "uptime-desc": t("Uptime, longest first"),
    "uptime-asc": t("Uptime, shortest first"),
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <h2 id="server-list-title" className="text-base font-semibold">
              {t("Server List")}
            </h2>
            <CardDescription>
              {t("Inspect individual server health, disk utilization, and network status.")}
            </CardDescription>
          </div>
          {servers !== undefined ? (
            <span className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {t("Total")}: {visibleServers.length}/{reportedServers.length}
            </span>
          ) : null}
        </div>

        {servers !== undefined && reportedServers.length ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label={t("Filter servers")}>
              {filters.map((filter) => {
                const selected = filterBy === filter
                const label = filter === "all" ? t("All") : getStateLabel(filter, t)
                const count = filter === "all" ? reportedServers.length : stateCounts[filter]
                return (
                  <Button
                    key={filter}
                    type="button"
                    variant={selected ? "secondary" : "outline"}
                    className={cn(
                      "min-h-11 whitespace-normal shadow-none sm:min-h-0",
                      filter === "offline" || filter === "degraded" ? "data-[selected=true]:text-destructive" : "",
                    )}
                    data-selected={selected}
                    aria-pressed={selected}
                    aria-controls="performance-server-list"
                    onClick={() => setFilterBy(filter)}
                  >
                    {label} ({count})
                  </Button>
                )
              })}
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <label htmlFor="performance-server-sort" className="text-sm text-muted-foreground">
                {t("Sort by")}
              </label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as PerformanceServerSort)}>
                <SelectTrigger
                  id="performance-server-sort"
                  className="min-h-11 w-full shadow-none sm:min-h-0 sm:w-[230px]"
                >
                  <SelectValue>{sortLabels[sortBy]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(sortLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="min-h-11">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {servers === undefined || reportedServers.length === 0 ? (
          <div id="performance-server-list" className="border border-dashed p-8 text-center">
            <p className="text-sm font-medium">{t("No server information was reported.")}</p>
          </div>
        ) : visibleServers.length ? (
          <Accordion id="performance-server-list" className="space-y-2" aria-labelledby="server-list-title">
            {visibleServers.map(({ server, originalIndex, health }) => {
              const state = health.state
              return (
                <AccordionItem
                  key={server.endpoint ?? `server-${originalIndex}`}
                  value={server.endpoint ?? `server-${originalIndex}`}
                >
                  <AccordionTrigger className="min-h-11 py-3">
                    <div className="grid min-w-0 flex-1 gap-2 pe-3 text-start lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="flex min-w-0 items-start gap-2">
                        <Badge variant={getStateVariant(state)}>{getStateLabel(state, t)}</Badge>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="break-words font-semibold [overflow-wrap:anywhere]">
                            {server.endpoint ?? t("Unknown")}
                          </span>
                          {health.reason ? (
                            <span className="break-words text-xs font-normal text-muted-foreground [overflow-wrap:anywhere]">
                              {health.reason}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:flex sm:flex-wrap">
                        <span>
                          {t("Disks")}: {countOnlineDrives(server)} / {server.drives?.length ?? 0}
                        </span>
                        <span>
                          {t("Network")}: {countOnlineNetworks(server)} / {Object.keys(server.network ?? {}).length}
                        </span>
                        <span className="col-span-2">
                          {t("Uptime")}: {formatUptime(server.uptime, t)}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pb-3 text-xs text-muted-foreground">
                      {t("Version")}: <span className="break-all">{server.version ?? t("Unknown")}</span>
                    </p>
                    {server.drives?.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {server.drives.map((drive, driveIndex) => {
                          const path = drive.drive_path ?? drive.path ?? t("Unknown")
                          const driveState = getDriveState(drive)
                          const usedPercent = getDriveUsagePercent(drive)
                          return (
                            <Card
                              key={`${drive.uuid ?? drive.drive_path ?? drive.path ?? "drive"}-${driveIndex}`}
                              className="min-w-0 shadow-none"
                            >
                              <CardHeader className="gap-2 pb-2">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                  <h4 className="min-w-0 break-all text-sm font-medium">{path}</h4>
                                  <Badge variant={getStateVariant(driveState)}>{getStateLabel(driveState, t)}</Badge>
                                </div>
                                <CardDescription className="text-xs tabular-nums">
                                  {formatBytes(drive.usedspace, t)} / {formatBytes(drive.totalspace, t)}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <Progress
                                  value={usedPercent ?? null}
                                  aria-label={`${path} ${t("Storage Usage Statistics")}: ${usedPercent === undefined ? t("Unknown") : `${usedPercent.toFixed(0)}%`}`}
                                  className="h-2"
                                />
                                <dl className="grid grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <dt className="text-muted-foreground">{t("Used")}</dt>
                                    <dd className="mt-1 font-medium text-foreground tabular-nums">
                                      {formatBytes(drive.usedspace, t)}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-muted-foreground">{t("Available")}</dt>
                                    <dd className="mt-1 font-medium text-foreground tabular-nums">
                                      {formatBytes(drive.availspace, t)}
                                    </dd>
                                  </div>
                                </dl>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="border border-dashed p-4 text-sm text-muted-foreground">
                        {t("No drive information was reported for this server.")}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <div id="performance-server-list" className="border border-dashed p-8 text-center">
            <p className="text-sm font-medium">{t("No servers match the current filter")}</p>
            <Button type="button" variant="link" className="mt-2 min-h-11" onClick={() => setFilterBy("all")}>
              {t("Show all servers")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
