"use client"

import { cn } from "@/lib/utils"

export function PageHeader({
  children,
  description,
  actions,
  className,
}: {
  children: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex flex-col justify-between gap-3 bg-background/95 py-2 backdrop-blur lg:flex-row lg:items-start",
        className,
      )}
    >
      <div className="min-w-0 space-y-2 [&_h1]:text-pretty [&_h1]:break-words [&_h2]:text-pretty [&_h2]:break-words">
        {children}
        {description && <div className="max-w-3xl text-pretty break-words">{description}</div>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-1 lg:justify-end">{actions}</div>
      )}
    </div>
  )
}
