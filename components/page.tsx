"use client"

import { cn } from "@/lib/utils"

export function Page({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-col gap-6", className)}>{children}</div>
}
