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

export function PerformanceSummaryCards({ metrics, title }: { metrics: SummaryMetric[]; title: string }) {
  return (
    <section aria-labelledby="inventory-title" className="space-y-3">
      <h2 id="inventory-title" className="text-base font-semibold">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => {
          const cardContent = (
            <Card
              className={cn("h-full shadow-none", metric.href && "cursor-pointer transition-colors hover:bg-muted/50")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
                <metric.icon className="size-5 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="break-words text-2xl font-semibold text-foreground tabular-nums">{metric.display}</p>
                  {metric.caption ? <p className="text-xs text-muted-foreground">{metric.caption}</p> : null}
                </div>
              </CardContent>
            </Card>
          )
          return metric.href ? (
            <Link
              key={metric.label}
              href={metric.href}
              aria-label={`${metric.label}: ${metric.display}`}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {cardContent}
            </Link>
          ) : (
            <React.Fragment key={metric.label}>{cardContent}</React.Fragment>
          )
        })}
      </div>
    </section>
  )
}
