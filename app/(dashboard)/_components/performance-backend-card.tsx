"use client"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

export interface BackendInfoItem {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  title: string
  value?: string | number
}

export function PerformanceBackendCard({ items, t }: { items: BackendInfoItem[]; t: (key: string) => string }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <h2 id="storage-configuration-title" className="text-base font-semibold">
          {t("Storage Configuration")}
        </h2>
        <CardDescription>{t("Parity and backend settings reported by the cluster.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-0 border-y md:grid-cols-3" aria-labelledby="storage-configuration-title">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex min-w-0 items-center gap-3 border-b py-4 last:border-b-0 md:border-e md:border-b-0 md:px-4 md:first:ps-0 md:last:border-e-0 md:last:pe-0"
            >
              <item.icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">{item.title}</dt>
                <dd className="mt-1 break-words text-base font-semibold text-foreground">
                  {item.value ?? t("Unknown")}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
