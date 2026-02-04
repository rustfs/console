"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface SummaryMetric {
  label: string
  display: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  caption: string | null
  href?: string
}

export function PerformanceSummaryCards({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const cardContent = (
          <Card
            key={metric.label}
            className={cn("shadow-none", metric.href && "cursor-pointer transition-colors hover:bg-muted/50")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              <metric.icon className="size-5 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-2xl font-semibold text-foreground">{metric.display}</p>
                {metric.caption ? <p className="shrink-0 text-xs text-muted-foreground">{metric.caption}</p> : null}
              </div>
            </CardContent>
          </Card>
        )
        return metric.href ? (
          <Link key={metric.label} href={metric.href} aria-label={metric.label}>
            {cardContent}
          </Link>
        ) : (
          <React.Fragment key={metric.label}>{cardContent}</React.Fragment>
        )
      })}
    </div>
  )
}
