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
        "flex flex-col justify-between gap-4 bg-background py-1 lg:sticky lg:top-0 lg:z-10 lg:flex-row lg:items-start lg:bg-background/95 lg:py-2 lg:backdrop-blur",
        className,
      )}
    >
      <div className="min-w-0 space-y-2 [&_h1]:break-words [&_h1]:font-heading [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-pretty [&_h2]:break-words [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-pretty">
        {children}
        {description && <div className="max-w-3xl text-pretty break-words">{description}</div>}
      </div>
      {actions && (
        <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 lg:w-auto lg:flex-1 lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
          {actions}
        </div>
      )}
    </div>
  )
}
