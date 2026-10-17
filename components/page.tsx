"use client"

import { cn } from "@/lib/utils"

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("console-page flex min-w-0 flex-col gap-8", className)}>{children}</div>
}
