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
        "flex min-w-0 flex-col justify-between gap-4 border-b bg-background pb-6 pt-2 lg:sticky lg:top-0 lg:z-10 lg:flex-row lg:items-start",
        className,
      )}
    >
      <div className="min-w-0 space-y-2 [&_h1]:break-words [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-bold sm:[&_h1]:text-3xl [&_h1]:tracking-tight [&_h1]:text-pretty [&_h2]:break-words [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-pretty">
        {children}
        {description && (
          <div className="max-w-3xl text-sm text-muted-foreground text-pretty break-words">{description}</div>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 [&>[data-slot=input-group]]:basis-full [&_[data-slot=button]]:min-h-11 sm:[&>[data-slot=input-group]]:basis-auto sm:[&_[data-slot=button]]:min-h-10 lg:w-auto lg:flex-1 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  )
}
