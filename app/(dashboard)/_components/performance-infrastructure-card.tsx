"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PerformanceInfrastructureCard({
  onlineServers,
  offlineServers,
  onlineDisks,
  offlineDisks,
  t,
}: {
  onlineServers: number
  offlineServers: number
  onlineDisks: number
  offlineDisks: number
  t: (key: string) => string
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle>{t("Infrastructure Health")}</CardTitle>
        <CardDescription>{t("Real-time status of cluster servers and backend storage devices.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium text-muted-foreground">{t("Servers")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">{t("Online")}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{onlineServers}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">{t("Offline")}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{offlineServers}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium text-muted-foreground">{t("Disks")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">{t("Online")}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{onlineDisks}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">{t("Offline")}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{offlineDisks}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
