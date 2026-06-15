"use client"

import { Button } from "@/components/ui/button"
import { RiTwitterXLine } from "@remixicon/react"
import { getThemeManifest } from "@/lib/theme/manifest"

export function LinksX() {
  const x = getThemeManifest().links.x
  if (!x) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      nativeButton={false}
      render={<a href={x} target="_blank" rel="noopener noreferrer" aria-label="X" />}
    >
      <RiTwitterXLine className="size-4" aria-hidden />
    </Button>
  )
}
