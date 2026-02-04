"use client"

import { useEffect, useState } from "react"
import { configManager } from "@/lib/config"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

interface SidebarVersionProps {
  appName?: string
  className?: string
}

export function SidebarVersion({ appName = "RustFS", className }: SidebarVersionProps) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadVersion = async () => {
      try {
        const config = await configManager.loadConfig()
        if (cancelled) return
        setVersion(config.release?.version ?? null)
      } catch {
        if (cancelled) return
        setVersion(null)
      }
    }

    void loadVersion()

    return () => {
      cancelled = true
    }
  }, [])

  const displayVersion = version ? `v${version}` : ""
  const displayName = appName.toUpperCase()
  const collapsedLabel = displayVersion || displayName.charAt(0)

  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      <div className={cn("border-t pt-2", isCollapsed ? "px-1 text-center" : "flex items-center justify-center gap-2")}>
        {isCollapsed ? (
          <span className="truncate font-semibold">{collapsedLabel}</span>
        ) : (
          <>
            <span className="font-semibold tracking-wide">{displayName}</span>
            {displayVersion ? <span className="font-mono">{displayVersion}</span> : null}
          </>
        )}
      </div>
    </div>
  )
}
