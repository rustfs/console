"use client"

import { Button } from "@/components/ui/button"
import { RiTwitterXLine } from "@remixicon/react"

export function LinksX() {
  return (
    <Button variant="link" asChild>
      <a
        href="https://x.com/rustfsofficial"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1"
      >
        <RiTwitterXLine className="size-4" />
      </a>
    </Button>
  )
}
