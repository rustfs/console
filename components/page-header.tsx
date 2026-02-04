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
    <div className={cn("sticky bg-background top-0 z-10 flex flex-col justify-between gap-2 lg:flex-row", className)}>
      <div className="space-y-2">
        {children}
        {description}
      </div>
      {actions && <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  )
}
