"use client"

import * as React from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { niceBytes } from "@/lib/functions"
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
  | "uptime-desc"
  | "uptime-asc"

type PerformanceServerFilter = "all" | "online" | "offline"

function isOnlineServer(server: ServerInfo) {
  return (server.state ?? "").toLowerCase() === "online"
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
  const onlineCount = servers.filter((server) => isOnlineServer(server)).length

  const visibleServers = React.useMemo(() => {
    const rows = servers
      .map((server, originalIndex) => ({
        server,
        originalIndex,
      }))
      .filter(({ server }) => {
        if (filterBy === "online") return isOnlineServer(server)
        if (filterBy === "offline") return !isOnlineServer(server)
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
            Number(isOnlineServer(right.server)) - Number(isOnlineServer(left.server)) ||
            compareEndpoint(left.server, right.server, "asc") ||
            left.originalIndex - right.originalIndex
          )
        case "status-offline":
          return (
            Number(isOnlineServer(left.server)) - Number(isOnlineServer(right.server)) ||
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
            <Button
              type="button"
              size="sm"
              variant={filterBy === "online" ? "secondary" : "outline"}
              className="shadow-none"
              onClick={() => setFilterBy((current) => (current === "online" ? "all" : "online"))}
            >
              {t("Online")} ({onlineCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filterBy === "offline" ? "secondary" : "outline"}
              className={cn("shadow-none", filterBy === "offline" ? "border-destructive/40 text-destructive" : "")}
              onClick={() => setFilterBy((current) => (current === "offline" ? "all" : "offline"))}
            >
              {t("Offline")} ({servers.length - onlineCount})
            </Button>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-sm text-muted-foreground">{t("Sort by")}</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as PerformanceServerSort)}>
              <SelectTrigger className="w-[180px] shadow-none">
                <SelectValue placeholder={t("Default")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("Default")}</SelectItem>
                <SelectItem value="endpoint-asc">{`${t("Endpoint")} ↑`}</SelectItem>
                <SelectItem value="endpoint-desc">{`${t("Endpoint")} ↓`}</SelectItem>
                <SelectItem value="status-online">{`${t("Status")} · ${t("Online")}`}</SelectItem>
                <SelectItem value="status-offline">{`${t("Status")} · ${t("Offline")}`}</SelectItem>
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
                <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-2 w-2 rounded-full",
                        server.state === "online" ? "bg-emerald-500" : "bg-rose-500",
                      )}
                    />
                    <span className="font-semibold">{server.endpoint ?? "--"}</span>
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
                      <Card key={drive.uuid ?? drive.drive_path} className="min-w-[260px] shadow-none">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {drive.drive_path ?? "--"}
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
