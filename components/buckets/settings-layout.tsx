import type * as React from "react"
import { RiRefreshLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BucketSettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 space-y-3">
      <div className="space-y-1">
        <h2 id={`${id}-heading`} className="font-heading text-base font-semibold tracking-tight">
          {title}
        </h2>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="divide-y border bg-card">{children}</div>
    </section>
  )
}

export function BucketSettingRow({
  title,
  description,
  status,
  statusVariant = "outline",
  action,
  children,
  error,
  errorTitle,
  retryLabel,
  onRetry,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  status?: React.ReactNode
  statusVariant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
  action?: React.ReactNode
  children?: React.ReactNode
  error?: React.ReactNode
  errorTitle?: React.ReactNode
  retryLabel?: React.ReactNode
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn("grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start", className)}>
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 text-sm font-medium text-foreground">{title}</h3>
          {status ? <Badge variant={statusVariant}>{status}</Badge> : null}
        </div>
        {description ? <p className="max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {action ? (
        <div className="flex w-full items-center sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">{action}</div>
      ) : null}
      {error ? (
        <Alert variant="destructive" className="sm:col-span-2">
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          {onRetry ? (
            <div className="col-span-full mt-2">
              <Button variant="outline" size="sm" onClick={onRetry} className="min-h-9">
                <RiRefreshLine className="size-4" aria-hidden />
                {retryLabel}
              </Button>
            </div>
          ) : null}
        </Alert>
      ) : null}
    </div>
  )
}
