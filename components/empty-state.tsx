"use client"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  children,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("py-10", className)}>
      <EmptyContent className="max-w-sm text-center">
        <EmptyHeader>
          {icon && (
            <EmptyMedia variant="icon" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {icon}
            </EmptyMedia>
          )}
          {title && <EmptyTitle>{title}</EmptyTitle>}
          {description && <EmptyDescription>{description}</EmptyDescription>}
        </EmptyHeader>
        {children}
      </EmptyContent>
    </Empty>
  )
}
