"use client"

import { Button } from "@/components/ui/button"
import { RiTwitterXLine } from "@remixicon/react"
import { getThemeManifest } from "@/lib/theme/manifest"

export function LinksX() {
  const x = getThemeManifest().links.x
  if (!x) return null

  return (
    <Button variant="link" asChild>
      <a href={x} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
        <RiTwitterXLine className="size-4" />
      </a>
    </Button>
  )
}
