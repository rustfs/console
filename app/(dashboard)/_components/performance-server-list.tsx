"use client"

import * as React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { niceBytes } from "@/lib/functions"
import { normalizeServerHealthState, type ServerHealthState } from "@/lib/performance-data"
import { cn } from "@/lib/utils"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import type { ServerInfo } from "@/hooks/use-performance-data"

dayjs.extend(relativeTime)

function countOnlineDrives(server: ServerInfo, type: string) {
  return (server?.drives || []).filter((d) => d.state === type).length
}

function countOnlineNetworks(server: ServerInfo, type: string) {
  return Object.values(server?.network || {}).filter((state) => state === type).length
}

type PerformanceServerSort =
  | "default"
  | "endpoint-asc"
  | "endpoint-desc"
  | "status-online"
  | "status-offline"
  | "status-unknown"
  | "status-degraded"
  | "uptime-desc"
  | "uptime-asc"

type PerformanceServerFilter = "all" | ServerHealthState

const serverStates: ServerHealthState[] = ["online", "offline", "unknown", "degraded"]

function getServerState(server: ServerInfo) {
  return normalizeServerHealthState(server.state)
}

function getServerStateLabel(state: ServerHealthState, t: (key: string) => string) {
  if (state === "online") return t("Online")
  if (state === "offline") return t("Offline")
  if (state === "degraded") return t("Degraded")
  return t("Unknown")
}

function getServerStateTone(state: ServerHealthState) {
  if (state === "online") return "bg-primary"
  if (state === "offline") return "bg-destructive"
  if (state === "degraded") return "bg-amber-500"
  return "bg-muted-foreground"
}

function getServerStateButtonClass(state: ServerHealthState, active: boolean) {
  if (!active) return "shadow-none"
  if (state === "offline") return "border-destructive/40 text-destructive shadow-none"
  if (state === "degraded") return "border-amber-500/50 text-amber-700 shadow-none dark:text-amber-300"
  if (state === "unknown") return "border-muted-foreground/40 text-muted-foreground shadow-none"
  return "shadow-none"
}

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
  const hasLeft = Number.isFinite(left.uptime)
  const hasRight = Number.isFinite(right.uptime)

  if (!hasLeft && !hasRight) return 0
  if (!hasLeft) return 1
  if (!hasRight) return -1

  return direction === "asc" ? left.uptime! - right.uptime! : right.uptime! - left.uptime!
}

export function PerformanceServerList({ servers, t }: { servers: ServerInfo[]; t: (key: string) => string }) {
  const [sortBy, setSortBy] = React.useState<PerformanceServerSort>("default")
  const [filterBy, setFilterBy] = React.useState<PerformanceServerFilter>("all")
  const stateCounts = React.useMemo(
    () =>
      servers.reduce(
        (counts, server) => {
          counts[getServerState(server)] += 1
          return counts
        },
        { online: 0, offline: 0, unknown: 0, degraded: 0 } satisfies Record<ServerHealthState, number>,
      ),
    [servers],
  )

  const visibleServers = React.useMemo(() => {
    const rows = servers
      .map((server, originalIndex) => ({
        server,
        originalIndex,
      }))
      .filter(({ server }) => {
        if (filterBy !== "all") return getServerState(server) === filterBy
        return true
      })

    return rows.sort((left, right) => {
      switch (sortBy) {
        case "endpoint-asc":
          return compareEndpoint(left.server, right.server, "asc") || left.originalIndex - right.originalIndex
        case "endpoint-desc":
          return compareEndpoint(left.server, right.server, "desc") || left.originalIndex - right.originalIndex
        case "status-online":
          return (
            Number(getServerState(right.server) === "online") - Number(getServerState(left.server) === "online") ||
            compareEndpoint(left.server, right.server, "asc") ||
            left.originalIndex - right.originalIndex
          )
        case "status-offline":
          return (
            Number(getServerState(right.server) === "offline") - Number(getServerState(left.server) === "offline") ||
            compareEndpoint(left.server, right.server, "asc") ||
            left.originalIndex - right.originalIndex
          )
        case "status-unknown":
          return (
            Number(getServerState(right.server) === "unknown") - Number(getServerState(left.server) === "unknown") ||
            compareEndpoint(left.server, right.server, "asc") ||
            left.originalIndex - right.originalIndex
          )
        case "status-degraded":
          return (
            Number(getServerState(right.server) === "degraded") - Number(getServerState(left.server) === "degraded") ||
            compareEndpoint(left.server, right.server, "asc") ||
            left.originalIndex - right.originalIndex
          )
        case "uptime-desc":
          return compareUptime(left.server, right.server, "desc") || left.originalIndex - right.originalIndex
        case "uptime-asc":
          return compareUptime(left.server, right.server, "asc") || left.originalIndex - right.originalIndex
        case "default":
        default:
          return left.originalIndex - right.originalIndex
      }
    })
  }, [filterBy, servers, sortBy])

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t("Server List")}</CardTitle>
          <CardDescription>
            {t("Inspect individual server health, disk utilization, and network status.")}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="text-sm text-muted-foreground">
            {t("Total")}: {visibleServers.length}/{servers.length}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {serverStates.map((state) => (
              <Button
                key={state}
                type="button"
                size="sm"
                variant={filterBy === state ? "secondary" : "outline"}
                className={getServerStateButtonClass(state, filterBy === state)}
                onClick={() => setFilterBy((current) => (current === state ? "all" : state))}
              >
                {getServerStateLabel(state, t)} ({stateCounts[state]})
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-sm text-muted-foreground">{t("Sort by")}</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as PerformanceServerSort)}>
              <SelectTrigger className="w-[180px] shadow-none" aria-label={t("Sort by")}>
                <SelectValue placeholder={t("Default")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("Default")}</SelectItem>
                <SelectItem value="endpoint-asc">{`${t("Endpoint")} ↑`}</SelectItem>
                <SelectItem value="endpoint-desc">{`${t("Endpoint")} ↓`}</SelectItem>
                <SelectItem value="status-online">{`${t("Status")} · ${t("Online")}`}</SelectItem>
                <SelectItem value="status-offline">{`${t("Status")} · ${t("Offline")}`}</SelectItem>
                <SelectItem value="status-unknown">{`${t("Status")} · ${t("Unknown")}`}</SelectItem>
                <SelectItem value="status-degraded">{`${t("Status")} · ${t("Degraded")}`}</SelectItem>
                <SelectItem value="uptime-desc">{`${t("Uptime")} ↓`}</SelectItem>
                <SelectItem value="uptime-asc">{`${t("Uptime")} ↑`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion className="space-y-2">
          {visibleServers.map(({ server, originalIndex }) => (
            <AccordionItem
              key={server.endpoint ? `${server.endpoint}-${originalIndex}` : `server-${originalIndex}`}
              value={server.endpoint ? `${server.endpoint}-${originalIndex}` : `server-${originalIndex}`}
            >
              <AccordionTrigger>
                <div className="flex flex-col gap-2 text-start sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("inline-flex h-2 w-2 rounded-full", getServerStateTone(getServerState(server)))}
                    />
                    <span className="font-semibold">{server.endpoint ?? "--"}</span>
                    <span className="text-xs text-muted-foreground">
                      {getServerStateLabel(getServerState(server), t)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {t("Disks")}: {countOnlineDrives(server, "ok")} / {server.drives?.length ?? 0}
                    </span>
                    <span>
                      {t("Network")}: {countOnlineNetworks(server, "online")} /{" "}
                      {Object.keys(server.network ?? {}).length}
                    </span>
                    <span>
                      {t("Uptime")}:{" "}
                      {server.uptime != null ? dayjs().subtract(server.uptime, "second").fromNow() : "--"}
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
                      <Card key={drive.uuid ?? drive.drive_path ?? drive.path} className="min-w-[260px] shadow-none">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {drive.drive_path ?? drive.path ?? "--"}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {niceBytes(String(drive.usedspace ?? 0))} / {niceBytes(String(drive.totalspace ?? 0))}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Progress
                            value={drive.totalspace ? ((drive.usedspace ?? 0) / drive.totalspace) * 100 : 0}
                            className="mb-3 h-2"
                          />
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>
                              {t("Used")}:{" "}
                              <span className="font-medium text-foreground">
                                {niceBytes(String(drive.usedspace ?? 0))}
                              </span>
                            </p>
                            <p>
                              {t("Available")}:{" "}
                              <span className="font-medium text-foreground">
                                {niceBytes(String(drive.availspace ?? 0))}
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
  )
}
