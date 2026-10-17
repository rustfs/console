"use client"

import * as React from "react"
import Link from "next/link"

export interface SummaryMetric {
  label: string
  display: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  caption: string | null
  href?: string
}

export function PerformanceSummaryCards({ metrics, title }: { metrics: SummaryMetric[]; title: string }) {
  return (
    <section aria-labelledby="inventory-title" className="space-y-4">
      <h2 id="inventory-title" className="text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      <dl className="grid grid-cols-2 gap-6">
        {metrics.map((metric) => {
          return (
            <div key={metric.label} className="min-w-0 border-t pt-4">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <metric.icon className="size-4" aria-hidden />
                {metric.label}
              </dt>
              <dd className="mt-2 break-words font-heading text-3xl font-semibold tabular-nums">
                {metric.href ? (
                  <Link
                    href={metric.href}
                    aria-label={`${metric.label}: ${metric.display}`}
                    className="block transition-colors hover:text-link focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {metric.display}
                  </Link>
                ) : (
                  metric.display
                )}
              </dd>
              {metric.caption ? <dd className="mt-1 text-xs text-muted-foreground">{metric.caption}</dd> : null}
            </div>
          )
        })}
      </dl>
    </section>
  )
}
