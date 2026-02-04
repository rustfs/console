"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
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

export function PerformanceServerList({ servers, t }: { servers: ServerInfo[]; t: (key: string) => string }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{t("Server List")}</CardTitle>
          <CardDescription>
            {t("Inspect individual server health, disk utilization, and network status.")}
          </CardDescription>
        </div>
        <span className="text-sm text-muted-foreground">
          {t("Total")}: {servers.length}
        </span>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="space-y-2">
          {servers.map((server, index) => (
            <AccordionItem key={server.endpoint ?? index} value={String(index)}>
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
