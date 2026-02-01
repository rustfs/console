"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface BackendInfoItem {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  title: string
  value?: string
}

export function PerformanceBackendCard({
  items,
  t,
}: {
  items: BackendInfoItem[]
  t: (key: string) => string
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{items.length ? t("Backend Services") : ""}</CardTitle>
        <CardDescription>
          {items.length
            ? t(
                "Key services and configuration values reported by the cluster."
              )
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.title}
              className="border bg-muted/40 shadow-none"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>
                <item.icon
                  className="size-5 text-muted-foreground"
                  aria-hidden
                />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold text-foreground">
                  {item.value ?? "-"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
