"use client"

import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

export function PageHeader({
  children,
  description,
  actions,
  count,
  className,
}: {
  children: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  count?: number
  className?: string
}) {
  const { t, i18n } = useTranslation()
  return (
    <header className={cn("page-header min-w-0", className)}>
      <div className="flex min-w-0 flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="page-heading min-w-0 space-y-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-3">
            {children}
            {count !== undefined ? (
              <span
                className="font-mono text-sm tabular-nums text-muted-foreground"
                aria-label={`${t("Total")}: ${count}`}
              >
                {new Intl.NumberFormat(i18n.resolvedLanguage).format(count)}
              </span>
            ) : null}
          </div>
          {description && (
            <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty break-words">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="page-actions flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
